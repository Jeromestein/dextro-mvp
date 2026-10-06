# AI Provider Setup and Deployment

Run commands from the `dextro-mvp` project root. This guide preserves the existing
text-generation setup; image generation and audio are not configured by these steps.
See [system design](SYSTEM_DESIGN.md) for implementation boundaries.

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
