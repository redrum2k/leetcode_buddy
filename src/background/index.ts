import {
  addMessageListener,
  type BgBackfillProgressMsg,
} from '@/lib/messaging';
import {
  upsertSubmissions,
  upsertProblem,
  upsertStudyPlan,
  getAllStudyPlans,
  getChatSession,
  getChatSessionByProblem,
  upsertChatSession,
} from '@/lib/db/repos';
import {
  getUserProfile,
  getSubmissionList,
  getProblemMetadata,
  getStudyPlanDetail,
} from '@/lib/graphql/queries';
import { buildSystemPrompt } from '@/lib/ai/systemPrompt';
import type { Submission, Difficulty, ProblemContext, ChatSession, ChatMessage } from '@/types';

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getStoredPrefs() {
  const result = await chrome.storage.local.get([
    'username',
    'selectedModuleSlug',
    'lastBackfill',
    'backfillInProgress',
    'activePlanSlug',
  ]);
  return result as {
    username?: string;
    selectedModuleSlug?: string;
    lastBackfill?: number;
    backfillInProgress?: boolean;
    activePlanSlug?: string;
  };
}

async function storePrefs(patch: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set(patch);
}

// ── Problem context cache ─────────────────────────────────────────────────────
// Kept in memory; re-populated by content script on each problem page visit.

let currentProblemContext: ProblemContext | null = null;

// ── webRequest observer ───────────────────────────────────────────────────────
// Registered at top-level so it survives service worker restarts.

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const match = details.url.match(/\/submissions\/detail\/(\d+)\/check\//);
    if (!match || details.tabId < 0) return;
    chrome.tabs
      .sendMessage(details.tabId, { type: 'BG_SUBMISSION_COMPLETED', submissionId: match[1] })
      .catch(() => {
        // Content script may not be ready — safe to ignore
      });
  },
  { urls: ['https://leetcode.com/submissions/detail/*/check/'] },
);

// ── Backfill ──────────────────────────────────────────────────────────────────

async function broadcast(msg: BgBackfillProgressMsg): Promise<void> {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

async function runBackfill(): Promise<void> {
  await storePrefs({ backfillInProgress: true });
  try {
    const { username } = await getUserProfile();
    await storePrefs({ username });

    // 1. Walk all submission pages
    const PAGE_SIZE = 40;
    let offset = 0;
    let hasNext = true;
    const partialSubs: Omit<Submission, 'difficulty' | 'topicTags' | 'problemId'>[] = [];

    while (hasNext) {
      await broadcast({
        type: 'BG_BACKFILL_PROGRESS',
        fetched: partialSubs.length,
        total: null,
        phase: 'submissions',
      });
      const page = await getSubmissionList(offset, PAGE_SIZE);
      partialSubs.push(...page.submissions);
      hasNext = page.hasNext;
      offset += PAGE_SIZE;
      await new Promise<void>((r) => setTimeout(r, 300));
    }

    // 2. Fetch metadata for each unique problem slug
    const uniqueSlugs = [...new Set(partialSubs.map((s) => s.problemSlug))];
    const cache = new Map<
      string,
      { difficulty: Difficulty; topicTags: string[]; id: number }
    >();
    let fetched = 0;

    await broadcast({
      type: 'BG_BACKFILL_PROGRESS',
      fetched: 0,
      total: uniqueSlugs.length,
      phase: 'problems',
    });

    for (const slug of uniqueSlugs) {
      try {
        const problem = await getProblemMetadata(slug);
        await upsertProblem(problem);
        cache.set(slug, {
          difficulty: problem.difficulty,
          topicTags: problem.topicTags,
          id: problem.id,
        });
      } catch {
        cache.set(slug, { difficulty: 'Medium', topicTags: [], id: 0 });
      }
      fetched++;
      if (fetched % 5 === 0) {
        await broadcast({
          type: 'BG_BACKFILL_PROGRESS',
          fetched,
          total: uniqueSlugs.length,
          phase: 'problems',
        });
        await new Promise<void>((r) => setTimeout(r, 100));
      }
    }

    // 3. Merge and persist full submissions
    const fullSubs: Submission[] = partialSubs.map((s) => {
      const meta = cache.get(s.problemSlug);
      return {
        ...s,
        difficulty: meta?.difficulty ?? 'Medium',
        topicTags: meta?.topicTags ?? [],
        problemId: meta?.id ?? 0,
      };
    });
    await upsertSubmissions(fullSubs);

    await storePrefs({ lastBackfill: Date.now(), backfillInProgress: false });
    await broadcast({
      type: 'BG_BACKFILL_PROGRESS',
      fetched: fullSubs.length,
      total: fullSubs.length,
      phase: 'done',
    });
  } catch (err) {
    await storePrefs({ backfillInProgress: false });
    await broadcast({
      type: 'BG_BACKFILL_PROGRESS',
      fetched: 0,
      total: null,
      phase: 'error',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ── AI Streaming ──────────────────────────────────────────────────────────────

async function streamAIResponse(
  port: chrome.runtime.Port,
  session: ChatSession,
): Promise<void> {
  const stored = await chrome.storage.local.get(['anthropicApiKey', 'selectedModel']);
  const apiKey = stored.anthropicApiKey as string | undefined;
  const model = (stored.selectedModel as string | undefined) ?? 'claude-sonnet-4-5';

  if (!apiKey) {
    safePostMessage(port, {
      type: 'AI_ERROR',
      error: 'No API key configured. Open the extension popup → Settings to add your Anthropic key.',
    });
    return;
  }

  const ctx = session.problemContext;
  const systemPrompt = buildSystemPrompt({
    problemTitle: ctx?.title ?? 'Unknown Problem',
    problemDifficulty: ctx?.difficulty ?? 'Medium',
    problemTags: ctx?.topicTags ?? [],
    problemStatement: ctx?.statement ?? '',
    userCurrentCode: ctx?.currentCode,
  });

  const apiMessages = session.messages.map((m) => ({ role: m.role, content: m.content }));

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        stream: true,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });
  } catch (err) {
    safePostMessage(port, {
      type: 'AI_ERROR',
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    safePostMessage(port, {
      type: 'AI_ERROR',
      error: `Anthropic API error ${response.status}: ${errText}`,
    });
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data) as {
            type?: string;
            delta?: { type?: string; text?: string };
          };
          if (
            parsed.type === 'content_block_delta' &&
            parsed.delta?.type === 'text_delta' &&
            parsed.delta.text
          ) {
            fullContent += parsed.delta.text;
            safePostMessage(port, { type: 'AI_CHUNK', chunk: parsed.delta.text });
          }
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  } catch (err) {
    safePostMessage(port, {
      type: 'AI_ERROR',
      error: `Stream error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return;
  }

  // Persist the complete assistant message
  const assistantMsg: ChatMessage = {
    role: 'assistant',
    content: fullContent,
    timestamp: Date.now(),
  };
  session.messages.push(assistantMsg);
  await upsertChatSession(session);

  safePostMessage(port, { type: 'AI_DONE' });
}

function safePostMessage(port: chrome.runtime.Port, msg: unknown): void {
  try {
    port.postMessage(msg);
  } catch {
    // Port may have been closed — ignore
  }
}

// ── AI Chat Port ──────────────────────────────────────────────────────────────
// Long-lived connection from the chat window; handles streaming via SSE.

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'ai-chat') return;

  port.onMessage.addListener((msg: { type: string; [k: string]: unknown }) => {
    void (async () => {
      try {
        if (msg.type === 'INIT') {
          const sessionId = msg.sessionId as string;
          const session = await getChatSession(sessionId);
          if (!session) {
            safePostMessage(port, { type: 'AI_ERROR', error: 'Session not found.' });
            return;
          }
          safePostMessage(port, { type: 'SESSION', session });

          // Auto-stream if the last message is a pending user message
          const msgs = session.messages;
          if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') {
            await streamAIResponse(port, session);
          }
        }

        if (msg.type === 'SEND') {
          const sessionId = msg.sessionId as string;
          const content = msg.content as string;
          const session = await getChatSession(sessionId);
          if (!session) return;

          const userMsg: ChatMessage = {
            role: 'user',
            content,
            timestamp: Date.now(),
          };
          session.messages.push(userMsg);
          await upsertChatSession(session);

          await streamAIResponse(port, session);
        }

        if (msg.type === 'NEW_CONVERSATION') {
          const currentSessionId = msg.currentSessionId as string;
          const old = await getChatSession(currentSessionId);
          const newSession: ChatSession = {
            id: crypto.randomUUID(),
            problemSlug: old?.problemSlug ?? null,
            problemContext: old?.problemContext ?? null,
            startedAt: Date.now(),
            messages: [],
          };
          await upsertChatSession(newSession);
          safePostMessage(port, { type: 'SESSION', session: newSession });
        }
      } catch (err) {
        safePostMessage(port, {
          type: 'AI_ERROR',
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  });
});

// ── Message routing ───────────────────────────────────────────────────────────
// Chrome message handlers must return synchronously (void | boolean).
// Async work is wrapped in void IIFE so the handler returns synchronously.

addMessageListener('CONTENT_URL_CHANGED', (msg) => {
  void (async () => {
    if (!msg.detectedPlanSlug) return;
    const prefs = await getStoredPrefs();
    if (!prefs.selectedModuleSlug) {
      await storePrefs({ activePlanSlug: msg.detectedPlanSlug });
      const plans = await getAllStudyPlans();
      if (!plans.find((p) => p.slug === msg.detectedPlanSlug)) {
        try {
          const plan = await getStudyPlanDetail(msg.detectedPlanSlug);
          await upsertStudyPlan(plan);
        } catch {
          // non-fatal
        }
      }
    }
  })();
});

addMessageListener('CONTENT_SUBMISSION_DETECTED', (msg) => {
  void (async () => {
    try {
      const problem = await getProblemMetadata(msg.problemSlug);
      await upsertProblem(problem);
    } catch {
      // non-fatal
    }
  })();
});

addMessageListener('CONTENT_PROBLEM_CONTEXT', (msg) => {
  currentProblemContext = msg.context;
});

addMessageListener('CONTENT_OPEN_POPUP', () => {
  // chrome.action.openPopup() available in Chrome 127+ (July 2024)
  void chrome.action.openPopup().catch(() => {
    // Older Chrome: user must click the extension icon manually
  });
});

addMessageListener('POPUP_TRIGGER_BACKFILL', () => {
  void runBackfill();
});

addMessageListener('POPUP_GET_STATUS', (_msg, _sender, sendResponse) => {
  void (async () => {
    const prefs = await getStoredPrefs();
    const allPlans = await getAllStudyPlans();
    sendResponse({
      type: 'BG_STATUS',
      prefs: {
        username: prefs.username ?? null,
        selectedModuleSlug: prefs.selectedModuleSlug ?? null,
        lastBackfill: prefs.lastBackfill ?? null,
        backfillInProgress: prefs.backfillInProgress ?? false,
      },
      activePlanSlug: prefs.selectedModuleSlug ?? prefs.activePlanSlug ?? null,
      availablePlans: allPlans,
    });
  })();
  return true; // keep channel open for async sendResponse
});

addMessageListener('POPUP_GET_CONTEXT', (_msg, _sender, sendResponse) => {
  sendResponse({ type: 'BG_CONTEXT', context: currentProblemContext });
  return true;
});

addMessageListener('POPUP_SET_MODULE', (msg) => {
  void (async () => {
    await storePrefs({ selectedModuleSlug: msg.slug, activePlanSlug: msg.slug });
    if (msg.slug) {
      const plans = await getAllStudyPlans();
      const existing = plans.find((p) => p.slug === msg.slug);
      if (!existing || existing.problemSlugs.length === 0) {
        try {
          const plan = await getStudyPlanDetail(msg.slug);
          await upsertStudyPlan(plan);
        } catch {
          // non-fatal
        }
      }
    }
  })();
});

addMessageListener('POPUP_OPEN_CHAT', (msg) => {
  void (async () => {
    const context = currentProblemContext;
    const problemSlug = context?.slug ?? null;

    // Resume existing session for this problem, or create a new one
    let session = await getChatSessionByProblem(problemSlug);

    if (!session) {
      session = {
        id: crypto.randomUUID(),
        problemSlug,
        problemContext: context,
        startedAt: Date.now(),
        messages: [],
      };
    }

    // Append the initial user message
    const userMsg: ChatMessage = {
      role: 'user',
      content: msg.initialMessage,
      timestamp: Date.now(),
    };
    session.messages.push(userMsg);
    await upsertChatSession(session);

    // Open the chat window
    const chatUrl = chrome.runtime.getURL('src/chat/index.html') + '?sessionId=' + session.id;
    await chrome.windows.create({
      url: chatUrl,
      type: 'popup',
      width: 600,
      height: 800,
    });
  })();
});

// ── Install hook ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') void runBackfill();
});
