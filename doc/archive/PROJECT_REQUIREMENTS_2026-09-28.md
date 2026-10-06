> Historical requirements snapshot from 2026-09-28. See [current requirements](../PROJECT_REQUIREMENTS.md) for subsequent decisions.

# Project Requirements and Decisions

Last updated: 2026-09-28

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

The initial implementation is in [dextro-mvp](../../README.md). See its [verification record](../VERIFICATION.md) for tested behavior and limits.

The editor uses a shared story model and player, local browser drafts, uploaded static scene images, JSON backups, and standalone HTML delivery. Multiple endings and replay are included; saved player progress is deferred. A nine-passage original sample demonstrates the workflow. These are implementation choices for the first review, not a claim that every product detail has been separately approved.

Still open:

- Feedback on the initial authoring experience and visual direction.
- AI model access, credentials, generation budget, and public access policy.
- Repository ownership, Vercel project/domain, and launch timing.
- Whether a later release needs cloud accounts, hosted story links, or cross-device saves.

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

## Existing Project Materials

- [Meeting Script for Ryan](Meeting%20Script%20for%20Ryan.md)
- [Ryan Meeting Decision Checklist](Ryan%20Meeting%20Decision%20Checklist.md)
- [Dextro prototype](../../../dextro-July%2011.html)
- [Spending Spree reference](../../../spending-spree%20v%20AS1.html)

The meeting documents contain earlier proposals and an unfilled decision checklist. Where they conflict with the confirmed decisions above, use this document's confirmed scope. Prototype interfaces are evidence of concepts, not proof of completed production features.
