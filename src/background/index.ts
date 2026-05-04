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
import { buildCopilotPrompt, extractCodeBlock } from '@/lib/ai/copilotPrompt';
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
// Also persisted to chrome.storage.session so it survives service worker restarts.

let currentProblemContext: ProblemContext | null = null;
let currentTabId: number | null = null;

async function ensureContextHydrated(): Promise<void> {
  if (currentProblemContext !== null) return;
  const stored = await chrome.storage.session.get(['currentProblemContext', 'currentTabId']);
  currentProblemContext = (stored.currentProblemContext as ProblemContext | undefined) ?? null;
  currentTabId = (stored.currentTabId as number | undefined) ?? null;
}

// ── Side panel setup ─────────────────────────────────────────────────────────
// Guard against chrome.sidePanel being undefined if the permission hasn't been
// granted yet (e.g. first reload after adding the permission to the manifest).

if (chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

// If the SW was killed mid-backfill, the flag stays true forever. Reset it on every startup
// so StatsTab's trigger can fire a fresh backfill when the panel next opens.
void chrome.storage.local.set({ backfillInProgress: false });

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
    // PAGE_SIZE=20 matches LeetCode's actual per-page cap for submissionList;
    // using a larger limit causes LC to return 20 items but we'd advance by
    // the larger number, silently skipping submissions.
    const PAGE_SIZE = 20;
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
      if (page.submissions.length === 0) break;
      partialSubs.push(...page.submissions);
      hasNext = page.hasNext;
      offset += page.submissions.length; // advance by actual count, not PAGE_SIZE
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

async function getFreshCode(): Promise<string> {
  if (currentTabId === null) return '(not available)';
  try {
    type MonacoWindow = { monaco?: { editor?: { getEditors?: () => { getValue(): string }[] } } };
    const results = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      world: 'MAIN',
      func: () =>
        (window as unknown as MonacoWindow).monaco?.editor?.getEditors?.()[0]?.getValue() ?? '',
    });
    return (results?.[0]?.result as string) || '(not available)';
  } catch {
    return '(not available)';
  }
}

async function injectCodeIntoEditor(code: string): Promise<void> {
  if (currentTabId === null) throw new Error('No active LeetCode tab found.');
  type MonacoEditor = { setValue(v: string): void; revealLine(n: number): void };
  type MonacoWindow = { monaco?: { editor?: { getEditors?: () => MonacoEditor[] } } };
  await chrome.scripting.executeScript({
    target: { tabId: currentTabId },
    world: 'MAIN',
    func: (src: string) => {
      const editor = (window as unknown as MonacoWindow).monaco?.editor?.getEditors?.()[0];
      if (!editor) return;
      let i = 0;
      const interval = setInterval(() => {
        i = Math.min(i + 10, src.length);
        editor.setValue(src.slice(0, i));
        if (i >= src.length) {
          clearInterval(interval);
          editor.revealLine(src.split('\n').length);
        }
      }, 20);
    },
    args: [code],
  });
}

async function streamAIResponseWithPrompt(
  port: chrome.runtime.Port,
  session: ChatSession,
  systemPrompt: string,
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

  const apiMessages = session.messages.map((m) => ({ role: m.role, content: m.content }));

  let response: Response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
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

async function streamAIResponse(
  port: chrome.runtime.Port,
  session: ChatSession,
): Promise<void> {
  const ctx = session.problemContext;
  const systemPrompt = buildSystemPrompt({
    problemTitle: ctx?.title ?? 'Unknown Problem',
    problemDifficulty: ctx?.difficulty ?? 'Medium',
    problemTags: ctx?.topicTags ?? [],
    problemStatement: ctx?.statement ?? '',
    userCurrentCode: ctx?.currentCode,
  });
  await streamAIResponseWithPrompt(port, session, systemPrompt);
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

        if (msg.type === 'SEND_COPILOT') {
          const sessionId = msg.sessionId as string;
          const content = msg.content as string;
          const session = await getChatSession(sessionId);
          if (!session) return;

          const freshCode = await getFreshCode();

          const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() };
          session.messages.push(userMsg);
          await upsertChatSession(session);

          const ctx = session.problemContext;
          const copilotSystemPrompt = buildCopilotPrompt({
            problemTitle: ctx?.title ?? 'Unknown Problem',
            problemDifficulty: ctx?.difficulty ?? 'Medium',
            problemTags: ctx?.topicTags ?? [],
            problemStatement: ctx?.statement ?? '',
            userCurrentCode: freshCode,
          });

          await streamAIResponseWithPrompt(port, session, copilotSystemPrompt);

          // Extract code block from the assistant's response and write to editor
          const lastMsg = session.messages[session.messages.length - 1];
          if (lastMsg?.role === 'assistant') {
            const code = extractCodeBlock(lastMsg.content);
            if (code) {
              try {
                await injectCodeIntoEditor(code);
                safePostMessage(port, { type: 'CODE_WRITTEN' });
              } catch (err) {
                safePostMessage(port, {
                  type: 'CODE_WRITE_FAILED',
                  reason: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
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
    // Clear problem context when navigating away from a problem page so the
    // side panel's ChatBar stops showing a stale problem title.
    if (!/\/problems\/[^/?#]+/.test(msg.url)) {
      currentProblemContext = null;
      currentTabId = null;
      void chrome.storage.session.set({ currentProblemContext: null, currentTabId: null });
      chrome.runtime.sendMessage({ type: 'BG_CONTEXT_UPDATED', context: null }).catch(() => {});
    }

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

addMessageListener('CONTENT_PROBLEM_CONTEXT', (msg, sender) => {
  currentProblemContext = msg.context;
  currentTabId = sender.tab?.id ?? null;
  void chrome.storage.session.set({
    currentProblemContext: msg.context,
    currentTabId: sender.tab?.id ?? null,
  });
  chrome.runtime.sendMessage({ type: 'BG_CONTEXT_UPDATED', context: msg.context }).catch(() => {});
});

addMessageListener('CONTENT_OPEN_POPUP', (_msg, sender) => {
  const tabId = sender.tab?.id;
  if (tabId !== undefined) {
    void chrome.sidePanel.open({ tabId }).catch(() => {
      // User gesture may not propagate through SW messages — toolbar icon is the fallback
    });
  }
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
  void (async () => {
    await ensureContextHydrated();
    sendResponse({ type: 'BG_CONTEXT', context: currentProblemContext });
  })();
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

addMessageListener('POPUP_OPEN_CHAT', (msg, _sender, sendResponse) => {
  void (async () => {
    await ensureContextHydrated();
    const context = currentProblemContext;
    const problemSlug = context?.slug ?? null;

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

    const userMsg: ChatMessage = {
      role: 'user',
      content: msg.initialMessage,
      timestamp: Date.now(),
    };
    session.messages.push(userMsg);
    await upsertChatSession(session);

    sendResponse({ sessionId: session.id });
  })();
  return true; // keep message channel open for async sendResponse
});

// ── Install hook ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  // Re-apply panel behavior on every install/update in case the top-level call
  // ran before the sidePanel permission was fully granted.
  if (chrome.sidePanel) {
    void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  }
  if (reason === 'install') void runBackfill();
});
