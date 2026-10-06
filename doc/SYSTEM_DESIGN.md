# Dextro System Design

Updated: 2026-10-06

## Architecture and implementation boundary

Dextro is a modular Next.js application for choice-based text adventures. One
story model connects authoring, generation, playback, browser persistence, and
offline export. Graph and Outline are views of the same passages and choices.

The structural increment separates module responsibilities and state providers.
It retains version 1 story JSON, the existing IndexedDB database, URLs, local
storage, generation contracts, and authorization. It does not implement audio,
automatic images, shared asset IDs, or a storage migration.

See [Graph media design](GRAPH_MEDIA_DESIGN.md) for the next increment and
[workspace architecture](WORKSPACE_ARCHITECTURE.md) for routing and composition.

## Ownership

| Location | Responsibility and current implementation |
| --- | --- |
| `src/app/` | Routes, layout, global style loading, and HTTP entry points. |
| `src/modules/story/` | Version 1 schema, branch validation, and sample content. |
| `src/modules/editor/` | Authoring composition, selection, validation, preview, and export actions. |
| `editor/graph/` | React Flow projection, positions, dimensions, and lazy ELK layout. |
| `editor/outline/` | Outline UI and finite traversal of branches, convergence, and loops. |
| `editor/text/` | Controlled passage/choice form using editor callbacks. |
| `editor/media-panel/` | Image input; assignment changes go through the editor session. |
| `editor/session/` | Immutable commands, grouped undo/redo, and a unified commit hook. |
| `src/modules/media/images/` | Image-value schema, uploaded-file validation and reading. |
| `src/modules/generation/` | Builder, shared generation schema, draft provider, and review. |
| `src/modules/player/` | Shared React preview/player and choice progression. |
| `src/modules/export/` | Download helpers and standalone HTML template. |
| `src/modules/workspace/` | Saved library, provider composition, shell, route integration. |
| `src/modules/connections/` | Browser-visible provider readiness, model/access state, settings UI. |
| `src/storage/` | Existing IndexedDB story repository. |
| `src/server/auth/` | OAuth credentials, origin/workshop checks, session cancellation. |
| `src/server/providers/` | Provider model and streaming-response handling. |
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
| Readiness, selected model, workshop code | `ConnectionProvider` | Workspace memory, never story content. |
| Brief and unaccepted draft | `GenerationDraftProvider` | Survives internal navigation; reload clears it and warns for a draft. |
| Current edited story, undo/redo | `useEditorSession` | Mounted editor; commits use the supplied library save function. |
| Selection, panels, layout jobs, preview start | `StoryEditor` | Current editing view. |
| Drag and connection gestures | `StoryGraph` | Graph-local presentation state. |
| Expanded outline branches | `StoryOutline` | Outline-local presentation state. |
| Current player passage and steps | `Player` | Player instance. |
| In-flight generation | Builder and server generation service | Bounded cancellable request. |

`WorkspaceProviders` composes the independent providers and remains mounted
across workspace navigation. Settings does not own the library; saving a story
does not modify connection settings. The existing preview still restarts when
selection changes. Independent editor/playhead state and graph path highlighting
remain part of the proposed media increment.

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

## Media and persistence evolution

Media currently owns embedded-image validation and upload reading. Music,
catalog search, automatic images, and shared asset records will be added here
when implemented; empty placeholder modules are not required now.

The next editing representation uses stable asset IDs in passages, an asset
catalog for metadata, and separate IndexedDB media bytes. Editing text should
not copy audio bytes. Persist story references and assets consistently, retain
assets needed by undo, and preserve files still used by another passage.

Editable backups and playable HTML will bundle required bytes for portability.
This distinguishes editing storage from the self-contained export format. A
compatibility reader and explicit migration must precede version 2 writes.

Until then, database/store names, version 1 files, the 24 MB serialized-save
limit, and the 25 MB import limit remain unchanged. Browser persistence is not
cloud backup or synchronization.

## Player and export

Editor preview and the play route share the React player. Offline HTML retains
its independent template; tests check branch behavior, image embedding, and
safe serialization. Exports strip editor layout and require no provider or
Next.js connection.

The media increment should share media resolution and audio-transition rules
across both delivery surfaces. Same-track continuation, crossfades, silence,
autoplay rejection, and offline audio require explicit acceptance checks.

## Implementation sequence

1. Structural increment: module relocation, separate providers, extracted editor
   session/forms, unchanged data and behavior, consolidated documentation.
2. Media increment: shared asset records and compatible persistence, followed
   by graph media controls and curated music playback.
3. Automatic media: verified image provider, shared planning, per-asset jobs and
   candidate review, and graph-linked generation.

See [verification](VERIFICATION.md) for actual checks and their limits. Future
design requirements and historical results do not establish newly completed
provider, deployment, or media behavior.
