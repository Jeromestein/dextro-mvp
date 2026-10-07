# AI Setup and Deployment

Dextro uses one server-side OpenAI API key for stories and scene images.
There is no sign-in or access-code step. Settings contains two model selectors.

## Environment

Use Node.js 22+ and run commands from the `dextro-mvp` project root. Copy `.env.example` to
`.env.local` only if the latter does not exist, then set:

- `OPENAI_API_KEY`: required for AI generation, with API billing/model access.
- `OPENAI_MODEL`: optional story default, otherwise `gpt-5.6-luna`.
- `OPENAI_IMAGE_MODEL`: optional image default, otherwise `gpt-image-2.5-flare`.

Restart your development server after changing environment variables:

```sh
pnpm dev
```

Open http://localhost:3100/settings. If native file watching is unavailable, use
`WATCHPACK_POLLING=true pnpm dev --webpack`.

The key stays on the server, never in browser storage or a `NEXT_PUBLIC_` variable.
All visitors who can reach the studio can generate using that key. The same-origin
request check is retained; it is not a user identity or quota system.
`AI_PROVIDER` and `AI_ACCESS_CODE` are no longer used, even if left in an old env file.
The ChatGPT/OpenID routes and token-handling implementation have been removed.
Legacy `.dextro-chatgpt/` files are unused and remain ignored/excluded from deployment.

## Models

Choose **Story model** and **Image model** in Settings. Choices are remembered
in this browser and apply to future requests, including story repair, individual
scene previews, new-story images, and missing-image recovery. The configured
environment default is also listed when it is outside the built-in model list.
The server rejects arbitrary models not in that list or its configured default.

Settings checks configuration presence, not live account eligibility. An unavailable
model produces an error; Dextro never silently substitutes another model. The API
key pays for all AI usage. Music remains a bundled free CC0 selection.

## Generate and review

In **Game Builder**, background music defaults to Auto. Enable **Scene images**
explicitly for up to four shared scene images. Text is available before media
finishes; keeping or leaving the draft stops pending work.

In the editor, select a Graph node and open **Media**. Beside **Upload image**,
click **Create a scene image with AI** to reveal the scene description and style.
Generate a preview, then choose **Apply image** or **Discard**. For music, click
**Choose from library**, load a preview, listen, and choose **Use this music**.

Stories with a media plan can **Match missing music** or **Generate missing
images**. Existing assignments are preserved. Changed scene facts require a new
per-passage preview. Bulk recovery uses Storybook; individual images use the
selected visual style. Undo stops pending recovery.

Images use fixed `low` quality, 1536 × 1024 WebP, compression 80. At most two image
requests run per server process, and client batches run sequentially. The server
uses a 150-second deadline. Image calls are not automatically retried, and duplicate
request IDs are rejected for ten minutes in the process. Cancellation cannot
reverse charges for provider work already started.

Story generation and at most one structural repair share a 150-second deadline.
Each provider call is limited to 8,000 output tokens; input/response sizes are
bounded. Refusals, incomplete output, provider failures, and timeouts are not
retried. Provider errors do not expose credentials or raw upstream responses.

The library contains six Freesound CC0 tracks. Selected bytes and source credits
travel with stories, backups, and offline exports. Three Kenney jingles are
reserved for future one-shot support. No runtime Freesound search or API key is
required. See the [library records](../public/media/library/README.md).

## Vercel

1. Import the repository; use `dextro-mvp` as Root Directory only when importing
   its parent folder.
2. Choose Next.js and Node.js 22 or later, satisfying `package.json`.
3. Set `OPENAI_API_KEY` and, optionally, the two default-model variables.
4. Before inviting testers, protect the deployed studio and its billable routes.
   Verify generation on the deployed origin. Local configuration and mocked tests
   do not verify deployed account access or execution limits. The cloud adapter
   rejects production until a verified hosted access boundary is implemented.

Vercel runs the configured build; do not run `pnpm build` locally under project
instructions. Browser-local games do not migrate between origins automatically;
use JSON export/import. See [verification](VERIFICATION.md) for actual checks.


## Private cloud generation

With `STORAGE_MODE=supabase`, story/image POSTs return a persisted job ID and the
browser polls `/api/generation-jobs/:id`. The Workflow SDK runs the server work.
Provider output is archived before it becomes a Story or media asset. A completed
story is a saved draft even before Keep; an unused generated image stays in Saved
images. Stop waiting only stops browser polling and future optional media submits.

Set `SUPABASE_URL`, server-only `SUPABASE_SECRET_KEY`, and `INTERNAL_TEST_OWNER_ID`;
the latter must match the internal `app_users` record seeded by the migration.
`GENERATION_DAILY_LIMIT` defaults to 20 provider attempts per UTC day (maximum
100); a structural repair counts as another attempt. Two dispatched attempts may
run concurrently. These are attempt caps, not dollar-cost estimates.

Find the Supabase secret under **Project Settings → API Keys → Secret keys**.
Use an `sb_secret_` value on the server, not the publishable key. Apply the migration
once to a new project, configure the internal owner, and restart your development
server. Verify `/api/storage` reports `mode: supabase` and `available: true` before
testing saves. The Everlove `dextro-mvp` project already has the migration and passed
this connection check on 2026-10-07. Do not commit `.env.local` or paste keys into
documentation. A successful connection check does not verify uploads or generation.

The cloud worker has a 150-second deadline per provider call and at most one
separate structural repair. The local adapter's shared request deadline described
above is not a cloud end-to-end duration guarantee.

A lost provider response can still mean a charge without recoverable bytes. Such
jobs are marked outcome uncertain and are not automatically generated again.
Status/history access can resume already archived output or queued work. No
scheduled reconciler is configured. The local Workflow state directories are
ignored by Git and are not production deployment evidence.

The current internal cloud principal rejects production mode and non-loopback
hosts. Do not turn this into a public fixed-owner service. Hosted cloud use needs
verified identity/access protection and separate deployment verification.
