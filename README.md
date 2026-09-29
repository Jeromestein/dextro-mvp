# Dextro MVP

A choice-based text adventure studio built with Next.js App Router, React, TypeScript, and pnpm. Deployment target: Vercel.

Confirmed project scope and ongoing decisions are recorded in [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md).

## Run locally

Requirements: Node.js 20.9+ and pnpm 9.7.1 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:3000. Run the development server from your own terminal for ongoing work. In restricted environments that cannot create native file watchers, use `WATCHPACK_POLLING=true pnpm dev`.

## What works

- A story library with search, new stories, editable imports, and confirmed deletion.
- A complete original sample, **The Last Light**, with nine passages and three endings. Playing the sample does not change it; editing creates a personal copy.
- Passage editing, choice labels, destinations, branch convergence, opening selection, and multiple endings.
- Live preview from a selected passage or the opening, plus a mobile-friendly player and restart controls.
- Browser-local IndexedDB persistence with a save indicator and explicit storage failure messages.
- Optional embedded PNG, JPEG, or WebP scene images (up to 2 MB per uploaded image).
- Validation for missing content, broken links, unreachable passages, invalid endings, and paths that cannot reach an ending. Broken playable exports are blocked; disconnected passages are warnings.
- Editable `.dextro.json` backups and standalone HTML games with images embedded. The exported game runs without Next.js or an internet connection.
- Optional AI draft generation through a server-only endpoint. Drafts are reviewed before being saved as a new story.

## Storage boundaries

This release is a local workspace, not a cloud account. Drafts are specific to the browser profile and exact origin (including port). They do not sync between devices, browsers, deployments, or tabs. Clearing site data removes drafts. Export editable backups regularly. A playable HTML file is for playing; use the JSON backup to continue editing.

There is no public publishing service, login, analytics, payment system, free-form player input, inventory system, or Blender integration in this release.

## Optional AI setup

Copy `.env.example` to `.env.local`, then supply:

- `OPENAI_API_KEY`: server-side provider credential; never prefix it with `NEXT_PUBLIC_`.
- `OPENAI_MODEL`: a Responses API model supporting strict structured outputs. The example uses `gpt-6-astra`; availability depends on your account.
- `AI_ACCESS_CODE`: a private ASCII workshop code that authorized testers enter when generating a draft. This is separate from the API key. All three variables are required to enable generation.

Restart the development server after changing environment variables. No credentials are included in this project, and AI is visibly unavailable until configured. Generation has a 150-second timeout, a bounded premise and output size, strict output parsing, and graph validation. It never replaces an existing story automatically.

The workshop code gates billable requests, but it is not a user account system or a distributed quota. For public AI access, add authenticated users and durable per-user quotas before distributing access. Generation errors do not expose provider credentials or raw upstream responses. Aborting a request does not guarantee that the provider has stopped billing work already started.

## Vercel

1. Import the repository containing this project.
2. Set **Root Directory** to `dextro-mvp` if deploying the parent folder; leave it at the repository root if this folder is its own repository.
3. Choose the **Next.js** framework preset. `vercel.json` specifies `pnpm install --frozen-lockfile` and `pnpm build` for Vercel's build service.
4. Use a supported Node.js version satisfying `package.json` (22.x is a suitable target).
5. Add the optional AI environment variables only if you want generation enabled, then deploy.
6. Verify the deployed story workflow and restore a JSON backup if moving existing local drafts to the new origin.

No Vercel deployment has been created as part of the initial local implementation. The deployment build command is configured, but `pnpm build` must not be run by Codex under this project's instructions.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
```

Core tests cover all sample endings, broken destinations, loops with and without exits, import validation, and safe offline export. See `VERIFICATION.md` for the actual checks performed and their limits.

## Layout

- `src/components/studio.tsx`: library, editor, dialogs, and local save workflow.
- `src/components/player.tsx`: shared editor preview and player.
- `src/lib/story.ts`: validated story model and graph checks.
- `src/lib/storage.ts`: IndexedDB persistence.
- `src/lib/export.ts`: editable backup helpers and standalone HTML generation.
- `src/lib/sample.ts`: original starter story.
- `src/app/api/generate/route.ts`: optional protected AI draft endpoint.

The UI is English, matching the existing Dextro prototype. Authors can write Unicode story content, including Chinese. The lighthouse artwork is an original SVG illustration included in source. Google Fonts enhance the studio typography with local fallbacks; exported games use system fonts and make no external requests.
