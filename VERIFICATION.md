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
