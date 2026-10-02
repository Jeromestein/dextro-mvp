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

- A dedicated Game Builder as the default page, with full-page AI generation/review and a blank-game option.
- A story library with search, editable imports, and confirmed deletion. Each editor and player has its own URL.
- A separate Settings page for ChatGPT accounts, model selection, usage links, and workshop access.
- A complete original sample, **The Last Light**, with nine passages and three endings. Playing the sample does not change it; editing creates a personal copy.
- Passage editing, choice labels, destinations, branch convergence, opening selection, and multiple endings.
- Live preview from a selected passage or the opening, plus a mobile-friendly player and restart controls.
- Browser-local IndexedDB persistence with a save indicator and explicit storage failure messages.
- Optional embedded PNG, JPEG, or WebP scene images (up to 2 MB per uploaded image).
- Validation for missing content, broken links, unreachable passages, invalid endings, and paths that cannot reach an ending. Broken playable exports are blocked; disconnected passages are warnings.
- Editable `.dextro.json` backups and standalone HTML games with images embedded. The exported game runs without Next.js or an internet connection.
- Optional AI draft generation through a server-only endpoint, with English, Simplified Chinese, or automatic language selection. Play the complete draft and inspect every ending before saving it as a new story.

## Workspace navigation

| Page | Purpose |
| --- | --- |
| `/builder` | Default destination: generate a draft or start a blank game. |
| `/builder/[storyId]` | Edit passages, choices, and endings; preview and export. |
| `/library` | Find, import, and manage saved games. |
| `/play/[storyId]` | Play one game in a focused reading view. |
| `/settings` | Connect ChatGPT or the configured API provider; select a model and manage access. |

`/` redirects to `/builder`. Games are browser-local, so editor/player URLs are workspace navigation, not public share links. The brief and unsaved generated draft survive internal navigation to Settings; full reloads clear transient state. See [WORKSPACE_ARCHITECTURE.md](WORKSPACE_ARCHITECTURE.md) for responsibility and state boundaries.

## Storage boundaries

This release is a local workspace, not a cloud account. Drafts are specific to the browser profile and exact origin (including port). They do not sync between devices, browsers, deployments, or tabs. Clearing site data removes drafts. Export editable backups regularly. A playable HTML file is for playing; use the JSON backup to continue editing.

There is no public publishing service, cloud user account system, analytics, payment system, free-form player input, inventory system, or Blender integration. Optional ChatGPT sign-in connects a local AI provider; it does not sync story drafts.

## Local ChatGPT plan testing

Set `AI_PROVIDER=chatgpt` in `.env.local`. This local mode needs neither an API key nor a workshop access code. Run the local server on the IPv4 loopback address:

```sh
WATCHPACK_POLLING=true pnpm dev --webpack --hostname 127.0.0.1 --port 3100
```

Open http://localhost:3100/settings (or http://127.0.0.1:3100/settings) and choose **Continue with ChatGPT** directly. Sign in to an eligible Plus or Pro account, review the requested plan-use permission, then use **Return to settings** on the callback page. Use **Load available models** to choose a model from that account's live catalog, then choose **Return to builder** to write an idea and generate a game. Without an explicit choice, generation uses GPT-5.6 Luna (`gpt-5.6-luna`), including after a full reload. Loading the catalog does not change the selection. If Luna is unavailable for the account, choose an available model in Settings; Dextro does not silently switch to another model. Manual selections last until a full reload. Existing drafts remain in browser-local storage. `localhost` and `127.0.0.1` have separate browser storage and sign-in cookies; use the address where your games were created, or move a game with a JSON export/import. This change does not migrate games between origins.

**Cost control:** This shares the user's ChatGPT plan allowance and may use credits if the user permits that in ChatGPT settings. In **Manage usage**, disable using credits after the plan limit to stay within the subscription. Dextro cannot enforce or change that account setting. It never falls back to API-key billing automatically. Provider/account eligibility is only confirmed by a completed live generation.

The local OAuth integration follows [OpenAI registration and sign-in](https://developers.openai.com/siwc/token-sharing-open-source/sign-in), [accounts and sessions](https://developers.openai.com/siwc/token-sharing-open-source/profiles-and-sessions), and [preview limitations](https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations). OpenAI requires the provider callback to use `127.0.0.1`. When sign-in starts on `localhost`, Dextro relays the callback to the initiating localhost origin on the same port before verifying its browser cookie, exchanging the code, and setting the signed-in session. The token exchange retains the exact registered IPv4 redirect URI. Return destinations come from short-lived server state, never a request-supplied return URL. Callback responses disable caching and referrers. It uses dynamic client registration, a stable per-installation host ID, PKCE, browser-bound one-time state, and verified ID-token signatures, issuer, audience, expiry, and nonce. Separate account/workspace registrations can be selected or reauthorized. Sign-out attempts remote revocation, clears local tokens, and preserves the client mapping for later sign-in.

Credentials live only in `.dextro-chatgpt/accounts.json`, with owner-only file/directory permissions and atomic writes. The directory is gitignored and excluded from deployment tracing. Do not copy it to Vercel, browser storage, logs, or support messages. Next development request logging excludes the callback URL. The browser receives only an HttpOnly local session cookie and account labels, never provider tokens. A filesystem lock serializes registration and refresh writes. Run one local Next server per credential directory. If a process is forcibly killed while holding the lock, stop all Dextro servers before removing only `.dextro-chatgpt/lock` and restarting; do not delete `accounts.json` to resolve a lock issue.

ChatGPT mode is rejected on Vercel, production runtimes, non-loopback hosts, and mutation requests with a missing or mismatched Origin. In this local mode, the origin guard and authorized browser session replace manual workshop-code entry; the server never sends the environment code to the browser. It is a local test integration, not a hosted multi-user authentication service. Remotely hosted apps require their own eligible OpenAI integration. Authentication and inference are server-side; account changes/sign-out cancel in-flight generation in the local process. Streaming output is accepted only after `response.completed`, then passes the same structural story checks and one-repair limit. This plan route requires `stream: true`, array input, and `store: false`, and does not support `max_output_tokens`; the API route below retains its output-token cap. Both routes keep the shared deadline and bounded response sizes.

## Optional API-key setup

Set `AI_PROVIDER=api` (or leave it unset) to use the separately billed API route.

Copy `.env.example` to `.env.local`, then supply:

- `OPENAI_API_KEY`: server-side provider credential; never prefix it with `NEXT_PUBLIC_`.
- `OPENAI_MODEL`: a Responses API model supporting strict structured outputs. The example uses `gpt-5.6-luna`; availability depends on your account.
- `AI_ACCESS_CODE`: a private ASCII workshop code that authorized testers enter in Settings before generating a draft. This is separate from the API key. All three variables are required to enable generation. Use non-whitespace printable ASCII characters for the workshop code.

Restart the development server after changing environment variables, then open **Settings** and click **Check connection**. This checks configuration presence; a successful live generation is still required to confirm account access and credentials. No credentials are included in this project, and AI is visibly unavailable until configured. Generation and its optional repair share one 150-second deadline. Each request is limited to two provider calls (one generation plus at most one repair), with at most 8,000 output tokens per call in API-key mode, bounded input/response sizes, strict output parsing, and graph validation. Refusals, incomplete output, provider failures, and timeouts are not automatically retried. Authors can cancel; late responses cannot replace a newer draft. It never replaces an existing story automatically.

In API-key mode, the workshop code gates billable requests, but it is not a user account system or a distributed quota. For public AI access, add authenticated users and durable per-user quotas before distributing access. Generation errors do not expose provider credentials or raw upstream responses. Aborting a request does not guarantee that the provider has stopped billing work already started.

## Vercel

1. Import the repository containing this project.
2. Set **Root Directory** to `dextro-mvp` if deploying the parent folder; leave it at the repository root if this folder is its own repository.
3. Choose the **Next.js** framework preset. `vercel.json` specifies `pnpm install --frozen-lockfile` and `pnpm build` for Vercel's build service.
4. Use a supported Node.js version satisfying `package.json` (22.x is a suitable target).
5. For hosted API generation, set `AI_PROVIDER=api` and the three API configuration variables. Local ChatGPT credentials must not be uploaded to Vercel. Then deploy.
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

- `src/app/(workspace)/`: dedicated builder, per-game editor/player, library, and settings routes.
- `src/components/workspace-provider.tsx`: shared browser-local games, serialized saves, transient brief/review, and in-memory connection settings.
- `src/components/workspace-shell.tsx`: persistent workspace navigation.
- `src/components/game-builder.tsx`: full-page creation and draft review.
- `src/components/connection-settings.tsx`: isolated AI/account configuration.
- `src/components/studio.tsx`: existing library, passage editor, player integration, and small confirmation dialogs.
- `src/components/ai-draft-review.tsx`: full unsaved-draft preview, passage selection, and keep/discard actions.
- `src/lib/ai-story.ts`: shared generation input/schema and draft validation.
- `src/components/player.tsx`: shared editor preview and player.
- `src/lib/story.ts`: validated story model and graph checks.
- `src/lib/storage.ts`: IndexedDB persistence.
- `src/lib/export.ts`: editable backup helpers and standalone HTML generation.
- `src/lib/sample.ts`: original starter story.
- `src/app/api/generate/route.ts`: optional protected AI draft endpoint.

The UI is English, matching the existing Dextro prototype. Authors can write Unicode story content, including Chinese. The lighthouse artwork is an original SVG illustration included in source. Google Fonts enhance the studio typography with local fallbacks; exported games use system fonts and make no external requests.
