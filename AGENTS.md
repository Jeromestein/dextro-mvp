# Project Instructions

- Prefer Chinese for collaboration; use English for code, comments, and documentation.
- Use pnpm. Do not run `pnpm build`; Vercel runs the deployment build.
- Preserve the existing reference HTML files in the parent directory.
- Keep the MVP limited to choice-based text adventures. No Blender or free-form AI play.
- Drafts are browser-local. Do not describe local persistence as cloud backup or synchronization.
- AI generation must stay server-side and report unavailable configuration honestly. Use the environment OpenAI API key without sign-in or access codes. Settings selects story/image models; retain same-origin request checks.
- Prefer the user's existing dev server. Start a local server only when requested or needed to unblock verification.
- Verify frontend changes in the Codex in-app browser, including the affected interactions and mobile layout.
- Run `pnpm typecheck`, `pnpm lint`, and the relevant tests. Report unverified provider or deployment behavior explicitly.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
