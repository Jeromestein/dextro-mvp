# AI Setup and Deployment

Dextro uses one server-side OpenAI API key for stories and scene images.
There is no sign-in or access-code step. Settings contains two model selectors.

## Environment

Run commands from the `dextro-mvp` project root. Copy `.env.example` to
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
2. Choose Next.js and a supported Node.js version satisfying `package.json`.
3. Set `OPENAI_API_KEY` and, optionally, the two default-model variables.
4. Deploy and verify generation on the deployed origin. Local configuration and
   mocked tests do not verify deployed account access or execution limits.

Vercel runs the configured build; do not run `pnpm build` locally under project
instructions. Browser-local games do not migrate between origins automatically;
use JSON export/import. See [verification](VERIFICATION.md) for actual checks.
