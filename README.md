# Leetcode Buddy

A Chrome extension (Manifest V3) that tracks your LeetCode submission history, computes weighted topic "pain scores", and shows progress for your active study plan.

## Build & Load

### Prerequisites

- Node.js ≥ 18
- pnpm (`npm install -g pnpm`)

### Steps

```bash
pnpm install
pnpm gen-icons   # generates public/icons/*.png (run once)
pnpm build       # outputs to dist/
```

Load into Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select the `dist/` folder

### Development (HMR)

```bash
pnpm dev
```

Load the project root as an unpacked extension. CRXJS handles hot-reload for the popup.

## Tests

```bash
pnpm test
```

14 unit tests covering `computeProblemAreas` (pain score calculation) and `getSimilarProblems` (unsolved/failed categorisation).

## Architecture

| Context | Entry | Responsibility |
|---------|-------|----------------|
| Background SW | `src/background/index.ts` | webRequest observer on `/submissions/detail/*/check/`, GraphQL backfill on install, message routing |
| Content script | `src/content/index.tsx` | Floating LB button (top-right), SPA URL/plan-slug detection |
| Popup | `src/popup/main.tsx` | React 18 app — Stats tab + Problem Areas tab |

All cross-context communication goes through typed message helpers in `src/lib/messaging/`.

Data flow:
1. Install → background fetches all submissions + problem metadata via `https://leetcode.com/graphql/` (cookies attached automatically via `host_permissions`)
2. Every submission result → webRequest fires → content script reports problem slug → background re-fetches metadata
3. Popup reads from IndexedDB (Dexie) and `chrome.storage.local` for prefs

## Key Technical Notes

- **`chrome.action.openPopup()`** is available in Chrome 127+ (July 2024). The FAB click sends a message to the background which calls it. On older Chrome, users must click the extension icon.
- **webRequest in MV3**: Used as a non-blocking observer only (`onCompleted`). No `webRequestBlocking` required.
- **Backfill throttling**: 300 ms between submission pages, 100 ms per 5 problem metadata fetches to avoid LeetCode rate limits.
- **`getSubmissionList`** returns partial submissions (no `difficulty`/`topicTags`) because these require separate `questionData` queries. The backfill merges them.

## AI Extension Points (Prompt 2)

- `src/lib/scoring/similarProblems.ts` — `getSimilarProblems()` is fully implemented and tested; Prompt 2 builds the expanded topic-row UI that calls it
- `src/popup/components/ProblemAreasTab.tsx` — topic expansion currently shows a stub; Prompt 2 replaces it with the full panel
- Background backfill pipeline is structured to accept AI revision suggestions without changes
