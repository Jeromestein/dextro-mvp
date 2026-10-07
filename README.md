# Dextro

A choice-based text adventure studio built with Next.js, React, TypeScript, and
pnpm. Authors create branching stories on a Graph/Outline workspace, edit text
and shared scene media, play every path, and export an offline game.

Start with the [documentation index](doc/README.md). The
[system design](doc/SYSTEM_DESIGN.md) defines module ownership;
[project requirements](doc/PROJECT_REQUIREMENTS.md) record confirmed scope.

## Architecture

One story model connects the editor, media, generation, player, and export
modules. Graph and Outline project the same passages and choices. Text and image
edits go through one editor session and undo history. The workspace composes
separate providers for the saved-game library, AI connection, and unsaved draft.

| Module | Responsibility |
| --- | --- |
| Story | Story schema, branch validation, and sample content. |
| Editor | Graph, Outline, text form, media field, edit commands, and undo/redo. |
| Media | Shared image/audio assets, file validation, assignments, credits, and audio playback. |
| Generation | Creation UI, draft state/review, and structured story schema. |
| Player | Shared reading and choice UI for preview and the play route. |
| Export | Editable backup helpers and standalone HTML generation. |
| Workspace / Connections | Library state, shell/routing composition, and separate AI settings. |
| Storage / Server | IndexedDB repository; server-side authorization, providers, and generation. |

Stories now use version 2 with shared image and audio assets. Version 1 stories
and backups remain readable; files move into a separate IndexedDB media store
only after a successful save. Story/editor routes are unchanged.
OpenAI scene images and a bundled Freesound CC0 music catalog now integrate with
Graph/Media and story creation. Image calls require separately billed API access;
configuration and mocked verification do not establish live provider access.
See [Graph media design](doc/GRAPH_MEDIA_DESIGN.md) for remaining target features.

## Run locally

Requirements: Node.js 20.9+ and pnpm 9.7.1 (pinned in `package.json`).

```sh
pnpm install
pnpm dev
```

Open http://localhost:3100. Run the development server from your own terminal for ongoing work. In restricted environments that cannot create native file watchers, use `WATCHPACK_POLLING=true pnpm dev`.

## What works

- A dedicated Game Builder as the default page, with full-page AI generation/review and a blank-game option.
- A story library with search, editable imports, and confirmed deletion. Each editor and player has its own URL.
- A simple Settings page for story and image models, with browser-local preferences and a server-side API key.
- A complete original sample, **The Last Light**, with nine passages and three endings. Playing the sample does not change it; editing creates a personal copy.
- Passage editing, choice labels, destinations, branch convergence, opening selection, and multiple endings.
- Synchronized Graph and Outline views: drag passages, pan and zoom, connect individual choices, and arrange branches automatically. Mobile opens in Outline.
- Session undo/redo for content, connections, deletion, and layout; saved node positions and viewport are included in editable backups.
- Live preview from a selected passage or the opening, plus a mobile-friendly player and restart controls.
- Browser-local IndexedDB persistence with a save indicator and explicit storage failure messages.
- Story / Media / Preview inspector tabs, Graph thumbnails and music labels, and compact media status in Outline.
- Shared PNG, JPEG, or WebP images (up to 2 MB) and MP3, M4A, OGG, WAV, or WebM music (up to 6 MB). Upload, reuse, clear assignments, record credits, and undo media changes.
- Play starts music during the click and carries it into the game. Direct game links try autoplay with an Enable sound fallback; preview and audition remain manual. Volume/mute, same-track continuity, one-second transitions, and Silence per passage are supported.
- Independent edit selection and playhead, with current-node and traversed-choice highlighting.
- Validation for missing content, broken links, unreachable passages, invalid endings, and paths that cannot reach an ending. Broken playable exports are blocked; disconnected passages are warnings.
- Editable `.dextro.json` backups and standalone HTML games with used images, audio, and credits embedded once per asset. The exported game runs without Next.js or an internet connection.
- Optional AI draft generation through a server-only endpoint, with English, Simplified Chinese, or automatic language selection. Play the complete draft and inspect every ending before saving it as a new story.

- Six bundled CC0 music tracks with preview, per-passage assignment, source records, and offline export; three Kenney jingles are reserved for later one-shot playback.
- Optional story media planning: up to four shared scenes, mood-based music matching, incremental draft media, and a read-only Graph in draft review.
- OpenAI scene previews with Apply/Discard, Storybook/Cinematic styles, cancellation, and independent image readiness in Settings. Missing-media recovery preserves existing assignments and skips stale scene plans.

## Workspace navigation

| Page | Purpose |
| --- | --- |
| `/builder` | Default destination: generate a draft or start a blank game. |
| `/builder/[storyId]` | Graph/Outline authoring, passage editing, live preview, validation, and export. |
| `/library` | Find, import, and manage saved games. |
| `/play/[storyId]` | Play one game in a focused reading view. |
| `/settings` | Choose story and image models; view API configuration readiness. |

`/` redirects to `/builder`. Games are browser-local, so editor/player URLs are workspace navigation, not public share links. The brief and unsaved generated draft survive internal navigation to Settings; full reloads clear transient state. See [WORKSPACE_ARCHITECTURE.md](doc/WORKSPACE_ARCHITECTURE.md) for responsibility and state boundaries.

## Storage boundaries

This release is a local workspace, not a cloud account. Drafts are specific to the browser profile and exact origin (including port). They do not sync between devices, browsers, deployments, or tabs. Clearing site data removes drafts. Export editable backups regularly. A playable HTML file is for playing; use the JSON backup to continue editing.

There is no public publishing service, cloud user account system, analytics, payment system, free-form player input, inventory system, or Blender integration. AI generation uses the server environment API key with no sign-in or access code.

## Checks

```sh
pnpm typecheck
pnpm lint
pnpm test
```

Core tests cover all sample endings, broken destinations, loops with and without exits, import validation, and safe offline export. See [the verification record](doc/VERIFICATION.md) for the actual checks performed and their limits.

## Source structure

```text
src/
├── app/                       # Pages, layout, global styles, API entry points
├── modules/
│   ├── story/                 # Schema, validation, sample story
│   ├── editor/
│   │   ├── graph/             # Canvas and automatic layout
│   │   ├── outline/           # Outline UI and traversal
│   │   ├── text/              # Passage and choice form
│   │   ├── media-panel/       # Image/music assignment and library controls
│   │   └── session/           # Commands, history, editing hook
│   ├── media/                 # Asset schema/commands, upload reader, audio engine
│   ├── generation/            # Builder, draft provider/review, schema
│   ├── player/                # Story player
│   ├── export/                # Downloads and standalone HTML
│   ├── workspace/             # Library, provider composition, shell
│   └── connections/           # Browser connection state and settings
├── storage/                   # Browser-local story repository
├── server/
│   ├── auth/                  # Same-origin request checks
│   ├── models.ts              # API defaults and allowed model selections
│   └── generation/            # Authorized story-generation orchestration
└── shared/ui/                 # Generic dialog and original artwork

public/media/demo/             # Placeholder image and four chime samples
public/media/library/          # CC0 music, reserved effects, source/license records
doc/                           # Requirements, design, setup, verification
└── archive/                   # Historical requirements and meeting materials
```

Browser and shared modules must not import `src/server/`. API routes connect
browser requests to server implementations. ESLint and dependency-graph tests
enforce this boundary. Keep providers and credentials out of client imports.

## AI and deployment

Follow [AI setup and deployment](doc/AI_SETUP.md) for environment API-key setup,
model selection, and Vercel configuration. Configuration changes require
a development-server restart. A successful status check alone does not verify a
provider account or a billable generation request.

The UI is English; authors can write Unicode story content, including Chinese.
The lighthouse illustration is original source artwork. Studio fonts have local
fallbacks; exported games use system fonts and make no external requests.
