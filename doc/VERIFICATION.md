# Verification Record

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
