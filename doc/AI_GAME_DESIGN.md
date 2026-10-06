# AI-Assisted Game Creation

Status: initial generation workflow implementation authorized on 2026-10-01. Code, simulated behavior, and live ChatGPT plan generation verified; the separately billed API-key path has only mocked verification. Targeted editing and later asset generation remain proposals.

## Product goal

An author describes an idea and receives a complete, editable choice-based text adventure. AI creates story content and branch connections; the existing player renders the game. All choices are authored before play, so playing and standalone exports require no AI requests.

## Existing foundation

The dedicated `/builder` page accepts a premise, mood, and language, provides a complete playable preview with passage/ending selection, and saves an accepted draft as a new story. Structural failures get at most one repair within a shared deadline. Cancellation prevents late results from replacing a newer draft. The server uses the OpenAI Responses API with strict structured output, provider-specific authorization, and graph validation. API-key mode requires a workshop code; local ChatGPT mode uses strict loopback/same-origin checks and an authorized browser session. Drafts target 8–12 passages and 2–3 endings. Local ChatGPT authorization, model discovery, and generation were verified on 2026-10-01; hosted API-key generation remains unverified. Local editing, playing, and export are already implemented. Account, model, usage, and workshop-code controls live on `/settings`; the builder only shows a compact connection status and a Settings link. Creation and review are page content, not dialogs.

## Code ownership

Creation UI, shared generation schema, and draft state live in `src/modules/generation/`.
The thin `/api/generate` route delegates to `src/server/generation/story.ts`;
authorization and provider response handling live in `src/server/auth/` and
`src/server/providers/`. Connection UI/state live in `src/modules/connections/`.
See [system design](SYSTEM_DESIGN.md) and [provider setup](AI_SETUP.md).

Automatic images and music are specified separately in [Graph media design](GRAPH_MEDIA_DESIGN.md)
and remain future work after the module restructuring.

## Implemented MVP flow

1. Describe the premise and choose language and tone. Keep the first release at 8–12 passages and 2–3 endings instead of offering arbitrary scale. Authors can include protagonist, audience, or topics to avoid in the premise.
2. Generate one complete short draft in a single request. Show honest generation/checking states. Do not report invented progress percentages.
3. Validate schema and graph. Check identifiers, start passage, destinations, reachability, terminal endings, and a route to an ending from every reachable passage. Format correctness does not establish narrative quality.
4. On a structural failure, attempt at most one bounded repair using the validation errors. Handle refusal, timeout, and incomplete output explicitly. Do not save partial or invalid content as a playable game.
5. Let the author preview the whole draft, inspect the outline and endings, and choose Keep & edit or Discard. Keeping always creates a new story.
6. Continue with the existing editor and export workflow.

For this short-story MVP, an outline approval step is optional future work. Longer games should use a separate outline and story bible before generating passages in bounded batches.

## Next increment: targeted editing

Add actions to rewrite the selected passage, revise its choices, or create an alternate ending. Send the relevant passage, neighboring passages, and shared story facts. Prose-only rewrites preserve identifiers and destinations. Structural changes are validated against the complete story. Show a before/after preview and retain the prior version for undo before applying anything. Initial generation and targeted editing are separate operations; do not regenerate the full story for every small change.

## Reliability and deployment

Requests flow from the browser to a Next.js server route on Vercel, then to OpenAI. Keep provider credentials in server environment variables. Use a configurable model verified against actual account access and structured-output support; do not promise access based on a model name in an example file.

Private testing can retain the existing workshop code. Add durable per-user quotas, request deduplication, concurrency limits, and usage tracking before public AI access. Bound output size and repair attempts. Preserve current drafts during failures. If measured generation duration becomes unreliable within hosting limits, introduce durable jobs and status polling; do not assume in-memory jobs survive a serverless request.

## Assets and scope

First generate narrative, choice labels, and endings. Retain optional manual image uploads. AI-generated covers and scene images are a later separate step with a shared art brief, preview, regeneration controls, and explicit cost boundaries. Blender, audio, inventory, conditional variables, and free-form AI play remain outside this MVP.

## Acceptance

Test live generation across Chinese and English premises and several genres. Every accepted draft must pass graph checks, allow editing, and produce a playable standalone export. Also test refusal, timeout, malformed output, exhausted provider allowance, duplicate submission, and repair failure. Manually review continuity and whether choices have meaningful consequences; structural validation alone cannot guarantee these qualities.

## Official reference

[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) describes schema-constrained responses and the need to handle refusals and semantic mistakes. The product workflow and limits above are project design proposals.


## Local subscription provider (2026-10-01)

`AI_PROVIDER=chatgpt` selects a local-only OAuth provider. `/api/chatgpt` handles account status, sign-in initiation, model discovery, explicit account selection, the first-use notice, and sign-out. `/api/chatgpt/callback` consumes browser-bound state, exchanges the code with PKCE, validates the ID token with OpenAI JWKS, and rotates the local session. Initial registration uses `dynamic_agent_client`; reauthorization and refresh use the issued client ID. No existing Codex credentials are read or reused.

`/api/generate` uses the selected account's live model catalog and OAuth token with the public Responses API. It defaults to GPT-5.6 Luna (`gpt-5.6-luna`), while honoring an explicit model selection from Settings. The selected or default model must appear in the visible account catalog; an unavailable model produces an actionable error without silently switching models. It requests streaming, `store: false`, and array input, omits unsupported output-token caps, and requires a completed terminal event before parsing a draft. A stream error, incomplete event, or interrupted response fails without saving or switching to API billing. The same draft schema, graph checks, language selection, preview, and single repair apply to both providers. Both retain one 150-second deadline. A one-megabyte stream bound prevents unbounded accumulation but is not a billing/token cap.

Credential files are private, atomic, gitignored, and excluded from deployment tracing. Expiry refresh is serialized by a filesystem lock; unusable refresh tokens are cleared while preserving the account/client mapping. Sign-out revokes the renewable session when possible and always clears tokens locally. The UI reports when revocation was not confirmed. No OpenAI conversation history is requested.

Local development only: explicitly reject production/Vercel and requests whose actual Host is neither `localhost` nor `127.0.0.1` at the request port. Next.js may normalize the internal request URL, so derive the browser origin from the exact allowed Host. Keep the OAuth redirect at `127.0.0.1`, as required by OpenAI. For localhost-initiated sign-in, relay the callback to the stored same-port localhost origin; validate its browser-bound state/cookie there before code exchange and session rotation. Never accept a caller-provided return destination. Mutation requests with a missing or mismatched Origin are rejected before provider calls. Local ChatGPT sign-in, model discovery, and generation require no manual workshop code. Generation still requires the signed-in browser session and plan permission. API-key mode retains its workshop-code check, including during local development.

No subscription-only guarantee can be made by the app itself: the user must disable credit spillover in ChatGPT Settings. Live account eligibility and generation must be verified separately from mocked contract tests.
