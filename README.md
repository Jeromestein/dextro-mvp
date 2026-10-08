# Dextro

A choice-based text adventure studio built with Next.js, React, TypeScript, and
pnpm. Authors create branching stories on a Graph workspace, edit text
and shared scene media, play every path, and export an offline game.

Start with the [documentation index](doc/README.md). The
[system design](doc/SYSTEM_DESIGN.md) defines module ownership;
[project requirements](doc/PROJECT_REQUIREMENTS.md) record confirmed scope.

## Architecture

One story model connects the editor, media, generation, player, and export
modules. The graph renders the story's passages and choices. Text and image
edits go through one editor session and undo history. The workspace composes
separate providers for the saved-game library, AI connection, and unsaved draft.

| Module | Responsibility |
| --- | --- |
| Story | Story schema, branch validation, and sample content. |
| Editor | Graph, text form, media field, edit commands, and undo/redo. |
| Media | Shared image/audio assets, file validation, assignments, credits, and audio playback. |
| Generation | Creation UI, draft state/review, and structured story schema. |
| Player | Shared reading and choice UI for preview and the play route. |
| Export | Editable backup helpers and standalone HTML generation. |
| Workspace / Connections | Library state, shell/routing composition, and separate AI settings. |
| Storage / Server | Browser-local or private Supabase repositories, recovery outbox, owned media and persistent generation jobs. |

Stories now use version 2 with shared image and audio assets. Version 1 stories
and backups remain readable; files move into a separate IndexedDB media store
only after a successful save. Story/editor routes are unchanged.
OpenAI scene images and a Supabase-hosted Freesound CC0 music catalog now integrate with
Graph/Media and story creation. Image calls require separately billed API access;
configuration and mocked verification do not establish live provider access.
See [Graph media design](doc/GRAPH_MEDIA_DESIGN.md) for remaining target features.

## Run locally

Requirements: Node.js 22+ and pnpm 9.7.1 (pinned in `package.json`). The Supabase client requires Node.js 22 or later.

```sh
pnpm install
pnpm dev
```

Open http://localhost:3100. Run the development server from your own terminal for ongoing work. In restricted environments that cannot create native file watchers, use `WATCHPACK_POLLING=true pnpm dev`.

## What works

- A dedicated Game Builder as the default page, with full-page AI generation/review and a blank-game option.
- A story library with search, editable imports, and confirmed deletion. Each editor and player has its own URL.
- Story cards automatically use the opening passage's image as their cover, following `startId` and falling back to the text cover when no image is available. Library previews load opening images only; full media loads when a story is opened.
- A simple Settings page for story and image models, with browser-local preferences and a server-side API key.
- The shared workspace uses **The Lemonade Sky Festival** and **The Letter from Tomorrow** as example stories, with their existing media and publication state. The builder links to the library; examples are saved workspace stories, not bundled defaults.
- Passage editing, choice labels, destinations, branch convergence, opening selection, and multiple endings.
- A single Graph workspace on desktop and mobile: drag passages, pan and zoom, connect individual choices, and automatically arrange new stories.
- Session undo/redo for content, connections, deletion, and layout; saved node positions and viewport are included in editable backups.
- Live preview from a selected passage or the opening, plus a mobile-friendly player and restart controls.
- Browser-local IndexedDB persistence with a save indicator and explicit storage failure messages.
- Story / Media / Preview inspector tabs, Graph thumbnails and music labels, and a full-screen passage editor on mobile.
- Shared PNG, JPEG, or WebP images (up to 2 MB) and MP3, M4A, OGG, WAV, or WebM music (up to 6 MB). Upload, reuse, clear assignments, record credits, and undo media changes.
- Play starts music during the click and carries it into the game. Direct game links try autoplay with an Enable sound fallback; preview and audition remain manual. Volume/mute, same-track continuity, one-second transitions, and Silence per passage are supported.
- Independent edit selection and playhead, with current-node and traversed-choice highlighting.
- Validation for missing content, broken links, unreachable passages, invalid endings, and paths that cannot reach an ending. Broken playable exports are blocked; disconnected passages are warnings.
- Editable `.dextro.json` backups and standalone HTML games with used images, audio, and credits embedded once per asset. The exported game runs without Next.js or an internet connection.
- Optional AI draft generation through a server-only endpoint, with English, Simplified Chinese, or automatic language selection. Play the complete draft and inspect every ending before saving it as a new story.

- 24 cloud-hosted CC0 music tracks with three recommendations, audition, theme/mood filters, per-passage assignment, and offline export; three Kenney jingles are reserved for later one-shot playback.
- Optional story media planning: up to four shared scenes, mood-based music matching, incremental draft media, and a read-only Graph in draft review.
- OpenAI scene previews with Apply/Discard, Storybook/Cinematic styles, cancellation, and independent image readiness in Settings. Missing-media recovery preserves existing assignments and skips stale scene plans.

## Workspace navigation

| Page | Purpose |
| --- | --- |
| `/builder` | Default destination: generate a draft or start a blank game. |
| `/builder/[storyId]` | Graph authoring, passage editing, live preview, validation, and export. |
| `/library` | Find, import, and manage saved games. |
| `/play/[storyId]` | Play one game in a focused reading view. |
| `/s/[publicId]` | Play the currently published snapshot without the editor shell. |
| `/settings` | Choose story and image models; view API configuration readiness. |

`/` redirects to `/builder`. Editor/player URLs identify games in the active local or private cloud workspace; they are not public share links. The brief and review state survive internal navigation to Settings. Full reloads clear transient state; completed cloud-generated drafts remain in My Games. See [WORKSPACE_ARCHITECTURE.md](doc/WORKSPACE_ARCHITECTURE.md) for responsibility and state boundaries.

## Storage boundaries

Storage defaults to browser-local. In that mode, drafts belong to the browser profile and exact origin; clearing site data removes them. `STORAGE_MODE=supabase` enables a private cloud workspace with owned media, revision-checked story saves, a local recovery outbox, generation history and reusable saved images. The fixed-owner cloud mode supports local and deployed environments without sign-in or an access code. All visitors use one shared internal workspace, without per-person account isolation.

See [Cloud Storage implementation status and design](doc/CLOUD_STORAGE_DESIGN.md) for configuration boundaries and remaining deployment work. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY` and `INTERNAL_TEST_OWNER_ID` on the server and apply `supabase/migrations/202610060001_cloud_storage.sql`. Never expose the secret with `NEXT_PUBLIC_`. The Everlove project migration is applied and local application connectivity was verified on 2026-10-07: seven readable tables and two private buckets. Live save/upload and generation round trips remain to be tested. Restart the development server after changing environment values.

Cloud saves preserve passages and choices, layout, shared assets and media plans. Conflicts keep a recovery copy instead of overwriting another revision. The media library keeps generated images even if a preview is dismissed. HTML exports embed media bytes and work independently of signed URLs; editable backups remain embedded version 2. Use editable backups to continue authoring.

Public sharing is implemented with Make public, stable `/s/[publicId]` reader links, explicit updates, and withdrawal. Apply `supabase/migrations/202610080001_story_publishing.sql` to enable it in a new environment. The migration and deployed publishing flow were verified on 2026-10-08; see [Verification](doc/VERIFICATION.md). Draft edits stay separate from the public snapshot. There is no user account system or owner-only edit enforcement yet: the workspace still uses one shared internal owner. Analytics, payments, free-form player input, inventory, and Blender remain out of scope. AI generation uses the server environment API key with no sign-in or access code.

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
│   │   ├── text/              # Passage and choice form
│   │   ├── media-panel/       # Image/music assignment and library controls
│   │   └── session/           # Commands, history, editing hook
│   ├── media/                 # Asset schema/commands, upload reader, audio engine
│   ├── generation/            # Builder, draft provider/review, schema
│   ├── player/                # Story player
│   ├── export/                # Downloads and standalone HTML
│   ├── workspace/             # Library, provider composition, shell
│   └── connections/           # Browser connection state and settings
├── storage/                   # Local/cloud repositories and cloud recovery outbox
├── server/
│   ├── auth/                  # Origin checks and shared internal principal
│   ├── models.ts              # API defaults and allowed model selections
│   ├── storage/               # Owned stories, revisions, and private assets
│   └── generation/            # Story adapter and persistent generation jobs
└── shared/ui/                 # Generic dialog and original artwork

public/media/demo/             # Placeholder image and four chime samples
resources/music-library/       # CC0 source/license manifest; audio lives in Supabase
scripts/music-library/         # Verified immutable catalog publishing
doc/                           # Requirements, design, setup, verification
└── archive/                   # Historical requirements and meeting materials
```

Browser and shared modules must not import `src/server/`. API routes connect
browser requests to server implementations. ESLint and dependency-graph tests
enforce this boundary. Keep providers and credentials out of client imports.

The shared [CC0 music library](resources/music-library/README.md) contains 24 music
tracks and 3 reserved effects. Audio lives in the public Supabase `music-library`
bucket; active metadata comes from `music_library_tracks`. The Media panel offers
three recommendations, audition, and theme/mood filters. Selected audio remains
embedded in story backups and offline HTML exports.

## AI and deployment

Follow [AI setup and deployment](doc/AI_SETUP.md) for environment API-key setup,
model selection, and Vercel configuration. Configuration changes require
a development-server restart. A successful status check alone does not verify a
provider account or a billable generation request.

The UI is English; authors can write Unicode story content, including Chinese.
The lighthouse illustration is original source artwork. Studio fonts have local
fallbacks; exported games use system fonts and make no external requests.
