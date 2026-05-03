import { sendMessage } from '@/lib/messaging';
import type { Difficulty, ProblemContext } from '@/types';

// ── URL detection (SPA-aware) ─────────────────────────────────────────────────

function extractPlanSlug(url: string): string | null {
  const match = url.match(/\/(?:study-plan|studyplan)\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function extractProblemSlug(url: string): string | null {
  const match = url.match(/\/problems\/([^/?#]+)\//);
  return match?.[1] ?? null;
}

function reportUrl(url: string): void {
  sendMessage({
    type: 'CONTENT_URL_CHANGED',
    url,
    detectedPlanSlug: extractPlanSlug(url),
  }).catch(console.error);
}

reportUrl(location.href);

// ── Problem context extraction ────────────────────────────────────────────────

function extractDifficulty(): Difficulty {
  // LeetCode renders difficulty as a styled element with class containing the word
  const el = document.querySelector('[class*="difficulty-"]') as HTMLElement | null
    ?? document.querySelector('.text-difficulty-easy, .text-difficulty-medium, .text-difficulty-hard') as HTMLElement | null;
  const text = el?.textContent?.trim() ?? '';
  if (text === 'Easy') return 'Easy';
  if (text === 'Hard') return 'Hard';
  return 'Medium';
}

function extractTitle(slug: string): string {
  // Try: the breadcrumb-style title link, then document.title
  const titleEl =
    document.querySelector('[data-track-load="description_content"]')?.previousElementSibling as HTMLElement | null
    ?? document.querySelector('.text-title-large') as HTMLElement | null;
  const fromEl = titleEl?.textContent?.trim();
  if (fromEl) return fromEl;

  // Fallback: parse from document.title (format: "Title - LeetCode")
  const titleMatch = document.title.match(/^(.+?)\s+-\s+LeetCode/);
  if (titleMatch) return titleMatch[1].trim();

  // Last resort: prettify slug
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractStatement(): string {
  const el =
    document.querySelector('[data-track-load="description_content"]') as HTMLElement | null
    ?? document.querySelector('.elfjS') as HTMLElement | null;
  return el?.textContent?.trim() ?? '';
}

function extractTopicTags(): string[] {
  // LeetCode shows topic tags in the description sidebar
  const tags: string[] = [];
  document.querySelectorAll('a[href*="/tag/"]').forEach((el) => {
    const t = el.textContent?.trim();
    if (t) tags.push(t);
  });
  return [...new Set(tags)];
}

function extractCurrentCode(): string | undefined {
  try {
    // LeetCode uses Monaco editor — accessible via window.monaco in the page context
    // Content scripts run in an isolated world, so we attempt via the editor DOM fallback
    const editorEl = document.querySelector('.view-lines') as HTMLElement | null;
    if (editorEl) {
      return editorEl.textContent?.trim() ?? undefined;
    }
  } catch {
    // Extraction failed — optional feature, safe to skip
  }
  return undefined;
}

function sendProblemContext(slug: string): void {
  const context: ProblemContext = {
    slug,
    title: extractTitle(slug),
    difficulty: extractDifficulty(),
    statement: extractStatement(),
    topicTags: extractTopicTags(),
    currentCode: extractCurrentCode(),
  };
  sendMessage({ type: 'CONTENT_PROBLEM_CONTEXT', context }).catch(console.error);
}

function maybeSendContext(url: string): void {
  const slug = extractProblemSlug(url);
  if (!slug) return;
  // Immediate attempt (page may not be fully loaded)
  sendProblemContext(slug);
  // Retry after content loads
  setTimeout(() => sendProblemContext(slug), 1500);
}

maybeSendContext(location.href);

// LeetCode is a React SPA — intercept pushState and listen to popstate
const _origPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  _origPushState(...args);
  reportUrl(location.href);
  maybeSendContext(location.href);
};
window.addEventListener('popstate', () => {
  reportUrl(location.href);
  maybeSendContext(location.href);
});

// Forward submission-completed events from background so the content script
// can resolve the problem slug from the current URL
chrome.runtime.onMessage.addListener(
  (msg: { type?: string; submissionId?: string }) => {
    if (msg.type !== 'BG_SUBMISSION_COMPLETED') return;
    const slugMatch = location.pathname.match(/\/problems\/([^/]+)\//);
    if (!slugMatch) return;
    sendMessage({
      type: 'CONTENT_SUBMISSION_DETECTED',
      submissionId: msg.submissionId ?? '',
      problemSlug: slugMatch[1],
    }).catch(console.error);
  },
);
