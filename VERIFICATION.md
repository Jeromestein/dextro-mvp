# Verification Record

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
