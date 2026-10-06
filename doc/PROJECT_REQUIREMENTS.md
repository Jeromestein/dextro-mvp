# Project Requirements and Decisions

Last updated: 2026-10-06

This document records confirmed requirements from project discussions. Proposals and open questions are listed separately and must not be treated as approved scope. Update this document as further decisions are confirmed.

## Confirmed Scope

### Game type: choice-based text adventure

- The current scope is limited to choice-based text adventure games.
- Players read narrative text and choose from predefined options to progress through the story.
- Choices lead to authored story branches and outcomes.
- Text is the primary storytelling medium.

The following interaction models are outside the current scope:

- Parser-based adventures where players type commands such as "open door."
- Open-ended adventures where players freely describe actions and AI improvises the next events during play.

This restriction concerns how players interact with a game. It does not decide whether authors may use AI to write or revise stories during creation.

### Role of Spending Spree

Spending Spree is not the target game type or required gameplay template. The earlier meeting proposal to begin with a Spending Spree-style simulation is superseded by the confirmed choice-based text adventure scope. Its interface and presentation may still be considered as references, but are not an agreed quality target.

### Current priority and asset boundary

- Prioritize an MVP before expanding the platform.
- Do not use Blender at this stage. It is not an MVP dependency.
- Start implementation in a new `dextro-mvp` project folder, using Next.js and pnpm, with Vercel as the deployment target.
- The implementation below is the initial MVP baseline; AI credentials, paid usage, and production deployment remain unconfigured.

## Initial MVP Implementation Baseline

The original list-only editor baseline below is superseded by the confirmed
2026-10-06 authoring update: provide both Graph and Outline, with passage dragging,
canvas pan/zoom, and choice connections. The implementation also includes automatic
layout, session undo/redo, a shared passage inspector/preview, and browser-local
layout persistence. Cloud collaboration and publishing remain outside this scope.

### Outcome

An author can create a short choice-based text adventure, edit its branches, play it from beginning to ending, and export a playable version for another person. Include one complete sample story to demonstrate the full workflow.

### Three main screens

1. **My Stories:** create a story, open a saved draft, or try the sample story. Show a small collection of story cards rather than a public discovery feed.
2. **Story Editor:** a passage list on the left, passage text and choices in the center, and a live player preview on the right. Each choice links to a new or existing passage. Authors designate the opening and endings. Start with list-based editing; defer a freely draggable graph canvas.
3. **Player:** an optional scene image, readable narrative text, and prominent choice buttons. Include restart and ending states. Prioritize mobile reading; use desktop as the initial authoring target.

### First-release features

- Create, rename, edit, and delete stories with clear confirmation for destructive deletion.
- Edit passage titles, narrative text, choices, and destinations; support multiple endings and converging branches.
- Preview from the opening or the selected passage.
- Save drafts locally in the current browser; explain that this is not cloud backup or cross-device sync.
- Export and import an editable story file for backup, and export a standalone playable HTML file with required images included.
- Validate missing destinations, unreachable passages, and whether a route to an ending exists. Block broken playable exports and distinguish structural checks from narrative quality review.
- Allow optional uploaded scene images, with a clean text-only fallback. Use one consistent player layout.

### Optional AI assistance

Offer a bounded authoring action: generate a short draft from a theme, tone, and premise, then let the author review and edit it. A possible sample target is 8–12 passages and 2–3 endings; the draft endpoint validates this range.

AI operates during authoring, not during play. Story text and choice destinations are saved before the player starts. Revisions to existing content require a review step before replacing the author's work. Manual creation and editing remain available if AI generation fails.

The initial implementation includes an optional server-side OpenAI Responses API adapter and a private workshop access code. Credentials, live model access, and production usage quotas remain open; no live AI generation has been verified. A shared player should interpret structured story content; generating a separate codebase for every story is not proposed for this MVP.

### Visual direction

Use a restrained editorial style: warm off-white reading surfaces, dark legible text, one accent color, generous spacing, and optional landscape illustrations. Keep the authoring interface compact and functional. Illustrations should support the narrative without competing with the text. This visual direction is implemented for review.

### Deferred features

Public discovery and social feeds, follows and likes, analytics, payments, cloud accounts and synchronization, hosted publishing, advanced canvas layout, inventory and statistics systems, conditional choices, audio generation, automatic image generation, 3D, and Blender.

### Acceptance workflow

Create a new story, add a branch and two endings, edit a choice destination, reload the page to verify draft persistence, and finish each route in the player. Export and reopen the playable HTML on desktop and mobile. If AI authoring is included, verify that its output passes the same structural checks and can be edited without losing existing content.

## Implementation and Remaining Decisions

The initial implementation is in [dextro-mvp](../README.md). See its [verification record](VERIFICATION.md) for tested behavior and limits.

The editor uses a shared story model and player, local browser drafts, uploaded static scene images, JSON backups, and standalone HTML delivery. Multiple endings and replay are included; saved player progress is deferred. A nine-passage original sample demonstrates the workflow. These are implementation choices for the first review, not a claim that every product detail has been separately approved.

Still open:

- Feedback on the initial authoring experience and visual direction.
- AI model access, credentials, generation budget, and public access policy.
- Repository ownership, Vercel project/domain, and launch timing.
- Whether a later release needs cloud accounts, hosted story links, or cross-device saves.

## AI Generation Design Discussion

The user requested a design for automatic game generation using the OpenAI API. [AI_GAME_DESIGN.md](AI_GAME_DESIGN.md) records the proposed workflow, the existing foundation, and future additions. On 2026-10-01 the user authorized starting the initial generation workflow implementation. Language selection, complete draft preview, bounded repair, and cancellation are implemented. Live ChatGPT plan generation was verified on 2026-10-01; the separately billed API-key path has only mocked verification. Targeted rewriting and image generation remain future work.

## Reference Games — For Evaluation Only

- [Choice of Robots](https://www.choiceofgames.com/robots/): text and choice-driven branching.
- [Lifeline](https://www.3minute.games/press-kit): conversational presentation and mobile reading experience.
- [80 Days](https://www.inklestudios.com/80days/): richer presentation and replayable narrative choices.

These examples were discussed as possible references; none has been selected as a mandatory product benchmark.

## Decision Log

| Date | Confirmed decision | Source |
| --- | --- | --- |
| 2026-09-24 | The game type is text adventure. | User clarification in the project discussion. |
| 2026-09-24 | The current scope is limited to choice-based interaction. | User instruction to record the scope in a Markdown document. |
| 2026-09-28 | Do not use Blender at this stage; prioritize an MVP. | User instruction in the project discussion. |
| 2026-09-28 | Create a new project folder and begin implementation; use Next.js, pnpm, and Vercel as deployment target. | User approval to start. |
| 2026-10-01 | Implement the initial AI generation workflow using a server-side OpenAI connection. | User instruction to begin after reviewing the design. |
| 2026-10-06 | Use the OpenAI API for scene images and Kenney/Freesound CC0 assets for audio. | User selection following media-source research. |

## Decision: image and audio sources (2026-10-06)

- Use the OpenAI API for scene-image generation. This is a separately billed
  image integration and does not change the existing text-provider selection.
- Source the curated audio library from Kenney and Freesound, accepting CC0 assets
  only. Record each asset's source and license before bundling or exporting it.
- Integrate generated images and matched audio into the existing Graph/Media
  workflow. Keep common scenes and tracks reusable across passages.
- The initial OpenAI adapter and six-track CC0 catalog are implemented with
  local mocked verification. Live image access and playback support for separate
  ambience/effects remain pending.
  See [Graph media design](GRAPH_MEDIA_DESIGN.md) for implementation boundaries.

## Existing Project Materials

- [Meeting Script for Ryan](archive/Meeting%20Script%20for%20Ryan.md) (historical proposal)
- [Ryan Meeting Decision Checklist](archive/Ryan%20Meeting%20Decision%20Checklist.md) (unfilled historical checklist)
- dextro-July 11.html (parent workspace reference; not included in this repository)
- spending-spree v AS1.html (parent workspace reference; not included in this repository)

The meeting documents contain earlier proposals and an unfilled decision checklist. Where they conflict with the confirmed decisions above, use this document's confirmed scope. Prototype interfaces are evidence of concepts, not proof of completed production features.


## Decision: local ChatGPT plan integration (2026-10-01)

- The user requested testing with existing ChatGPT/Codex subscription usage before buying API credit.
- Add official Sign in with ChatGPT for the local studio, with optional ChatGPT plan permission for eligible Plus/Pro accounts.
- Retain API-key generation as a separate explicit mode; never switch billing paths automatically.
- Require the workshop code, local loopback origin, verified OAuth identity, and granted plan-use scope before inference.
- Show active account, model discovery, plan-use notice, Manage usage, account switching, and sign-out.
- Tokens stay in protected local server storage; stories remain browser-local. ChatGPT identity is not a cloud Dextro account.
- The user must disable credit spillover in ChatGPT usage settings to guarantee subscription-only spending.
- Local integration does not establish permission to operate a remotely hosted or paid Vercel application with plan usage.
- ChatGPT login, plan-use consent, and live model discovery were verified in Chrome on 2026-10-01. Live GPT-6-Astra generation of an 8-passage, 3-ending Chinese adventure was also verified; see VERIFICATION.md.

## Decision: retain local subscription testing (2026-10-02)

- The user reversed the removal request and asked to restore Sign in with ChatGPT for local testing.
- Restore the implementation from commit `8dcbcd1`; keep the local provider separate from API-key billing and hosted deployment.
- Existing eligible subscription allowance can fund local tests. This consumes shared plan usage; users must disable credit spillover if they want no additional credit charges.
- The previously deleted local credentials cannot be restored from Git. A fresh sign-in is required.

## Decision: make Game Builder the primary workspace (2026-10-02)

- The user requested a substantial interface cleanup and a clearer site architecture.
- Open directly into a dedicated Game Builder page. Creation and generated-draft review must not be modal dialogs.
- Move ChatGPT account information, model selection, usage links, and workshop access into a separate Settings page. Keep local subscription testing available.
- Give game editing, the saved-game library, and playing their own routes with normal browser navigation.
- Preserve existing browser-local stories and editor/export capabilities. Do not introduce cloud accounts or storage migration as part of this redesign.
- Use a compact navigation bar, a focused creation form, and responsive editor layouts. See [WORKSPACE_ARCHITECTURE.md](WORKSPACE_ARCHITECTURE.md).

## Decision: remove manual access-code entry for local ChatGPT (2026-10-02)

- The user requested removing the repeated step of copying `AI_ACCESS_CODE` from `.env.local`.
- Local ChatGPT mode offers direct **Continue with ChatGPT** sign-in and does not require this code for account actions or generation.
- Preserve strict IPv4 loopback, development-only, same-origin, OAuth/session, and plan-permission checks. Never expose the environment code to the browser or store it there automatically.
- API-key mode retains the workshop access code, including hosted deployments.

## Decision: support localhost for local ChatGPT (2026-10-02)

- The user prefers `localhost`; support it alongside `127.0.0.1` for sign-in, settings, and generation.
- OpenAI's authorization redirect must remain IPv4 loopback. Relay localhost attempts back to their initiating browser origin before verifying state/cookie and completing the exchange; retain the same registered redirect URI in that exchange.
- Preserve strict same-origin and port checks, development-only access, one-time state, PKCE, session rotation, and host-only cookies.
- Existing games are not migrated between localhost and IPv4 origins; JSON export/import remains available.

## Default model — 2026-10-02

- Default local ChatGPT game generation to GPT-5.6 Luna (`gpt-5.6-luna`).
- Keep manual model selection in Settings. Loading the catalog must preserve the current choice.
- Verify account availability before inference; prompt for another selection if Luna is unavailable.


## Decision: modular structure and documentation (2026-10-06)

The user approved organizing the application around Story, Editor (Graph,
Outline, Text, and Media panel), Media, Generation, Player, Export, Storage, and
server integrations. The source now follows these responsibilities; browser
library state, AI connection state, and unsaved generation drafts have separate
providers. Existing routes and version 1 browser-local stories remain compatible.

Project documentation is consolidated under `doc/`, with historical discussions
under `doc/archive/`. See [system design](SYSTEM_DESIGN.md) for current ownership
and [Graph media design](GRAPH_MEDIA_DESIGN.md) for the proposed image/music
increment. This refactor does not implement automatic image generation, music
playback, cloud storage, or the proposed version 2 asset format.


## Media foundation — 2026-10-06

The user authorized implementation of the media module. The delivered foundation
supports shared image/audio assets, Graph thumbnails/music labels, a Media
inspector, upload/reuse/credits, undo/redo, and explicit background playback.
Editor selection and preview progress are independent. Music continues across
passages that reference the same file; Silence is an explicit assignment.

New stories and backups use version 2. Existing version 1 stories remain readable;
successful saves atomically migrate metadata and media files in browser storage.
Used assets and credits are bundled into backups and standalone HTML. Automatic
image generation, licensed catalog matching, and unified media creation remain
subsequent work. See the verification record for tested behavior and limits.
