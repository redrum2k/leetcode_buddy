# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server with HMR (load project root as unpacked extension)
pnpm build            # production build → dist/
pnpm test             # run unit tests (vitest)
pnpm test:watch       # vitest in watch mode
pnpm typecheck        # tsc --noEmit
pnpm gen-icons        # generate public/icons/*.png (run once after setup)

# Run a single test file
pnpm test src/lib/__tests__/problemAreas.test.ts
```

To load in Chrome: enable Developer mode at `chrome://extensions`, then **Load unpacked** → select `dist/`.

## Architecture

This is a Chrome Extension (Manifest V3) with four distinct execution contexts:

| Context | Entry | Notes |
|---|---|---|
| Background SW | `src/background/index.ts` | Single file — all message routing, backfill, AI streaming |
| Content script | `src/content/index.tsx` | Injects FAB, detects URL/plan changes, reads Monaco editor |
| Popup | `src/popup/main.tsx` | React 18 app (400×600px), three tabs: Stats / Areas / Solved |
| Chat window | `src/chat/main.tsx` | Separate `chrome.windows.create` window; not in manifest, added as extra Vite entry |

**Cross-context communication** uses typed helpers in `src/lib/messaging/`. All one-shot message types are defined in `src/lib/messaging/types.ts` as the `AppMessage` union. The chat window uses a separate long-lived `chrome.runtime.Port` named `ai-chat` for streaming — its messages (`INIT`, `SEND`, `SEND_COPILOT`, `NEW_CONVERSATION` inbound; `SESSION`, `AI_CHUNK`, `AI_DONE`, `AI_ERROR`, `CODE_WRITTEN`, `CODE_WRITE_FAILED` outbound) are **not** part of the `AppMessage` union and are handled in the `onConnect` listener in `src/background/index.ts`.

**Data layer:**
- `src/lib/db/schema.ts` — Dexie (IndexedDB) with tables: `submissions`, `problems`, `studyPlans`, `chatSessions`
- `src/lib/db/repos.ts` — all DB read/write operations
- `chrome.storage.local` — lightweight prefs: `username`, `selectedModuleSlug` (manually pinned plan), `activePlanSlug` (auto-detected from URL), `lastBackfill`, `backfillInProgress`, `anthropicApiKey`, `selectedModel`
- `chrome.storage.session` — caches `currentProblemContext` and `currentTabId` so the service worker can re-hydrate them after being terminated and restarted

**Data flow:**
1. On install → background calls `runBackfill()`: walks all submission pages, then fetches `questionData` metadata for each unique slug and merges into full `Submission` records
2. `webRequest.onCompleted` watches `/submissions/detail/*/check/` → notifies content script → content script sends `CONTENT_SUBMISSION_DETECTED` → background re-fetches problem metadata
3. Content script sends `CONTENT_PROBLEM_CONTEXT` with the problem title, statement, tags, and current editor code whenever the user visits a problem page

**AI integration** (`src/background/index.ts` → `streamAIResponse`):
- Calls `https://api.anthropic.com/v1/messages` directly from the service worker (requires `anthropic-dangerous-direct-browser-access: true` header)
- Streams SSE chunks back to the chat window via the `ai-chat` port
- Two modes: Socratic tutor (`SEND`) and Copilot (`SEND_COPILOT` — writes generated code back into the Monaco editor)

## Key Files

- `src/types/index.ts` — canonical source of all shared types (`Submission`, `Problem`, `StudyPlan`, `ChatSession`, `ProblemContext`, `UserPrefs`, etc.)
- `src/lib/ai/systemPrompt.ts` — **user-editable** Socratic tutor prompt; keep the `{{variableName}}` template structure stable
- `src/lib/ai/copilotPrompt.ts` — Copilot mode prompt; extracts code blocks and injects them into Monaco
- `src/lib/scoring/problemAreas.ts` — `computeProblemAreas()`: aggregates failed submissions by topic tag with difficulty-weighted pain scores (Easy=3, Medium=2, Hard=1)
- `src/lib/scoring/similarProblems.ts` — `getSimilarProblems()`: identifies unsolved/failed problems similar to a given slug
- `src/lib/studyPlans/data.ts` — hardcoded problem slug lists for study plans (used for instant progress calculation without a network request)
- `src/lib/graphql/queries.ts` — all LeetCode GraphQL queries (user profile, submission list, problem metadata, study plan detail)
- `src/popup/hooks/usePrefs.ts` — reads/writes `chrome.storage.local` prefs and re-renders on storage changes
- `src/popup/hooks/useStats.ts` — aggregates `Stats` from Dexie + active plan; accepts a `refreshKey` to force a reload

## Path Alias

`@` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

## Tests

Unit tests live in `src/lib/__tests__/` and cover `computeProblemAreas` and `getSimilarProblems`. Vitest runs in jsdom environment (see `vitest.config.ts`). There are no tests for React components or the extension contexts.

## Constraints

- **Backfill throttling**: 300 ms between submission pages; 100 ms per 5 problem metadata fetches — do not remove these.
- **`chrome.action.openPopup()`** requires Chrome 127+. The FAB click path handles the older-Chrome fallback silently.
- **MV3 service worker**: message handlers must return synchronously. Async work is always wrapped in `void (async () => { ... })()`.
- Adding a new `AppMessage` type requires updating both `src/lib/messaging/types.ts` (the union) and `src/background/index.ts` (the `addMessageListener` handler). Chat-port messages only need `src/background/index.ts` updated.
- **`selectedModuleSlug` vs `activePlanSlug`**: `selectedModuleSlug` is the user's explicit manual pin; `activePlanSlug` is auto-detected from the LeetCode URL. The background uses `selectedModuleSlug ?? activePlanSlug` when answering `POPUP_GET_STATUS`.
