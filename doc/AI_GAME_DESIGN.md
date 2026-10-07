# AI-Assisted Game Creation

Status: initial generation workflow implementation authorized on 2026-10-01. Code, simulated behavior, and live ChatGPT plan generation verified; the separately billed API-key path has only mocked verification. Targeted editing and later asset generation remain proposals.

## Product goal

An author describes an idea and receives a complete, editable choice-based text adventure. AI creates story content and branch connections; the existing player renders the game. All choices are authored before play, so playing and standalone exports require no AI requests.

## Existing foundation

The dedicated `/builder` page accepts a premise, mood, and language, provides a complete playable preview with passage/ending selection, and saves an accepted draft as a new story. Structural failures get at most one repair within a shared deadline. Cancellation prevents late results from replacing a newer draft. The server uses the OpenAI Responses API with strict structured output, same-origin request checks, and graph validation. The server environment supplies the API key; no sign-in or access code is required. Drafts target 8–12 passages and 2–3 endings. Local ChatGPT authorization, model discovery, and generation were verified on 2026-10-01; hosted API-key generation remains unverified. Local editing, playing, and export are already implemented. Story and image model selectors live on `/settings`; the builder only shows a compact connection status and a Settings link. Creation and review are page content, not dialogs.

## Code ownership

Cloud mode changes draft retention and execution: the same endpoint persists a
job, archives provider output, and saves a completed draft before review. Keep
opens that saved story; leaving the page only stops polling and future optional
media submissions. See [cloud implementation and next work](CLOUD_STORAGE_DESIGN.md)
for recovery guarantees and verification limits. Local request behavior remains
as described above. Earlier ChatGPT verification is historical; that integration
has been removed.

Creation UI, shared generation schema, and draft state live in `src/modules/generation/`.
The thin `/api/generate` route delegates to `src/server/generation/story.ts`;
origin checks live in `src/server/auth/`, and allowed model selection lives in
`src/server/models.ts`. Connection UI/state live in `src/modules/connections/`.
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

The current studio deliberately permits generation without an access code. Add durable per-user quotas, request deduplication, concurrency limits, and usage tracking before public AI access. Bound output size and repair attempts. Preserve current drafts during failures. If measured generation duration becomes unreliable within hosting limits, introduce durable jobs and status polling; do not assume in-memory jobs survive a serverless request.

## Assets and scope

First generate narrative, choice labels, and endings. Retain optional manual image uploads. AI-generated covers and scene images are a later separate step with a shared art brief, preview, regeneration controls, and explicit cost boundaries. Manual image/audio assets and playback are implemented in the media foundation. AI music composition, Blender, inventory, conditional variables, and free-form AI play remain outside this MVP.

## Acceptance

Test live generation across Chinese and English premises and several genres. Every accepted draft must pass graph checks, allow editing, and produce a playable standalone export. Also test refusal, timeout, malformed output, exhausted provider allowance, duplicate submission, and repair failure. Manually review continuity and whether choices have meaningful consequences; structural validation alone cannot guarantee these qualities.

## Official reference

[OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) describes schema-constrained responses and the need to handle refusals and semantic mistakes. The product workflow and limits above are project design proposals.


## Provider simplification (2026-10-06)

The local ChatGPT/OpenID integration has been removed. Both story and image
requests now use the environment API key without an access code. Settings
contains two model selectors; choices persist in this browser. The server keeps
same-origin validation, bounded requests, deadlines, structural checks, and the
single repair limit. Historical ChatGPT verification remains in VERIFICATION.md.
