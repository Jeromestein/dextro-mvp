# Dextro Workspace Architecture

## Product direction

The primary experience is building a choice-based game. Opening Dextro should
lead directly to creation, with a clear path into editing, playing, and export.
Account details support that workflow and belong in Settings.

## Routes

| Route | Responsibility |
| --- | --- |
| `/` | Redirect to `/builder`. |
| `/builder` | AI brief or blank-game creation; full-page draft review. |
| `/builder/[storyId]` | Graph/Outline views, text/choice editor, live preview, validation, export. |
| `/library` | Saved games, search, imports, and deletion. |
| `/play/[storyId]` | Focused game playback. The bundled sample uses `sample-last-light`. |
| `/settings` | Provider connection, ChatGPT accounts, model selection, usage links, workshop access. |

The editor and player wait for local storage before resolving a game. An unknown
ID shows recovery guidance instead of silently creating a replacement. URLs are
local workspace addresses, not public links: the game must exist in that browser
at that origin. Playable HTML remains the portable delivery format.

Creation and draft review do not use dialogs. Dialogs remain appropriate for
small actions such as confirming deletion or reviewing validation issues.

## Component boundaries

- The App Router defines destinations and page metadata.
- `WorkspaceShell` owns shared navigation and page-wide storage alerts.
- `WorkspaceProvider` owns browser-local games, the save queue, connection
  readiness, and transient creation state. It stays mounted during internal
  navigation, so opening Settings does not clear the creation brief or review.
- `GameBuilder` owns the creation form, cancellable generation, and draft review.
- `ConnectionSettings` hosts the existing provider/account controls.
- `Studio` adapts the existing library/editor/player to route-specific views.
- `StoryEditor` owns the shared story reducer, selection, session history, inspector,
  and export. `StoryGraph` renders React Flow nodes and derives edges directly from
  choices; `StoryOutline` renders the same model as a finite traversal, using jump
  references for loops and converging paths. Neither view owns a second story.
- `lib/editor.ts` provides immutable edits and ELK layout. Layout is applied only
  when the graph and positions still match the version submitted to ELK.
- The shared story schema, graph validation, player, and export engine remain
  independent of navigation and of the generation provider.

## State and persistence

| State | Lifetime |
| --- | --- |
| Accepted games | Existing IndexedDB store; no migration or ID changes. |
| Pending saves | Shared serialized queue; survives internal route changes. |
| Idea, mood, language, unsaved generated draft | Workspace memory; survives internal navigation, cleared by a full reload. |
| API-mode workshop code and selected model | Workspace memory only; cleared after a full reload. Local ChatGPT mode does not require a workshop code. |
| Selected passage and playback position | Current editor/player instance. |
| Node positions and graph viewport | Optional `editor` metadata in version 1 story JSON; IndexedDB and editable backups. Older backups remain valid. |
| Undo/redo | Up to 50 story changes in the mounted editor. Typing is grouped by field; each completed drag is one change. Viewport changes are saved without entering history. |
| Provider tokens | Existing protected server-side storage; never browser state. |

A generated draft becomes a new saved game only after **Keep & edit**. A tab
close/reload warns about an unsaved generated draft or pending/failed writes.
Leaving the builder cancels an active generation; the UI states this explicitly.
No new persistence is added for secrets. Opening Settings does not change the
configured provider or billing path.

Local ChatGPT sign-in supports `localhost` and `127.0.0.1`. The provider callback
remains IPv4 loopback; localhost attempts return to the initiating localhost
origin before browser-session verification and code exchange. Cookies and game
storage remain separate for these two origins; no silent migration is performed.

## MVP boundaries and next steps

This change keeps Next.js, pnpm, Vercel configuration, existing JSON backups,
and standalone exports. It adds no database, account system, public publishing,
or storage migration. Local ChatGPT testing and hosted API generation retain
their existing environment restrictions.

Graph and Outline now share the existing editor URL. The editor and React Flow
load only when needed; ELK loads when arranging a story. A first-time layout is
generated for stories without saved positions. Manual Auto layout is undoable.
HTML export strips authoring metadata and retains the existing standalone player.
Mobile starts in Outline, with the passage panel below the structure; Graph remains
available. Cloud storage and public game links require separate authorization and
persistence design.
