# Dextro Workspace Architecture

Updated: 2026-10-06. This document describes the implemented workspace after the
module restructuring. See [system design](SYSTEM_DESIGN.md) for dependency rules
and [Graph media design](GRAPH_MEDIA_DESIGN.md) for current media scope and planned generation.

## Routes

| Route | Responsibility |
| --- | --- |
| `/` | Redirect to `/builder`. |
| `/builder` | AI brief or blank-game creation; full-page draft review. |
| `/builder/[storyId]` | Graph/Outline authoring, text/media editing, preview, validation, export. |
| `/library` | Find, import, copy, and manage saved games. |
| `/play/[storyId]` | Focused story playback; `sample-last-light` is the bundled sample. |
| `/settings` | ChatGPT account/model selection or API workshop access. |

Editor and player wait for local storage before resolving a story ID. Unknown
IDs show recovery guidance. These routes refer to games in the current browser;
they are not public share links. Creation and draft review use page content.

## Composition and providers

The workspace layout mounts `modules/workspace/providers.tsx` and `shell.tsx`.
Providers stay mounted during internal navigation, with separate ownership:

- `LibraryProvider`: saved stories, initial loading, serialized saves, deletion,
  errors, and pending/failed-save unload protection.
- `ConnectionProvider`: readiness, provider mode, model, workshop code, and
  refresh on focus. Actual credentials remain server-side.
- `GenerationDraftProvider`: creation brief, unsaved draft, and draft unload
  protection. The builder owns its active request and cancels it on unmount.

`modules/workspace/studio.tsx` composes library/editor/player routing and loads
the editor on demand. `modules/connections/settings.tsx` consumes connection
state. `modules/generation/game-builder.tsx` coordinates the three providers
explicitly when creating or keeping a story.

## Editor composition

`modules/editor/story-editor.tsx` coordinates selection, Graph/Outline switching,
inspector, layout jobs, validation, preview, and export controls.

- `session/use-editor-session.ts` owns the current story reference, reducer,
  history, and commit-to-save path.
- `session/operations.ts` defines immutable passage and choice mutations.
- `session/history.ts` provides grouped typing, undo/redo, and viewport
  preservation. Up to 50 edit snapshots are retained in the mounted editor.
- `graph/story-graph.tsx` displays nodes and connections. `graph/layout.ts` owns
  positions, dimensions, layout signatures, and lazy ELK layout.
- `outline/model.ts` derives finite traversal with convergence/loop references;
  `outline/story-outline.tsx` displays it.
- `text/passage-form.tsx` edits narrative and choices through callbacks.
- `media-panel/passage-media.tsx` assigns shared files, uploads images/audio,
  displays shared use, and edits credits through the same history. Reusable asset
  operations and audio controls live in `modules/media/`.

Every view receives the same current story. Edits share one history; viewport
updates are saved without entering it. Asynchronous layout results apply only
when graph structure and manual positions still match the submitted version.

Mobile opens in Outline, with the passage panel below the structure. Graph is
also available. The inspector has Story, Media, and Preview tabs. Graph adds
fixed-size thumbnails and music labels; hiding images keeps structural overview.
File completion does not move manually positioned nodes.

## State and persistence

| State | Lifetime |
| --- | --- |
| Accepted games | Existing IndexedDB `dextro-studio-v1` database; schema version 2 with `stories` metadata and `media` Blobs. |
| Pending saves | Shared serialized queue across workspace navigation. |
| Brief and unaccepted draft | Workspace memory; cleared on reload. |
| Workshop code and model selection | Workspace memory; cleared on reload. |
| Graph positions and viewport | Optional `editor` metadata and JSON backups. |
| Selection and undo/redo | Mounted editor session. |
| Playback position | Player instance, independent of editor selection; highlighted on Graph. |
| Provider tokens | Protected local server storage, never story state. |

Keep creates a new story. Storage and provider failures are explicit. The
media reader accepts version 1 backups, while new writes use version 2. Saves
atomically persist metadata and changed files. Games do not migrate between
origins, devices, profiles, or tabs.

## Provider and delivery boundaries

`/api/generate` delegates to `server/generation/story.ts` and retains its Node
runtime and duration configuration. OAuth endpoints use `server/auth/` and
`server/providers/`. Browser modules use HTTP rather than importing these files.

Local ChatGPT keeps development-only, loopback, same-origin and session checks;
API-key mode retains workshop access. The callback continues to use IPv4 loopback
and relay localhost attempts to their initiating origin. Configuration and
billing paths are unchanged.

The React player is shared by preview and the play route. Offline exports retain
the self-contained HTML player. See [AI setup](AI_SETUP.md) for configuration and
[verification](VERIFICATION.md) for checks and their limits.
