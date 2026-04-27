import { createRoot } from 'react-dom/client';
import { Fab } from './Fab';
import { sendMessage } from '@/lib/messaging';

// Mount FAB into an isolated container so LeetCode styles don't bleed in
const container = document.createElement('div');
container.id = 'leetcode-buddy-fab-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(
  <Fab
    onClick={() => {
      sendMessage({ type: 'CONTENT_OPEN_POPUP' }).catch(console.error);
    }}
  />,
);

// ── URL detection (SPA-aware) ─────────────────────────────────────────────────

function extractPlanSlug(url: string): string | null {
  const match = url.match(/\/(?:study-plan|studyplan)\/([^/?#]+)/);
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

// LeetCode is a React SPA — intercept pushState and listen to popstate
const _origPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  _origPushState(...args);
  reportUrl(location.href);
};
window.addEventListener('popstate', () => reportUrl(location.href));

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
