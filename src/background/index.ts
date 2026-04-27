import {
  addMessageListener,
  type BgBackfillProgressMsg,
} from '@/lib/messaging';
import {
  upsertSubmissions,
  upsertProblem,
  upsertStudyPlan,
  getAllStudyPlans,
} from '@/lib/db/repos';
import {
  getUserProfile,
  getSubmissionList,
  getProblemMetadata,
  getStudyPlanDetail,
  getUserStudyPlans,
} from '@/lib/graphql/queries';
import type { Submission, Difficulty } from '@/types';

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

    // 4. Fetch study plans (non-fatal)
    try {
      const plans = await getUserStudyPlans();
      for (const plan of plans) await upsertStudyPlan(plan);
    } catch {
      // non-fatal
    }

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

// ── Install hook ──────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') void runBackfill();
});
