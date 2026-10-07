# Dextro System Design

Updated: 2026-10-06

## Architecture and implementation boundary

Dextro is a modular Next.js application for choice-based text adventures. One
story model connects authoring, generation, playback, browser persistence, and
offline export. Graph and Outline are views of the same passages and choices.

The media foundation adds version 2 shared image/audio assets, Graph media,
passage assignments, explicit audio playback, and portable exports. It retains
version 1 reads, existing story routes. The initial OpenAI image adapter, bundled CC0 catalog, media planning, and draft
enrichment are now implemented; live image access remains unverified.

See [Graph media design](GRAPH_MEDIA_DESIGN.md) for the next increment and
[workspace architecture](WORKSPACE_ARCHITECTURE.md) for routing and composition.

## Ownership

| Location | Responsibility and current implementation |
| --- | --- |
| `src/app/` | Routes, layout, global style loading, and HTTP entry points. |
| `src/modules/story/` | Version 2 schema, version 1 reader, branch validation, and sample content. |
| `src/modules/editor/` | Authoring composition, selection, validation, preview, and export actions. |
| `editor/graph/` | React Flow projection, positions, dimensions, and lazy ELK layout. |
| `editor/outline/` | Outline UI and finite traversal of branches, convergence, and loops. |
| `editor/text/` | Controlled passage/choice form using editor callbacks. |
| `editor/media-panel/` | Image/audio assignment, uploads, shared-use information, and credits. |
| `editor/session/` | Immutable commands, grouped undo/redo, and a unified commit hook. |
| `src/modules/media/` | Asset schema, file reading, reference operations, size accounting, and shared audio engine/controls. |
| `src/modules/generation/` | Builder, shared generation schema, draft provider, and review. |
| `src/modules/player/` | Shared React preview/player and choice progression. |
| `src/modules/export/` | Download helpers and standalone HTML template. |
| `src/modules/workspace/` | Saved library, provider composition, shell, route integration. |
| `src/modules/connections/` | Browser-visible readiness, persisted model choices, settings UI. |
| `src/storage/` | Atomic IndexedDB story metadata and media Blob repository. |
| `src/server/auth/` | Same-origin request checks. |
| `src/server/models.ts` | API configuration and allowed model selection. |
| `src/server/generation/` | Authorized inference orchestration, deadlines, validation and repair. |
| `src/shared/ui/` | Generic dialog and original lighthouse artwork. |

## Dependency rules

1. Routes compose modules. Browser modules call HTTP endpoints for authorized
   provider work and never import `src/server/` or Node built-ins.
2. Story and media model code is independent of React, routes, persistence, and
   editor UI. Story validation may use the media module's image-value schema.
3. Graph, Outline, Text, and media controls read the same current story and submit
   changes through the editor session. They do not own competing story copies.
4. A media input may read a file; the editor applies its result after checking
   that the original target still exists.
5. Player reads authored content and owns playback state. It does not own
   generation, account settings, editing history, or persistence.
6. Shared UI is independent of feature state. Server credentials cannot be
   exposed through browser imports or mixed client/server barrels.

ESLint prevents server imports in browser/shared source. Architecture tests walk
imports, re-exports, and literal dynamic imports from client entry points to
check transitive server isolation, and enforce the pure story/media boundary.

## State ownership

| State | Owner | Lifetime |
| --- | --- | --- |
| Saved library, save queue, storage errors | `LibraryProvider` | Workspace lifetime; IndexedDB writes are asynchronous. |
| Readiness, story/image model choices | `ConnectionProvider` | Readiness in memory; model preferences in browser storage, never story content. |
| Brief and unaccepted draft | `GenerationDraftProvider` | Survives internal navigation; reload clears it and warns for a draft. |
| Current edited story, undo/redo | `useEditorSession` | Mounted editor; commits use the supplied library save function. |
| Selection, panels, layout jobs, preview start | `StoryEditor` | Current editing view. |
| Drag and connection gestures | `StoryGraph` | Graph-local presentation state. |
| Expanded outline branches | `StoryOutline` | Outline-local presentation state. |
| Current player passage and steps | `Player` | Player instance. |
| In-flight generation | Builder and server generation service | Bounded cancellable request. |

`WorkspaceProviders` composes the independent providers and remains mounted
across workspace navigation. Settings does not own the library; saving a story
does not modify connection settings. Editor selection does not reset an active
preview. Explicit From selected / From opening actions restart it; Graph shows
the playhead and traversed choices. Closing preview releases its audio.

## Main flows

An edit follows:

`Graph / Outline / Text / Media input → editor command → history → library save queue → IndexedDB`

Layout and viewport remain editor metadata in editable backups. Viewport changes
do not create history entries. Automatic layout checks the current graph and
positions before applying asynchronous results.

Text generation follows:

`Builder → /api/generate → server authorization → provider → validation → review → Keep & edit`

Keep creates a new story. Cancellation prevents late results from replacing the
draft, and leaving the builder cancels its active request. Manual editing and
the sample remain available without a provider. Runtime/duration configuration
remains in the thin API route; orchestration lives under `server/generation/`.

## Media and persistence

Version 2 passages use `media.imageId` and `media.audioId`; an empty audio ID
means Silence. A story has up to 300 immutable asset records with kind, ID, name,
embedded data, source, and credit. Identical uploads reuse a file; replacements
only change the selected passage. Credit edits apply to the shared file.

The in-memory editor holds media strings once per asset. IndexedDB keeps story
metadata in `stories` and file Blobs in `media`, keyed by story and asset ID. The
existing `dextro-studio-v1` database upgrades to schema version 2 without changing
old records. Reading version 1 deduplicates passage images in memory. A save
writes files and metadata in one transaction; failure preserves the old record.
Unchanged files are not rewritten on text edits. Copies own separate stored files.

Unassigned assets remain reusable until Remove unused files. That action is
undoable: session history retains the original bytes and saving an undo restores
them to storage. Deleting a story removes its metadata and files atomically.
Uploads that finish after undo, deletion, or a target-passage edit cannot apply.

The shared 24 MB compact serialized-story limit includes encoded media; uploads
allow 2 MB images and 6 MB audio. Import retains its 25 MB file cap and must pass
the same save limit. Backups bundle used assets once and omit unused library
files. Old app versions cannot read new version 2 backups. Browser persistence
is not cloud backup or synchronization.

## Player and export

Editor preview and the play route share the React player. Offline HTML retains
its independent template; tests check branch behavior, image embedding, and
safe serialization. Exports strip editor layout and unused assets and require
no provider or Next.js connection. JSON backups retain editor layout.

The React player and offline template share the self-contained audio controller.
It continues identical tracks, fades changed
tracks/silence over one second, cancels superseded transitions, and releases audio
on exit. Playback rejection remains visible and does not block story choices.
Audition claims the same document-level audio ownership. Media controls are React
UI; story schemas and asset operations remain independent of React.

The workspace owns a gameplay audio session across client-side navigation.
Library and editor Play actions start the opening track synchronously during
the click; the game route reuses that controller without restarting its track.
Direct game links attempt playback and retain Enable sound when the browser
blocks it. Changing passages or restarting does not override manual mute.
Leaving the game route disposes the session. Preview, audition, and offline HTML
still use explicit sound controls. This does not request or store a browser
permission grant.

## Implementation sequence

1. Structural increment: module relocation, separate providers, extracted editor
   session/forms, unchanged data and behavior, consolidated documentation.
2. Media foundation: shared assets, compatible persistence, Graph controls,
   uploaded music, and portable playback. The CC0 starter catalog is now bundled.
3. Automatic media: verified image provider, shared planning, per-asset jobs and
   candidate review, and graph-linked generation.

See [verification](VERIFICATION.md) for actual checks and their limits. Future
design requirements and historical results do not establish newly completed
provider, deployment, or media behavior.

## Media providers and catalog — 2026-10-06

- `src/server/media/image.ts` owns OpenAI credentials, same-origin checks and model selection,
  request bounds, process-local concurrency/duplicate guards, and image validation.
  `/api/media/image` exposes configuration status and generation independently of
  story generation.
- `src/modules/media/generation/` owns validated scene/music plans, stale-plan
  detection, client requests, per-passage candidates, and incremental enrichment.
- `src/modules/media/catalog/` owns curated metadata, deterministic mood matching,
  local file loading, and preview controls. `public/media/library/` owns distributable
  audio files and source/license evidence. No runtime stock-provider API is used.
- Generated/catalog assets extend version 2 with optional provenance. Existing
  version 1/2 inputs remain readable; storage uses the existing metadata/Blob split.
  Media plans remain in editable backups and are omitted from playable HTML.
- The current audio engine still plays one looping track. Kenney one-shot assets
  are reserved for a later playback increment; they are not music-matching candidates.
