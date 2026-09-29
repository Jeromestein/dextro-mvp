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
