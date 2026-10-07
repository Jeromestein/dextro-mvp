# Dextro Workspace Architecture

Updated: 2026-10-07. This document describes the implemented local workspace and
optional internal cloud adapter. See [system design](SYSTEM_DESIGN.md) for dependency rules
and [Graph media design](GRAPH_MEDIA_DESIGN.md) for current media scope and planned generation.

## Routes

| Route | Responsibility |
| --- | --- |
| `/` | Redirect to `/builder`. |
| `/builder` | AI brief or blank-game creation; full-page draft review. |
| `/builder/[storyId]` | Graph/Outline authoring, text/media editing, preview, validation, export. |
| `/library` | Find, import, copy, and manage saved games. |
| `/play/[storyId]` | Focused story playback; `sample-last-light` is the bundled sample. |
| `/settings` | Story and image model selection. |

Editor and player wait for storage readiness, then load the requested story and
its verified media. Unknown IDs and load failures show recovery guidance. These
routes identify games in the active local or private cloud workspace, not public
share links. Creation and draft review use page content.

## Composition and providers

The workspace layout mounts `modules/workspace/providers.tsx` and `shell.tsx`.
Providers stay mounted during internal navigation, with separate ownership:

- `LibraryProvider`: storage-mode readiness, story summaries, lazy story loading,
  serialized saves, deletion, errors and pending/failed-save unload protection.
  Cloud mode adds a durable recovery outbox, retry, conflict recovery as a new
  game, and explicit copying of existing browser-local games.
- `ConnectionProvider`: readiness, story/image model preferences, and refresh on focus.
  Preferences persist in browser storage; the API key remains server-side.
- `GenerationDraftProvider`: creation brief, review draft and unload protection.
  The builder aborts its local request or cloud polling on unmount. Submitted
  cloud jobs continue independently; completed drafts are already saved.
- `GameplayAudioProvider`: audio started by Play, retained through navigation
  into that game and released when leaving its route. Preview and audition keep
  their own mounted controllers and share exclusive audio ownership.

`modules/workspace/studio.tsx` composes library/editor/player routing and loads
the editor on demand. `modules/connections/settings.tsx` consumes connection
state. `modules/generation/game-builder.tsx` coordinates library, connection,
and draft state explicitly when creating or keeping a story.

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
| Saved games | Local: IndexedDB `dextro-studio-v1`, schema version 2. Cloud: owned PostgreSQL documents/revisions and private media objects. |
| Pending saves | Serialized queue; cloud outbox also survives reload in owner/project-scoped IndexedDB. Conflicts retain local changes. |
| Brief and draft review | Workspace memory; cleared on reload. Completed cloud-generated drafts remain in My Games. |
| Model selection | Browser-local preferences, restored on reload. No workshop code. |
| Graph positions and viewport | Optional `editor` metadata and JSON backups. |
| Selection and undo/redo | Mounted editor session. |
| Playback position | Player instance, independent of editor selection; highlighted on Graph. |
| Provider/storage secrets | Server environment only, never browser or story state. |

In local mode, Keep creates a new story and saves metadata/files atomically in
IndexedDB. Cloud Keep opens the already saved draft; story saves use revision
checks and atomic database snapshots after asset verification. The media reader
accepts version 1 backups, while new portable backups use version 2.

Local games do not sync between origins/devices/profiles. Copy local games is an
explicit operation that retains the source records. Cloud records are available
through the configured internal owner on local and deployed hosts without a
sign-in gate. All visitors share that owner; per-person isolation and live hosted
execution are not verified. Cloud lists
refresh on load/explicit actions; no realtime editor collaboration is implemented.

## Provider and delivery boundaries

In local mode, `/api/generate` delegates to `server/generation/story.ts` and
`/api/media/image` to the server image adapter. In cloud mode, both persist jobs
and return a job ID; the client polls owner-scoped job routes. Both modes use
the environment API key and same-origin checks without
sign-in or an access code. `server/models.ts` validates requested models against
the offered list, including environment defaults. Browser modules use HTTP and
never import server credentials or implementation files.

Saved media and generation history are cloud-only views. Storage failure is
visible and does not silently switch to a browser-local workspace. Local recovery
copies remain accessible when a known cloud scope is temporarily unavailable.

The React player is shared by preview and the play route. Offline exports retain
the self-contained HTML player. See [AI setup](AI_SETUP.md) for configuration and
[verification](VERIFICATION.md) for checks and their limits.
