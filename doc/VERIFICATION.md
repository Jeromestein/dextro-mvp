# Verification Record

## Scene glow prototype — 2026-10-07

- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- `pnpm test`: 77 passed, 0 failed in the current shared checkout. No build run.
- Added controller checks for preloading, image reuse, crossfading, stale loads,
  cancelled animation frames, image-less passages, failed loads, reduced motion,
  disposal, and the self-contained function embedded in offline HTML.
- Extended appearance checks to cover the glow switch through local/cloud
  serialization, backups, copies, undo/redo, theme changes, and late media results.
- In-app browser: inspected **The Letter from Tomorrow** using its existing
  artwork, including branch navigation to **The Letter’s Light**, on desktop
  and at 390 × 844. Background colors follow the scene while the reading surface
  stays legible. Mobile document width matched the viewport with no overflow.
- In the existing **The Last Light — Theme Demo**, toggled the editor switch off,
  verified a completed cloud save, reloaded, and confirmed it remained off.
  Restored it to on and verified another completed save. Its theme and content
  were preserved; the original illustrated story was only played, not edited.
- A temporary local draft-review fixture verified light/dark themes, mouse and
  keyboard toggling, unchanged reading position, image-less fallback, and mobile
  settings. The fixture did not save to cloud and was removed afterward.
- Rendered a generated standalone HTML fixture through the existing local
  server: desktop/mobile glow, image-less branch fallback, and restart passed;
  no browser console errors. Removed the temporary public file. Network-disabled
  and file-URL execution were not separately exercised.
- Screenshots and the standalone fixture are ignored artifacts under
  `output/playwright/scene-glow-*`. Temporary viewport overrides were reset.
  No server restart, paid generation, deployment, or commit was performed.

## Story atmosphere themes — 2026-10-07

- `pnpm typecheck`, `pnpm lint`, and `git diff --check`: passed.
- `pnpm test`: 71 tests passed, 0 failed. No `pnpm build` was run.
- Coverage includes bilingual mood/content recommendations, generated-draft
  stability in both generation paths, manual overrides, legacy imports, unsafe
  theme rejection, local persistence, cloud document round trips, backups,
  copies, undo/redo, late media results, and identical exported palette values.
- All four palettes meet a 4.5:1 text contrast threshold for their text colors
  against the reading, backdrop, choice, and hover surfaces in automated checks.

In-app browser, using the existing development server at `http://localhost:3100`:

- Visually inspected all four editor preview themes. Switching theme preserved
  the current passage; radio-keyboard navigation, undo, and redo worked.
- Created a separate sample copy, **The Last Light — Theme Demo**, and retained
  it for review. Midnight persisted through actual cloud saves and page reloads.
  Existing user stories were not edited. This verifies the current shared
  workspace's save path, not per-person isolation or hosted deployment.
- Checked editor and full gameplay at desktop size and 390 × 844. No horizontal
  overflow on mobile. Choices, an ending, and restart retained the theme.
- Exercised the real draft-review component with a temporary local fixture,
  including dark/light sound controls, theme switching without passage reset,
  and mobile layout. The fixture route was removed afterward.
- Downloaded actual playable HTML through the editor. The in-app download-event
  listener timed out, but the file arrived in Downloads and was inspected.
  It contains the saved Midnight palette and no external URLs. Served the
  unchanged file temporarily through the existing dev server; desktop/mobile
  rendering, branch navigation, ending, and restart passed. Removed that
  temporary public file after verification. Network-disabled/file-URL execution
  was not retested in this run.
- Reset temporary viewport overrides. No development server was started or
  restarted by Codex. No paid AI generation was invoked; provider calls remain
  mocked for this feature's tests. Deployment was not performed.

Screenshots and the actual HTML export are ignored artifacts under
`output/playwright/`: `theme-player-desktop.jpg`, `theme-player-mobile.jpg`,
`theme-editor-mobile.jpg`, `theme-draft-mobile.jpg`, `theme-export-desktop.jpg`,
`theme-export-mobile-ending.jpg`, and `theme-export-midnight.html`.

---


Date: 2026-09-28

## Automated checks

- `pnpm typecheck`: passed.
- `pnpm lint`: passed with no warnings.
- `pnpm test`: 9 tests passed, 0 failed.
- Coverage includes all three sample endings, incomplete stories, broken destinations, loops with and without exits, disconnected passages, invalid endings, duplicate identifiers, unsafe imported images, Unicode/image export roundtrips, and script-safe embedded story data.
- AI endpoint tests use a mocked provider: missing configuration, workshop-code authorization, input validation, structured request shape, valid generation, invalid generated graphs, and sanitized upstream errors. No actual AI generation or billing occurred.

## Browser checks

The Next.js development app was checked at `http://127.0.0.1:3100/`.

Codex in-app browser:

- Story library and three-column editor visually inspected on desktop.
- Sample copied, renamed, and a choice edited; refresh retained edits.
- Sample played through a complete route to an ending; restart returned to the opening.
- Image upload displayed in the editor and preview; removing the test image worked.
- Story validation reported a valid sample.
- Editor and player checked at 390 × 844; document width remained 390px with no horizontal overflow. Temporary viewport override reset afterward.
- AI dialog honestly reported unavailable configuration.
- Final editor state inspected after the last UI changes; no browser console errors observed in that tab.

Supplemental Playwright CLI checks:

- Actual HTML and JSON files downloaded using the UI. This supplements an in-app browser download-event timeout; the export itself succeeded in Chrome.
- JSON backup imported through the UI and opened as an editable copy.
- Created a blank story, added two ending passages, connected two choices, and passed structural validation.
- Played both new endings and restarted. After refresh and local-storage hydration, the library retained the new story with three passages and two endings.
- Exported HTML loaded from an isolated static server, then browser networking was disabled. Choices advanced to an ending and restart worked while offline.
- Direct `file://` navigation is blocked by the test browser tooling, so double-click opening the HTML file was not directly tested. The isolated server was stopped afterward. Its only console resource error was the browser's optional favicon request (404).

## Artifacts

Local browser artifacts are ignored by Git under `output/playwright/`:

- `library-desktop.png`
- `editor-desktop.png`
- `editor-mobile.png`
- `player-mobile.png`
- `export-offline.png`
- `the-last-light.html`
- `the-last-light.dextro.json`

## Limits

- `pnpm build` was not run, in accordance with project instructions. Development compilation, TypeScript, lint, and tests do not replace a production build.
- Vercel configuration is included, but no repository was pushed and no deployment was created or verified.
- Live AI generation requires user-provided credentials, a supported model, and a workshop code; none were configured.
- Mobile behavior was checked with a browser viewport, not a physical device. Safari and Firefox were not tested.
- Drafts remain local to the browser and origin. Cross-tab synchronization and cloud persistence are outside this release.

## AI generation update — 2026-10-01

Implementation now includes a language selector (automatic / English / Simplified Chinese), complete draft playback before saving, direct passage and ending previews, and one bounded repair attempt. Generation and repair share a 150-second deadline. Cancelling invalidates late responses and permits a fresh attempt. The provider schema is derived from the same Zod draft schema used for local validation.

Validation:

- TypeScript and ESLint passed. All 18 tests passed, including nine generation-pipeline subtests.
- Endpoint tests use a mocked provider and cover authorization, input limits, language propagation, a valid exportable story, one successful repair, repair exhaustion, malformed draft repair, refusal, incomplete output, sanitized provider errors, cancellation, and timeout.
- Codex in-app browser verified the real unconfigured state and **Check connection again** on the local page.
- Supplemental Playwright CLI testing intercepted only `/api/generate` in an isolated browser session. Fixtures were visibly titled as test fixtures; they were not real model output. Verified language submission, story-choice playback, direct ending preview, discard without saving, keep/edit, and persistence after reload.
- A deferred mock response verified that cancelling and immediately retrying cannot allow the old result to overwrite the new draft. A simulated 502 response verified a visible error and an enabled retry action without changing the saved story.
- Desktop and 390 × 844 phone layouts were inspected. Document and dialog widths stayed within the viewport. Mobile keep/discard controls were reachable by scrolling.
- Screenshots: `output/playwright/ai-unconfigured.png`, `ai-form-desktop.png`, `ai-review-desktop.png`, `ai-review-mobile.png`, and `ai-review-mobile-actions.png`. The preview screenshots use mocked story content.

No real OpenAI request was made: the local key and workshop code are not configured. The example model still requires account-access verification. A blank `.env.local` setup file was created from `.env.example` and remains ignored by Git. No production build, commit, push, or Vercel deployment was performed in this update. Public-user quotas and durable request deduplication remain outside this private workshop implementation.

## 2026-10-01 — Local Sign in with ChatGPT

- `pnpm typecheck`: passed after checking generated Next route types.
- `pnpm lint`: passed.
- `pnpm test`: 30 tests passed. OAuth/provider tests use generated test JWTs and mocked network responses, not real subscription credentials.
- Tests cover loopback/hosted/origin/workshop guards, browser-bound one-time state, fresh PKCE/nonce, issued client reuse, signature/issuer/audience/expiry/nonce rejection, serialized refresh rotation, temporary vs. terminal refresh errors, separate identity/plan permissions, account-model discovery, SSE completion/errors, sign-out revocation and in-flight cancellation, plus the existing generation and story/export suite.
- Live local server verified through the Codex in-app browser at `http://127.0.0.1:3100/`: ChatGPT connection card, disabled sign-in without a workshop code, actionable invalid-code error, Manage usage link, and a successful redirect to the real `auth.openai.com/log-in` page.
- Desktop and 390 × 844 mobile layout checked in the in-app browser; document width was 390px and the dialog fit within the viewport. Evidence: `output/playwright/chatgpt-desktop.png`, `chatgpt-mobile.png`, and `chatgpt-login.png` (ignored local artifacts).
- The original in-app tab stalled; verification used a fresh in-app tab. Popup sign-in was replaced with same-tab navigation after the popup did not appear reliably in the in-app browser. No Playwright fallback was needed for this change.
- Next normalizes internal loopback URLs to `localhost`; the guard now validates the actual `Host` and port and preserves `127.0.0.1` for OAuth callback/Origin comparisons. A regression test covers the normalized internal URL.
- `.env.local` selects ChatGPT mode and holds a generated local workshop code. Existing API settings were preserved. Credential files and `.env.local` are confirmed gitignored; callback request URLs are excluded from Next dev logging.
- Development server is running with `WATCHPACK_POLLING=true pnpm dev --webpack --hostname 127.0.0.1 --port 3100`; webpack polling is used because the initial Turbopack process did not pick up file changes reliably in this environment.
- Pending user action: complete ChatGPT login and plan-use consent. Real account eligibility, model discovery, token renewal/revocation, and a real generated story are NOT yet verified. No live inference/API charge was initiated.
- No `pnpm build`, commit, push, or Vercel deployment was performed.


## 2026-10-01 — Live ChatGPT authorization follow-up

- The embedded browser encountered an OpenAI login-page JSON parsing error. A new sign-in initiated from Chrome succeeded; the user completed authorization and returned to Dextro with plan usage enabled.
- The account's ChatGPT Usage page showed Dextro plan access enabled and credit spillover disabled. No billing settings were changed.
- Live model discovery returned HTTP 200 with a 361,056-byte catalog. The former 300 KB response bound rejected legitimate model metadata. Raised the catalog-only bound to 2 MB; the browser still receives only visible model IDs and names. Added a regression test with a 360 KB metadata field.
- `pnpm typecheck`, `pnpm lint`, and 31 tests passed after the fix.
- The first live Astra generation completed at the provider but Dextro displayed no story because the parser expected the final event to repeat all output text. The stream parser now collects `response.output_text.delta`/`.done`, avoids duplicate text, retains streamed refusals, and still requires a completed terminal event. This follows the [official plan streaming example](https://developers.openai.com/siwc/token-sharing-open-source/models-and-inference). Added a regression test; typecheck, lint, and all 32 tests passed.
- A second live generation using the account's `gpt-6-astra` model succeeded: **雾港末班船**, 8 passages and 3 endings, with structural validation passed and no repair notice. Tested the opening → captain → sluice controls → broken-clock ending in Chrome and saved the draft as a new browser-local story.
- This verifies actual subscription-authorized inference, not merely mocked API behavior. The first failed display attempt may also have consumed subscription usage. The app never switched to API-key billing.
- Live token refresh and remote revocation remain untested to preserve the user's working session. No deployment, commit, push, or `pnpm build` was performed.
- Reloaded Chrome and confirmed the generated story remained in the local library (1 story), then reopened it in Play view. The working game tab was left open for the user. Screenshots: `output/playwright/chatgpt-live-ending.png` and `output/playwright/chatgpt-live-game.png`.

## 2026-10-02 — Local subscription integration restored

- Reverted the uncommitted removal to the implementation in `8dcbcd1` and restored its dependency using the frozen lockfile. Local configuration selects `AI_PROVIDER=chatgpt`; existing API and workshop settings were preserved.
- All 32 tests, TypeScript, ESLint, and `git diff --check` passed. Tests use mocked provider responses; no new live generation was initiated.
- Local `/api/chatgpt` responds successfully with `configured: true`, an empty profile list, and `available: false`. The credential directory was deleted during removal, so the user must sign in again. No provider credential was recovered from Git.
- Codex in-app browser verified the restored ChatGPT connection panel, Manage usage link, sign-in button, and connection check on desktop and at 390 × 844, with no horizontal overflow. Screenshots: `output/playwright/chatgpt-restored-desktop.png` and `output/playwright/chatgpt-restored-mobile.png`.
- Started `WATCHPACK_POLLING=true pnpm dev --webpack --hostname 127.0.0.1 --port 3100` because no server was listening. Left it running at `http://127.0.0.1:3100/` for the user to sign in.
- No production build, commit, push, or deployment was performed. Prior live generation evidence remains historical until fresh authorization completes.

## 2026-10-02 — Dedicated Game Builder workspace

- TypeScript and ESLint passed; all 32 existing tests passed. `git diff --check` passed. No production build was run.
- Codex in-app browser verified the default `/builder` destination, separate Settings, the library with all three existing local games, and an existing game editor. Existing user stories were opened read-only.
- Desktop layouts were inspected at 1280 × 900; builder, settings, and editor were inspected at 390 × 844 with no document horizontal overflow. Mobile passage navigation scrolls within its own outline strip.
- Isolated Playwright CLI browser checks passed for: root redirect; full-page creation and review without an open dialog; account details absent from the builder; premise and language retained across Settings navigation; workshop code reaching the generation request; keeping a draft; editing and reloading an accepted game; following a player choice; browser back navigation; opening the library; creating a blank game; and missing-game recovery.
- The isolated test also confirmed that workshop access clears after a full page load, while a selected model remains correctly displayed after internal navigation back to Settings.
- Generation, account status, and model catalog responses were intercepted with explicit test fixtures. No real model request, new login, usage charge, or provider eligibility check was made. The isolated test browser was closed after verification.
- One automated navigation check initially raced the router after browser Back; waiting for the player controls before navigating resolved the check. Repeated runs also required a scoped selector for identically named test games. These were test synchronization/fixture issues.
- Local screenshots: `output/playwright/workspace-builder-desktop.png`, `workspace-builder-mobile.png`, `workspace-settings-mobile.png`, `workspace-editor-desktop.png`, and `workspace-editor-mobile.png`. All screenshots and temporary browser scripts remain ignored by Git.
- The existing local dev server remains running at `http://127.0.0.1:3100/`. No commit, push, or Vercel deployment was performed.

## 2026-10-02 — Direct local ChatGPT sign-in

- Removed manual workshop-code entry from local ChatGPT account controls and generation. The environment secret is not read into the client, automatically filled, or persisted in browser storage. API-key mode still requires it.
- `pnpm typecheck`, `pnpm lint`, all 33 tests, and `git diff --check` passed. The ChatGPT test suite runs without `AI_ACCESS_CODE` or an `X-Workshop-Code` request header.
- Tests verify code-free sign-in initiation, model discovery, authenticated generation, and rejection of unauthenticated generation, hosted/production mode, wrong hosts, missing Origin, null Origin, other local ports, and remote origins. Existing OAuth, browser-session, plan-permission, and API-mode checks remain covered. Provider responses are mocked.
- Codex in-app browser verified `/settings` on desktop and at 390 × 844: no workshop-code field, enabled **Continue with ChatGPT**, and no horizontal overflow. Reloading keeps direct sign-in available. Screenshots: `output/playwright/chatgpt-no-code-desktop.png` and `chatgpt-no-code-mobile.png`.
- Used the already-running local server; hot reload picked up the endpoint/UI changes. No environment values were changed, server restarted, real sign-in completed, or live inference requested. No production build, commit, push, or deployment was performed.

## 2026-10-02 — Localhost ChatGPT support

- Verified the current [OpenAI sign-in documentation](https://developers.openai.com/siwc/token-sharing-open-source/sign-in): the provider redirect must remain HTTP IPv4 loopback, not localhost.
- Both localhost and IPv4 origins now support local connection/status/generation checks. A localhost-initiated OAuth attempt stores its browser origin and uses the registered IPv4 callback, which relays only OAuth response parameters back to the fixed same-port localhost origin. Browser cookie/state verification and token exchange occur there. The provider exchange retains the exact original IPv4 redirect URI. No provider tokens are placed in the relay URL.
- TypeScript, ESLint, all 34 tests, and `git diff --check` passed. Tests cover mocked successful localhost completion, host-only cookie rotation, unchanged exchange redirect URI, wrong-browser rejection, expired/replayed state rejection, disallowed return destinations, and exact hostname/port/origin checks. Existing IPv4 flows remain covered.
- Codex in-app browser verified `http://localhost:3100/settings`: ChatGPT controls are available without a workshop-code field. Desktop and 390 × 844 layouts passed, with no horizontal overflow. Check connection works. Screenshots: `output/playwright/localhost-settings-desktop.png` and `localhost-settings-mobile.png`.
- An isolated Playwright CLI browser used real local routes/cookies and intercepted only the OpenAI authorization navigation. A simulated access-denied callback at 127.0.0.1 successfully relayed to localhost, passed browser binding, displayed the cancellation message, and returned to localhost Settings. No real OpenAI authorization, token exchange, or model usage occurred. The browser was closed after verification.
- No service was listening on port 3100, so started `WATCHPACK_POLLING=true pnpm dev --webpack --hostname 127.0.0.1 --port 3100`. It remains running and is accessible at `http://localhost:3100/`.
- Existing credentials and browser games were not migrated or deleted. Hostnames still have separate game storage and browser cookies. Real successful authorization through the new localhost flow remains to be completed by the user. No production build, commit, push, or deployment was performed.

## 2026-10-02 — Default Luna model and workspace commit

- The user chose Luna as the default. Live account model discovery in the existing signed-in Chrome session confirmed `gpt-5.6-luna`; the account does not list `gpt-6-luna`. The shared default and API configuration example now use GPT-5.6 Luna.
- Settings explicitly shows **GPT-5.6 Luna (default)**. Refreshing restores this default, loading the catalog preserves it, and a manual model choice still overrides it. The server verifies catalog visibility and returns a Settings-directed error when the requested/default model is unavailable, without silently choosing another model.
- TypeScript, ESLint, all 35 tests, and `git diff --check` passed. Provider tests cover Luna behind another catalog entry, unavailable/hidden Luna without inference, and an explicit alternative model. Provider inference is mocked.
- Codex in-app browser verified the signed-out Settings page on desktop and at 390 × 844. Its separate browser profile is not signed in, so the existing signed-in Chrome session was used for the model controls. Verified the default after reload and catalog loading, manual switching and return to default, and the desktop/mobile visual states with no mobile horizontal overflow. Screenshots: `output/playwright/luna-default.png` and `luna-settings-mobile.png`.
- No new live inference, credential export, production build, push, or deployment was performed. The existing development server was reused without restart. Existing game/editor work in the user's original Chrome tab was not changed.

## 2026-10-06 — Graph and Outline authoring

- TypeScript, ESLint, all 45 tests, and `git diff --check` passed. Ten new tests cover backward-compatible layout metadata, individual-choice connections, deletion/undo, grouped history, finite outline traversal, layout races, coordinate bounds, and real ELK layout with cycles and converging branches.
- Codex in-app browser verified the editor at 1280 × 900 and 390 × 844: Graph/Outline switching, zoom, Fit story, passage selection, references to shared branches, and mobile selection scrolling to the passage editor. Mobile defaults to Outline and has no horizontal document overflow; Graph remains usable and centers the selected passage.
- An isolated Playwright CLI browser verified actual node dragging, undo/redo, position persistence after reload, dragging a choice to an existing destination, updated live preview, creating a connected ending by dropping on empty canvas, deleting/restoring that passage, and undoing automatic layout.
- Exported a JSON backup and standalone HTML through the UI. Imported the backup as a new copy and verified the ten passages and edited destination survived reload. The JSON includes node positions; playable HTML excludes editor metadata. The unmodified exported HTML ran from a data URL, followed a choice to its ending, restarted, fit a 390px viewport, and made no HTTP requests. Direct `file:` navigation is blocked by the automation browser.
- Browser verification found missing controlled-node measurements during dragging; retaining dimension changes fixed the React Flow warning. Styles were moved to the root stylesheet imports for reliable loading. Development hot refresh also emitted a node-type replacement warning; node types are defined outside the component. A fresh-load drag, undo, and scroll-to-pan check finished without new console warnings or errors.
- Local screenshots: `output/playwright/graph-desktop.png`, `outline-desktop.png`, `outline-mobile.png`, `graph-editor-mobile.png`, and `graph-offline-mobile.png`. Screenshots, downloaded test games, and temporary browser scripts remain ignored by Git. Test stories were copies of the bundled sample; existing user games were not changed.
- No Dextro server was listening, so started `WATCHPACK_POLLING=true pnpm dev --webpack --hostname 127.0.0.1 --port 3100`. It remains running at `http://localhost:3100/` for review. No AI generation, account/billing change, production build, commit, push, or deployment was performed. Live provider behavior and production deployment were not retested.

## 2026-10-06 — Module structure and documentation

- Consolidated current requirements, architecture, AI/media design, setup, and verification under `doc/`, with historical requirements and meeting materials in `doc/archive/`. The root README links to the documentation index and describes implemented module ownership. Prototype HTML files remain in the parent workspace.
- Moved source into story, editor, media, generation, player, export, workspace, and connection modules. Extracted the editor session, Graph layout, Outline traversal, passage form, and scene-image field. Split library, connection, and unsaved-draft providers. API generation now delegates to `server/generation/`; credentials and provider code live under `server/`.
- TypeScript and ESLint passed with no warnings. All 47 tests passed, including two new dependency-boundary checks. Existing tests cover branching, history, layout, safe offline export, authorization, and mocked generation. `git diff --check` passed, and local documentation links resolved.
- Codex in-app browser verified `/builder`, `/settings`, the sample player, and a new sample-copy editor using the existing server at `http://localhost:3100/`. The creation brief survived internal Settings navigation. Graph and Outline reflected passage edits; undo/redo restored the expected title; a local screenshot attached through the scene-image control and appeared in preview. Removing it and reloading preserved the final saved story. The original user story was not edited.
- Desktop Graph passed at 1280 × 900. At 390 × 844, reloading defaulted to Outline, selecting an ending scrolled to its text panel, and the independent player followed three choices to **Until morning**. Editor and player document widths matched the viewport, with no horizontal overflow. The browser reported no warnings or errors during these checks. Temporary viewport settings were reset.
- Screenshots: `output/playwright/structure-graph-desktop.jpg`, `structure-outline-mobile.jpg`, `structure-inspector-mobile.jpg`, and `structure-player-mobile.jpg`. They remain ignored by Git. The browser-local sample copy is named **Structure verification — 2026-10-06**; its temporary image was removed.
- Story format version 1, database/store names, and routes remain unchanged; no data migration was run. Offline export and provider behavior were verified by automated tests, not new live inference or a fresh exported-file browser run. Automatic image generation, audio playback, and shared media storage remain proposed features. No production build or deployment was performed, and the existing development server was reused without restarting it.

## 2026-10-06 — Shared scene media and background audio

- Added version 2 shared image/audio assets, passage references, credits, upload/reuse/clear controls, undoable unused-file cleanup, Graph thumbnails/music labels, and Story / Media / Preview tabs. Editor selection and playback progress are separate; Graph highlights the current passage and traversed choices.
- The existing IndexedDB database upgrades to schema version 2. Legacy story reads deduplicate embedded images without rewriting old records. A successful transaction writes story metadata and separate media Blobs together. Changed text does not rewrite unchanged files; undo can restore file bytes after unused-file cleanup. Backups and playable HTML bundle used assets once, including credits. The shared compact-story limit is 24 MB; import allows files up to 25 MB but still enforces the save limit.
- TypeScript, ESLint, and all 53 tests passed. New tests cover legacy migration, shared assignment, reference validation, deduplicated exports, size limits, audio ownership/transitions, rejected playback, transaction rollback, file-write reuse, and undo restoration. IndexedDB tests use the development-only `fake-indexeddb` package. Provider requests remain mocked.
- Codex in-app browser verified the existing library and a new sample copy at `http://localhost:3100/`. Image/audio uploads, two-passage reuse, credits, audition, preview sound, Silence, and reload persistence passed. During preview, selecting **The keeper** left playback at **A familiar hand**. Original user stories were not edited. The agent-created browser-local copy is **Media verification — 2026-10-06**.
- Desktop Graph/Media passed at 1280 × 900. Mobile at 390 × 844 defaulted to Outline; Media and the independent player remained usable, with document width equal to viewport width. Music audition and story sound activated through explicit controls. The temporary viewport override was reset.
- In-app download capture timed out, so the Playwright CLI wrapper provided supplemental isolated verification. Actual UI downloads produced a version 2 backup and HTML with two assets and a shared audio reference. Import, reload, media undo, node dragging/undo, thumbnail visibility, and automatic layout passed. An image-size warning was fixed by using a fixed thumbnail container with a fill image; subsequent checks recorded no new warnings or errors.
- The downloaded HTML ran unchanged in a separate offline browser context at 390 × 844. Sound activation, same-track continuation, Silence, three branch choices to **Until morning**, and responsive layout passed, with zero HTTP requests and no runtime errors. Playback checks verify successful browser playback state using a synthetic tone; they do not establish musical quality, seamless loops, or codec support on every physical device/browser.
- Screenshots and temporary fixtures/scripts remain ignored under `output/playwright/`, including `media-final-desktop.jpg`, `media-music-mobile.jpg`, `media-roundtrip-graph.png`, and `media-offline-mobile.png`. The isolated test browser was closed. The user's existing development server was reused without restart.
- Automatic image generation, a licensed curated music catalog, theme matching, generation jobs/candidate review, and unified draft Graph review remain unimplemented. No live provider request, production build, deployment, or new commit/push was performed in this increment.

## 2026-10-06 — Start audio with Play

- Library and editor Play actions now start the opening track during the user's click. A workspace-scoped gameplay session survives navigation into that game without recreating the playing element. Direct game entry tries playback and shows an Enable sound retry when rejected. Preview, audition, and exported HTML retain their explicit controls.
- TypeScript, ESLint, all 55 tests, and `git diff --check` passed. New tests verify synchronous click activation, session handoff/remount continuity, volume retention, mute across passage changes/restart, rejected autoplay and retry, exclusive audition ownership, silent openings, and disposal.
- Codex in-app browser verified both library and editor Play entries using the existing **Media verification — 2026-10-06** copy. Both reached the player with Mute active without clicking Enable sound. Same-track progression, Silence, manual mute across choices/restart, and volume controls passed. No story content or uploaded files were changed.
- Reloading the game caused a real browser autoplay rejection. The retry prompt appeared, and clicking Enable sound successfully changed it to Mute. Browser logs showed no warnings or errors during the check. Playback state was verified; physical listening and all-browser compatibility were not established.
- Desktop and 390 × 844 mobile views were inspected; mobile document width matched the viewport. Screenshots are ignored under `output/playwright/`: `autoplay-mobile.png`, `autoplay-blocked.png`, and `autoplay-enabled.png`. The viewport override was reset, and verification returned to the library to end gameplay.
- The existing development server at `http://localhost:3100/` was reused without restart. No browser permission settings, provider calls, production build, commit, push, or deployment were performed.

## 2026-10-06 — Reusable chime samples

- Reusable files now live in `public/media/demo/`: a placeholder PNG and four original synthesized WAV samples (`warm-music-box`, `crystal-chime`, `bamboo-chime`, and `mystery-bells`). Each file is stereo, 44.1 kHz, 16-bit PCM with quiet endpoints and peaks below clipping; all are below the 6 MB upload limit. Public URLs were checked against the local file bytes.
- Removed the earlier `test-tone.wav` sample and the two ignored verification exports that still embedded the original two-second tone. Browser-saved stories hold independent copies of uploaded audio and are not changed by deleting resource files. The ignored export-check script now uses the music-box sample.

## 2026-10-06 — OpenAI scene images and CC0 catalog

- `pnpm typecheck`, `pnpm lint`, and `pnpm test` passed (70 tests). No build ran.
  New checks cover image authorization independent of ChatGPT text mode, same-origin
  enforcement, malformed/oversized inputs and responses, duplicate request IDs,
  two-request concurrency, sanitized upstream errors, cancellation, shared scenes,
  stale scene plans, live-edit preservation, source hashes, and portable provenance.
- Codex in-app browser, using the user's existing server on port 3100: created a
  separate **CC0 media verification** story; loaded/listened to bundled piano,
  applied music, undid/redid the assignment, selected another track, and checked
  Graph labels and saved credit metadata. Clicking Play started the new music.
  Desktop (1440 × 1000) and mobile (390 × 844) media/player layouts were inspected;
  fixed wrapping of the mobile Volume label. Restored the browser viewport and
  stopped audition/playback after verification.
- Supplemental Playwright CLI with mocked text/image endpoints: generated a
  complete draft with a media plan, matched actual local music files, populated
  the draft Graph, kept the draft, applied a distinct image candidate, verified
  undo/redo, rejected a cancelled late image response, reassigned music, exported
  a backup, and reloaded saved media. Mobile overflow check passed. Image fixtures
  were single-color test PNGs, not outputs from a live OpenAI request.
- Standalone HTML was exported through the UI, opened with a temporary local
  static server, and tested with subsequent network requests blocked: music
  enabled, a choice reached the next passage, and credits displayed. The tool
  blocks direct `file:` navigation, so this checks self-contained playback rather
  than desktop file-opening behavior. The temporary server on port 33177 was
  stopped; the user's application server was not restarted or stopped.
- Six Freesound files have verified CC0 source records and decode successfully.
  Three Kenney jingles retain the archive license and source records, and are
  reserved for later one-shot support. Audio normalization/edge fades and a
  successful playback check do not establish subjective music quality or perfectly
  seamless musical loops; authors should audition tracks before applying them.
- Screenshots and mock browser scripts are in ignored `output/playwright/`:
  `media-draft-mocked.png`, `media-library-desktop.png`,
  `media-library-mobile.png`, and `media-offline-verified.png`.
- Live OpenAI image generation was not tested: `OPENAI_API_KEY` is absent locally,
  and `/api/media/image` reports unavailable configuration. No paid image request
  was made. Real model access, image quality, latency, and hosted deployment
  behavior remain unverified. Enter the API key locally and restart the application
  server before a live test; do not send the key through chat.

## 2026-10-06 — Media defaults and simplified controls

- Image requests now use `gpt-image-2.5-flare` by default with fixed `low`
  quality and 1536 × 1024 output; no quality selector was added.
- The user reported successful image generation after entering their API key
  locally. This is user-reported confirmation, not an independently observed
  provider/billing test; the earlier missing-key note describes the initial check.
- Media options start collapsed. Image upload and AI creation share a row;
  music upload and the CC0 library share a row. Opening one tool closes the other;
  changing passages resets the controls. The image label explicitly says
  "Create a scene image with AI".
- Codex in-app browser verified desktop and 390 × 844 mobile layouts, image
  expansion/collapse, and switching to the music library on the separate
  **CC0 media verification** story. No paid generation was triggered.
  Screenshot: ignored `output/playwright/media-panel-simplified-mobile.png`.
- `pnpm dev` defaults to port 3100. TypeScript, ESLint, all 70 tests, and
  `git diff --check` passed after the final UI changes. No production build ran.

## 2026-10-06 — API-only generation and model settings

- Removed ChatGPT/OpenID UI, routes, credential/session implementation, provider
  stream handling, and the unused `jose` dependency. Removed workshop-code gates.
  Legacy provider/code environment variables no longer affect generation.
- `OPENAI_API_KEY` alone enables story/image requests. Same-origin checks remain.
  Settings exposes separate story/image selectors, includes environment defaults,
  and remembers selections in browser storage. Requested models are validated on
  the server and passed through story repair and all image-generation paths.
- TypeScript, ESLint, all 56 current tests, and `git diff --check` passed. Obsolete
  OAuth tests were removed. New coverage checks no-code requests, model overrides,
  server defaults, invalid-model rejection, image provenance, batch model
  propagation, secret-free status responses, and loopback/hosted origin checks.
- In-app browser verified `/settings` on desktop and at 390 × 844: two selectors,
  no login/code controls, choices retained after reload, and no mobile horizontal
  overflow. Restored original model choices after testing. Builder and the
  separate **CC0 media verification** story offer generation without entering a
  code. Both removed `/api/chatgpt` routes returned 404 on the existing server.
- No paid provider request was made in this change. Model access, real generation,
  billing, and deployment behavior were not revalidated. No build or commit ran.
  The user's server was reused; restart it after the backend route removal.
- Screenshots: ignored `output/playwright/api-model-settings-mobile.png` and
  `api-model-settings-desktop.png`.

### Commit preparation — 2026-10-07

The API-only change was reconstructed as a separate review snapshot, without the
cloud adapter. All 56 tests, TypeScript and ESLint passed against that snapshot.
The existing working directory and local secret configuration were preserved.


## Cloud storage integration — 2026-10-07

- Applied the migration to Everlove Foundation / dextro-mvp. Supabase SQL checks:
  7 RLS-enabled application tables, 2 private buckets, 1 internal owner, and
  0 anon/authenticated application-table grants.
- Added tests for atomic revision saves, idempotent replay, stale-revision and
  cross-owner asset rejection, function/table permissions, persistent paid-call
  claims, global daily limits, loopback identity gating, output recovery after a
  storage interruption, explicit uncertain outcomes, graph/media/layout round
  trips, embedded exports and owner/project-scoped local recovery storage.
- In-app browser, isolated fixture at port 3101: saved a changed title, reopened
  it, switched Graph/Outline, previewed and reused a stored image in another
  passage, recovered unsynced edits from a new tab, saved them as a new game, and
  checked desktop / 390 x 844 layout. The fixture never calls Supabase or OpenAI.
- Used the Playable HTML button to download a real 3,306,224-byte export. Static
  inspection found 9 passages, 2 valid embedded media payloads and no external
  media/script references. Browser local-file navigation was denied by the URL
  policy, so offline file playback is not claimed as visually verified.
- At the time of the fixture checks, SUPABASE_SECRET_KEY was not configured.
  The connection check below supersedes that configuration gap; real application
  save/upload round trips and provider jobs remain unverified. No deployment or
  paid generation was performed. The production principal intentionally fails closed.
- Final checks passed: `pnpm typecheck`, `pnpm lint`, all 64 tests, and
  `git diff --check`. No `pnpm build` was run. The temporary fixture server
  (`pnpm exec tsx output/playwright/cloud-ui-server.mts`) was stopped after checks.
  The existing development server was not started or restarted by this task.

## Supabase connection verification — 2026-10-07

- The user populated `SUPABASE_SECRET_KEY` in the ignored `.env.local`. Checks
  confirmed the expected project URL, `STORAGE_MODE=supabase`, a nonempty secret
  key with the expected prefix and no surrounding whitespace, and an internal
  owner configuration. No secret value was printed or committed.
- The existing server at `http://localhost:3100/api/storage` returned HTTP 200,
  `mode: supabase`, and `available: true`. This route successfully reads the
  configured owner's `app_users` record; it is more than a key-presence check.
- Authenticated read checks returned HTTP 200 for `app_users`, `stories`,
  `media_assets`, `story_versions`, `story_asset_refs`, `generation_jobs`, and
  `generation_attempts`. Both `user-media` and `generation-output` were listed
  with `public: false`.
- These checks were read-only. They do not establish successful story mutations,
  signed uploads/downloads, complete export/playback, paid model access, Workflow
  execution, or hosted/user-account isolation. No provider request was made.
- A supplemental check under Node.js 20 failed before connecting because the
  installed Supabase client requires native WebSocket support and Node.js 22+.
  Repeating under the shell's Node.js 25.6.1 passed. The project's declared
  minimum and setup guidance now require Node.js 22+; this was not a key failure.

## Cloud commit preparation — 2026-10-07

- Updated setup, requirements, module/state documentation, and the documentation
  index to distinguish implemented cloud behavior, verified connectivity, and
  outstanding live save/upload/provider/deployment checks. Prioritized the next
  work in `CLOUD_STORAGE_DESIGN.md`.
- Corrected Settings' storage description to reflect the active mode. The Codex
  in-app browser verified the actual connected `/settings` page on desktop and
  at 390 × 844: **Saved to your private cloud workspace** is visible, and page
  width remains 390px on mobile. Model selections were not changed. The temporary
  tab was closed and the viewport override reset.
- All 64 tests, TypeScript, ESLint and whitespace checks passed for the cloud
  implementation. No production build, paid generation or deployment was run.
  The existing development server was reused without a restart.

## Shared cloud access on deployed hosts — 2026-10-07

- At the user's explicit request, removed the production-mode, protocol and
  localhost/Host restrictions from the internal principal. No sign-in, access
  code or replacement access gate was added. All callers use the server-configured
  `INTERNAL_TEST_OWNER_ID`. This supersedes the localhost-only boundary in the
  earlier implementation and verification entries.
- Regression coverage exercises development and production modes with local,
  Vercel and alternate HTTPS origins across reads and mutations. Requests resolve
  to the configured owner even if they supply another owner ID. Missing/invalid
  configuration still fails, and missing/cross-site Origin mutations are rejected.
  These are request-handler tests, not a deployed Next.js execution check.
- All 64 tests, TypeScript, ESLint and `git diff --check` passed. The existing local
  `/api/storage` returned HTTP 200 with `mode: supabase` and `available: true`;
  `/api/stories` returned HTTP 200 with a story list.
- The Codex in-app browser verified the local `/builder` page after loading:
  cloud readiness completed, the Generate game button was enabled, and the
  localhost-only warning was absent. No generation was submitted. The temporary
  browser tab was closed afterward.
- No production build, push or deployment was performed in this change.
  The deployed site needs the updated code before the warning can disappear
  there. No Supabase credentials, records, grants or bucket settings were changed.


## Deployed cloud round trip — 2026-10-07

- Tested the live `https://dextro-mvp.vercel.app` deployment in the Codex in-app
  browser after the user removed deployment protection. The builder and library
  loaded without the former localhost-only restriction.
- Created an isolated starter-story copy named **Deployment QA 2026-10-07**
  (`3462efa9-c45c-4fd0-8216-e127b4fe27fa`), retaining its 9 passages and 3 endings.
  Renamed it, applied auto layout, uploaded an 887-byte synthetic PNG, and added
  the bundled CC0 Piano Melody Loop. Reused the uploaded image via **Saved images**
  and assigned the same music to a second passage. Both show usage in 2 passages.
- A full page reload and reopening from **My Games** recovered the title, graph,
  layout, image/music assignments, and credits with **Saved to cloud** displayed.
  The Outline view showed the expected branches and shared destinations. **Check
  story** reported **All paths look good**.
- Read-only checks against the deployed API confirmed revision 10, 9 saved node
  positions, and exactly 2 asset references in this story document, without
  embedded base64. Historical revision 1 remained readable. Both asset-content
  endpoints returned HTTP 200; their SHA-256 hashes matched the downloaded export
  payloads (image: 887 bytes; audio: 946,302 bytes).
- The actual **Playable HTML** and **Editable backup** UI actions downloaded
  `Deployment QA 2026-10-07.html` and `Deployment QA 2026-10-07.dextro.json` to
  Downloads. The HTML is 1,274,668 bytes and contains all 9 passages and both
  embedded media payloads, with no external media/script source attributes.
  The backup retains editor layout; the playable story omits editor layout.
  Catalog attribution/license metadata remains included intentionally.
- Online playback rendered the uploaded 320 x 180 image in both assigned passages.
  Music controls responded to mute, and an unassigned passage displayed Silence.
  Followed the envelope/boat/tower route to **A light for strangers**, used
  **Begin again**, and reopened the story from the library successfully. Audible
  sound output was not independently assessed.
- Visual evidence: `output/playwright/deployment-cloud-restored.jpg`. Test story
  and media remain available for inspection. Other stories were not modified.
- Limitations: direct offline playback of the downloaded HTML and backup reimport
  were not browser-verified. The browser file-selection operation stalled before
  eventually completing; upload and subsequent persistence were confirmed, but
  that automation delay is not an application performance measurement. No paid
  AI requests, Workflow execution, failure recovery, concurrent-save conflict,
  cross-user isolation, or mobile deployment checks were exercised in this run.
  This remains the intentionally shared internal owner workspace.
- No application code, build, local server startup/restart, deployment, or commit
  was performed by this verification task. Concurrent theme changes in the working
  tree were preserved.


## Deployed backup recovery and mobile follow-up — 2026-10-07

- Committed the preceding deployed round-trip record as `cbfb609` before these
  follow-up checks. No push was requested or performed.
- At 390 x 844, the live player displayed its scene image, text and music controls
  correctly. The document width was 390px with no horizontal overflow. Selecting
  **Open the envelope** reached **A familiar hand** with the reused scene image.
  The temporary viewport override was reset. Evidence:
  `output/playwright/deployment-player-mobile.jpg`.
- Submitted a stale revision (current minus one) to the test story save endpoint.
  It returned HTTP 409 with the conflict/recovery message. A subsequent read
  matched the original record exactly, including revision 10 and updated time;
  no content was overwritten. This verifies the deployed API guard, not the
  complete two-editor conflict recovery UI.
- Imported the previously downloaded editable backup through the live library's
  **Import** control. The UI reported **Story imported as a new copy**. The new
  cloud story is `f994b931-aa13-49a0-8f90-e4ea9fbecf08`, renamed **Deployment QA —
  Backup restored 2026-10-07** for identification. Its passages, asset references,
  credits and all 9 node positions match the original; it reuses the same cloud
  asset IDs. The original remains at revision 10. Both media assignments and
  credits were also verified visually in the imported editor. Evidence:
  `output/playwright/deployment-backup-restored.jpg`.
- Prepared a 264-character English story premise in the deployed builder with
  images and music off, but did not submit a provider request while the requested
  US$1 generation budget confirmation remained pending. No paid generation or
  Workflow execution is claimed. Downloaded HTML offline playback remains
  unverified, as reported previously.
- These checks changed only QA cloud records and this verification document.
  No application code, local dev server, production build or deployment changed.


## Live paid story generation — 2026-10-07

- With the user's explicit US$1 budget approval, submitted exactly one text-only
  generation from the deployed builder. Temporarily selected GPT-6 Luna in the
  browser, kept scene images and background music off, and restored the previous
  GPT-6 Astra setting after submission. No image generation was requested.
- Job `38e0d2f5-1ce6-4275-9da2-250beb6a4039` ran through a persisted Vercel Workflow
  and succeeded in approximately 46 seconds (18:26:34 to 18:27:20 UTC). Navigated
  away while it was running; **My Games / Generation history** subsequently showed
  **Saved**, and **Open draft** opened the generated cloud story.
- Supabase showed exactly one provider attempt, model `gpt-6-luna`, status
  `persisted`, charge state `usage_reported`, and `repaired: false`. The retained
  raw response in the private generation-output bucket was readable and completed;
  its usage matched the attempt record. No second provider attempt was made.
- Reported usage: 384 input tokens, 3,958 output tokens (including 1,965 reasoning
  tokens), 4,342 total, with zero cached/cache-write tokens. At the published
  standard rates of US$0.10 / 1M input and US$0.50 / 1M output, the estimate is
  **US$0.0020174**, below the US$1 authorization. This is a usage-based estimate,
  not an independently reconciled billing invoice. Price source:
  https://developers.openai.com/api/docs/pricing (checked 2026-10-07).
- Generated **The Letter from Tomorrow**, 10 passages and 2 endings, with no media.
  The editor displayed **Saved to cloud**; **Check story** reported **All paths
  look good**. Reloading recovered the story. Online playback followed the
  river/bell/observatory-lens route to **The Way Through**, confirming a complete
  playable ending. Evidence: `output/playwright/deployment-ai-ending.jpg`.
- The actual export control downloaded `The Letter from Tomorrow.html` (13,342
  bytes) to Downloads. Its embedded passages and start ID matched the cloud story.
  Direct offline browser playback remains unverified.
- This establishes deployed provider execution, retained output/usage, background
  continuation after leaving the page, cloud persistence, reopening and HTML
  download for a successful text generation. It does not exercise automatic
  repair, interrupted-provider recovery, image generation, or another model.
  No application code, build, deployment, commit or push was performed in this run.


## Per-node live image generation — 2026-10-07

- At the user's request, illustrated all 10 nodes of **The Letter from Tomorrow**
  (`38e0d2f5-1ce6-4275-9da2-250beb6a4039`), including both endings. Used the deployed
  GPT Image 2.5 Flare configuration: low quality, 1536 x 1024, WebP. Applied a
  consistent teal/indigo/amber storybook direction and node-specific visible
  scene descriptions, without changing the story text or choices.
- The first node exercised the complete deployed editor UI: scene description,
  **Generate scene**, candidate preview, **Apply image**, and cloud save. Remaining
  nodes used the same deployed `/api/media/image` and generation-job endpoints;
  assets were assigned with revision-checked story saves. Each request used a
  persisted unique idempotency key. This was an integration test and data update,
  not an implementation of automatic generation for every node in the product UI.
- Initial visual review found extra characters in four solitary interior scenes:
  East Window, Map Under Glass, Hidden Route, and Letter's Light. Generated one
  explicitly solitary replacement for each and rechecked the resulting images.
  All 14 original assets, including the four superseded candidates, remain ready
  and undeleted in storage; the story references exactly 10 final images.
- Verified 14 persisted provider attempts with recorded usage. Image cost estimate:
  **US$0.083635**; combined with the earlier text generation: **US$0.0856524**, below
  the previously approved US$1 budget. These are token-usage estimates, not an
  invoice reconciliation. Rates: US$5 / 1M text input and US$30 / 1M image output;
  no image inputs were supplied. Source checked 2026-10-07:
  https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency
- After refresh, all 10 graph thumbnails decoded at 1536 x 1024. Each passage
  references a distinct ready generated asset. All 10 content endpoints returned
  valid WebP bytes with matching stored sizes and SHA-256 hashes. Final images
  total 1,397,260 bytes, below the story and per-image limits. The editor's story
  check passed. Inspected every scene in the deployed player and followed both
  ending branches; revised interior images were also reviewed visually.
- Evidence: `output/playwright/deployment-all-node-images.jpg`,
  `output/playwright/node-image-verification.json`, and the initial/replacement
  request manifests under `output/playwright/`. Generation helpers use the normal
  deployed APIs; no server secret is written into artifacts or printed.
- Export boundary: the UI showed its success notice, but no new illustrated HTML
  or backup appeared in Downloads and the browser download event timed out.
  Therefore actual browser download is not verified for this run. No console
  errors were observed. Do not treat the toast as proof that the file was saved.
- Independently hydrated the final live cloud story and invoked the repository's
  `buildGame` and `buildBackup` functions. Generated
  `output/playwright/The Letter from Tomorrow — illustrated.html` (1,880,451 bytes)
  and its `.dextro.json` backup (1,886,827 bytes). The HTML embeds exactly 10 images,
  all matching cloud hashes, has no external media/script source dependencies,
  and omits OpenAI prompt provenance. Direct offline browser execution remains
  unverified. This local export-function check is separate from the unsuccessful
  browser download observation.
- No application source, build, deployment, commit or push was changed by this
  task. The verification document is updated; test helpers/artifacts are ignored.


## Automatic story covers — 2026-10-07

- My Games uses the image assigned to the `startId` passage as its cover.
  Missing or failed images fall back to the existing text cover; later scenes
  are never selected implicitly. No new asset, cover setting, or generation
  request is created. Covers retain the editor action and existing card sizes.
- Cloud summaries return only the opening asset content URL. Local summaries
  read metadata and opening image Blobs, loading a complete story and its
  other media only when opened. Existing version-1 images remain readable
  without a write or migration. Unsynced edits update the summary immediately.
- `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. All 11 targeted
  tests passed across storage, covers, cloud round trips, cloud ownership, and
  architecture. Tests exercise a start passage that is not first in the array,
  changing the opening, replacing/removing its image, legacy reads, and bounded
  media reads.
- The initial full-suite run encountered three failures in the concurrently
  edited scene-glow tests. After that separate work was completed, the pre-commit
  recheck passed all 77 tests, type checking, and lint. The cover change does not
  include the scene-glow implementation.
- Codex in-app browser verification passed on the existing localhost:3100
  server using the current cloud workspace: The Letter from Tomorrow shows its
  opening illustration; clicking the cover opens its editor and opening node.
  Search preserves the cover. At 390 x 844, the image is centered and cropped
  with no horizontal overflow. The Last Light — Theme Demo retains its text
  cover. The browser viewport and search were restored after verification.
- Screenshots: `output/playwright/story-covers-desktop.png` and
  `output/playwright/story-covers-mobile.png` (ignored local evidence).
  No story data was edited, no paid provider request was made, and no server
  restart, build, deployment, or push was performed. The updated list
  route responded through the existing dev server; restart the user-run server
  after pulling backend route changes.

## Supabase music library expansion — 2026-10-07

- Applied `202610070001_music_library.sql` to `sbsmnewkilhkcaylpmue`
  (Everlove Foundation / dextro-mvp) in the existing Jerome Chrome session.
- Migrated six existing music tracks and three Kenney effects byte-for-byte.
  Added 18 distinct Freesound CC0 tracks: **24 music + 3 reserved effects**,
  27 different SHA-256 hashes, 28.44 MB total. Every public object was read back
  and verified against its manifest size/hash before its database row was published.
- Live bucket check: `music-library` public; `user-media` and `generation-output`
  remain private. The local `/api/media/music` returned 24 active music records
  with immutable Supabase URLs. Effects do not appear in the music picker.
- All 18 additions passed full decode and loudness/peak checks. Source pages identify
  CC0; the manifest preserves URLs, dates, original titles, authors, page/source
  hashes and processing notes. These are technical checks, not subjective auditory
  review or a guarantee of seamless musical loops. No paid provider calls were made.
- In-app browser on the user's restarted `localhost:3100`: verified three
  recommendations, all-track browsing, combined Sci-fi + Tense filters, text search,
  audition start/stop and switching, and applying An Unfamiliar Signal to the
  opening of the existing **Deployment QA — Backup restored 2026-10-07** story.
  The graph label, assignment, credits and Saved to cloud state updated together.
- The saved private story audio matched the public catalog hash. Production export
  functions generated self-contained HTML and JSON from the hydrated saved story;
  verified the exact audio bytes are embedded, no Storage URL is a playback
  dependency, unrelated catalog tracks are absent, and the backup round-trips.
  The browser download-event helper timed out; direct file playback was blocked by
  the in-app browser's URL policy. Actual browser playback of this new offline
  artifact was therefore not verified. Existing export regression tests passed.
- Undid the temporary QA assignment and confirmed the saved document exactly matches
  its pre-test snapshot (revision 2 → 3 for application → 4 for restoration).
  The newly uploaded private audio remains available as a reusable Saved music asset.
- Verified the picker at desktop size and 390 × 844: search, filters and card buttons
  remain usable; page width equals viewport width with no horizontal overflow.
  Reset the viewport after testing. Screenshots: `output/playwright/music-library-desktop.jpg`
  and `output/playwright/music-library-mobile.jpg` (ignored QA evidence).
- Typecheck, ESLint and 83 automated tests passed. Added coverage for catalog records,
  theme matching, palette size, manual assignments/silence, corrupted downloads,
  cancellation, safe API errors, SQL permissions/RLS and private bucket preservation.
  `pnpm build` was not run. Application changes have not been deployed.
