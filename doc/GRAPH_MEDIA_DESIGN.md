# Graph-Based Scene Images and Background Music

Editor update (2026-10-07): Outline has been removed. Earlier references below
to Outline or Graph/Outline describe the previous design. The editor now uses
Graph on desktop and mobile; the passage/choice model and persistence are unchanged.
See [the current authoring decision](PROJECT_REQUIREMENTS.md#single-graph-workspace--2026-10-07).

Date: 2026-10-06\
Status: media foundation, initial OpenAI adapter, CC0 catalog, and coordinated creation implemented; live image access and later target features remain unverified.

### Confirmed media sources — 2026-10-06

The user selected **OpenAI API for scene images** and **Kenney + Freesound CC0
assets for audio**. Provider/source selection is settled; the initial integration and starter
catalog described below are implemented. These decisions supersede the broader
provider candidates discussed earlier.

- Generate images through a server-side OpenAI adapter using a separately billed
  API key. Use the same environment API key for stories and images, with separate model selections.
- Curate Kenney short effects and Freesound music loops, ambience, and effects.
  Accept only assets whose individual source/license records establish CC0.
  Do not include CC BY, CC BY-NC, or unspecified-license downloads in this catalog.
- Publish curated, versioned files to Supabase instead of runtime Freesound search
  or source-site download requests. Freesound's API terms are separate from each file's license.
- Do not add AI music generation or another stock provider to this increment.
  A missing suitable track resolves to Silence rather than an unreviewed source.

Catalog audio lives in the public Supabase `music-library` bucket; active records
are read from `public.music_library_tracks` through `/api/media/music`. The Media
module owns validation, scoring, download integrity and audition. The versioned
manifest and source/license evidence live in `resources/music-library/`. Metadata
includes the original title, author, CC0 source, verification date, duration,
role, theme/mood/instrument tags, energy, processing records and content hash.
Only chosen audio bytes and provenance travel with a story. Generated images
and selected story media continue using private story storage.

As of 2026-10-07 the collection contains 24 music tracks plus three reserved
Kenney jingles. The picker offers three recommendations, one-click audition,
and a searchable library with theme/mood filters. Automatic enrichment infers
a whole-story theme from genre and brief, then combines it with planned passage
moods and a preferred instrumentation family. It reuses a palette of at most
four newly chosen tracks, preserves manual selections and planned silence, and
excludes clips shorter than 25 seconds from automatic selection. This is
heuristic matching, not semantic audio analysis. Files have technical checks;
subjective suitability and seamless musical loops still require audition.

Short effects and ambience can be collected in the
same catalog, but must remain unavailable for automatic playback until dedicated
one-shot triggers and layered ambience exist. The current player loops a single
audio assignment; it cannot yet play a bell once over background music.

### Implemented foundation — 2026-10-06

The current increment delivers shared version 2 image/audio assets, a version 1
reader, atomic separate media storage, Graph thumbnails and music labels,
Story/Media/Preview tabs, file upload/reuse/credits, undoable assignment, and
independent playhead highlighting. User-uploaded audio supports explicit sound
enable, mute/volume, same-track continuity, fades, Silence, and offline exports.

### Initial provider/catalog integration — 2026-10-06

Implemented: a server-only OpenAI image endpoint with same-origin checks; a six-track Freesound CC0 catalog with local bytes and source/license
records; per-passage image candidates and music audition/assignment in Media;
optional structured scene grouping/music cues alongside generated stories;
sequential image enrichment (up to four), deterministic music matching, and
incremental read-only draft Graph review. Keep/Discard/navigation cancels pending
work. Recovery fills missing assignments, preserves existing media, and checks
scene content fingerprints; individual generation falls back to current text
when a saved plan is stale. Assets and provenance survive persistence/backups.

The draft Graph selects passages for preview; full draft editing/layout history,
per-node pending/error badges, all-story planning for old stories, theme controls,
reference-image conditioning, and linked-passage replacement review remain target
work. Bulk recovery currently uses Storybook. Images are explicitly opt-in in the
builder. Actual OpenAI access, quality, latency, and deployment behavior have not
been verified. Tracks have source/license, decoding, and playback checks; final
subjective listening/loop-quality review remains necessary. See
[verification](VERIFICATION.md) for completed checks. The numbered sections below
retain the broader target design; unchecked acceptance items are not completion claims.

## 1. Product direction

Make the existing Graph canvas the main workspace for arranging story passages,
scene images, and background music. An author describes an idea, receives a
branching story with coordinated media, reviews it on the graph, plays through
its branches, adjusts individual passages, and exports a complete offline game.

The user explicitly requested that images and music fit different story themes,
be produced as part of story creation, and integrate with the existing Graph
feature. The controls, limits, and implementation choices below are the proposed
design for that request. They are not a record of completed implementation or
verified provider access.

The module structure and the manual media foundation are implemented. See [system design](SYSTEM_DESIGN.md)
for current code ownership and storage/playback behavior.

Related project documents:

- [Project requirements](PROJECT_REQUIREMENTS.md)
- [Workspace architecture](WORKSPACE_ARCHITECTURE.md)
- [AI game creation](AI_GAME_DESIGN.md)

Earlier documents describe automatic images and audio as deferred. This document
specifies a proposed next increment; it does not retroactively change what the
existing release implements.

## 2. First-increment scope

| Area | Proposed behavior |
| --- | --- |
| Story generation | Retain 8–12 passages, 2–3 endings, language selection, and graph validation. |
| Scene images | Generate up to four distinct scene images in the initial story run; reuse images across compatible passages. |
| Visual style | Storybook by default, with Cinematic as a second option. |
| Music | Automatically assign tracks from a curated library of approximately 20–30 licensed instrumental tracks. |
| Music per story | Usually reuse two or three tracks; allow individual passage assignments to be changed. |
| Themes | Auto, Mystery, Fantasy, Sci-Fi, and Cozy. Theme and narrative mood remain separate settings. |
| Authoring | Graph scene cards, passage inspector, missing-media generation, individual replacement, and linked playtesting. |
| Storage and delivery | Browser-local stories, editable backups, and standalone HTML with the used media included. |

AI-composed music, layered environmental sound, narration, animated scenes,
video, character lip sync, conditional game state, and AI requests during play
remain outside this increment. Cloud accounts, public publishing, and cloud
storage also remain outside its scope.

The initial image limit is a generation budget for one run, not a requirement to
produce four images. Later single-image actions are explicit author requests.

## 3. Creation and draft review

### 3.1 Builder controls

Keep the existing premise, mood, and language fields. Add a compact media section:

| Control | Default | Behavior |
| --- | --- | --- |
| Scene images | On when image generation is configured and enabled | Otherwise show an unavailable state and a Settings link. |
| Visual style | Storybook | Apply one style throughout the story. |
| Background music | Auto | Allow Off; matching curated tracks makes no music-generation request. |
| Theme | Auto | Infer a theme from the premise, or honor an explicit selection. |

Show the image limit before generation. Display monetary estimates only when
verified provider pricing and request settings support them. Do not invent a
price, completion percentage, or generation time.

Text and image readiness are separate. Existing text-provider authentication
does not establish image-generation access or billing coverage. An unavailable
image service must not prevent text creation, manual images, or library music.

### 3.2 One creation action, separate stages

1. Generate and validate the story and a shared media plan.
2. Open the complete text draft in a Graph/Outline review workspace.
3. Assign library music and generate the planned scene images.
4. Update each affected node as its media becomes ready.
5. Let the author play, inspect endings, and choose **Keep & edit** or **Discard**.

The draft graph reuses the graph presentation and inspector concepts without
automatically saving into the story library. Keep creates a new saved story.
Discard leaves existing stories unchanged. Draft layout and accepted media are
included when the author keeps the draft.

Text becomes playable before every image is ready. Progress is factual, such as
“Story ready · Images 2/4 · Music matched.” Selecting a node reveals its own
status rather than only an overall spinner.

If the author keeps the draft while media work is pending, cancel the remaining
work and preserve completed assets. The saved editor offers **Generate missing
media**. First-version jobs do not silently continue after navigation or reload.
An unsaved draft retains the existing browser-local, transient-state boundary.

## 4. Graph integration

### 4.1 Scene cards

Extend each existing passage card with:

- A fixed-height landscape thumbnail area, or an honest empty/pending state.
- The passage title and Opening, Passage, or Ending label.
- A compact music label, including an explicit Silence state.
- Image generation or review status when action is needed.
- The existing choice rows and their connection handles.

Edges continue to represent player choices. Images and tracks belong to the
story's asset collection and are assigned through passage cards and the
inspector. Reusing a file does not require additional graph edges.

Provide **Show/Hide thumbnails** for structural overview. Keep labels readable,
avoid full narrative text inside cards, and use labels as well as color for
status. Image completion must not change node positions or trigger auto-layout.
Choice handles must remain aligned with their rows as card content changes.

### 4.2 Existing inspector

Expand the right-hand panel into three tabs:

| Tab | Contents |
| --- | --- |
| Story | Title, narrative, opening/ending controls, choices, and destinations. |
| Media | Image preview, scene description, generation/replacement actions, music assignment, and audition controls. |
| Preview | Play from the selected passage or from the opening. |

Image actions: **Generate**, **Regenerate**, **Upload**, **Use existing image**,
and **Remove**. Show the currently assigned image while a replacement is being
generated. A replacement becomes a candidate; **Apply** commits it and
**Discard** retains the current image.

Music actions: choose an existing track, audition it, select another suggested
track, or choose Silence. Audition and story playback share audio ownership so
they cannot accidentally overlap.

### 4.3 Graph toolbar and generation scope

- **Auto media** prepares a media plan for an existing story. Show the proposed
  assignments and image count before starting billable generation.
- **Generate missing media** fills missing planned images while retaining existing
  and manually assigned media.
- Per-passage actions affect the selected passage by default.

Do not require graph multi-selection for this increment. All-story missing-media
generation and individual passage actions cover the initial workflow.

### 4.4 Shared assets and replacements

Display a shared-use count and the titles of other passages using the same asset.
Changing a passage assignment affects that passage only. Replacing a shared
image creates a new asset and reassigns the selected passage; it does not mutate
the image that other passages reference.

An explicit **Apply to linked passages** action may assign the candidate to the
listed passages together. Apply that change as one undoable operation. Removing
a passage must not delete media still needed by another passage or by undo/redo.

### 4.5 Preserve the canvas workflow

Keep dragging, panning, zooming, choice connections, reconnection, auto-layout,
saved viewport, and undo/redo. Layout calculations must account for the new card
dimensions. Media actions must not reset manually arranged positions.

Completed assignment changes enter the existing story history. Temporary job
progress does not. Undo or deleting a passage invalidates pending replacements
that would otherwise reapply an obsolete change.

On mobile, retain Outline as the default. Outline rows show compact media status;
the same inspector is available below the structure. Graph remains available.

## 5. Coordinating story, images, and music

### 5.1 Shared media plan

Generate structured planning metadata alongside the story:

| Level | Information |
| --- | --- |
| Whole story | Theme, style, palette, setting, and recurring visual facts. |
| Scene group | Location, time, weather, visible objects, composition, and passages sharing the scene. |
| Passage | Scene assignment, emotional cue, music assignment, and what information has been revealed. |

Validate planning metadata separately from story structure. A media-plan problem
must not discard an otherwise valid story. The draft can remain text-only until
the author repairs or retries its media plan.

Share an image only when the passages have compatible visible facts. A changed
time of day, destroyed object, or newly revealed character can require a new
scene. Shared scenes must not expose facts known only on a different branch.
Ending artwork appears only after reaching that ending.

### 5.2 Image generation

Use the shared art brief plus the scene-specific description for each request.
Favor environments, distant figures, and silhouettes in the first increment.
Do not promise identical character faces across generated images.

Use the selected OpenAI image API. Verify the configured model's reference-image
workflow and account access before using the first accepted scene as a reference
for later scenes. Shared prompts alone remain a best-effort consistency measure.

Reserve up to four image slots per initial batch, with at most two active image
requests. Reference-image dependencies take precedence over parallel execution.
Reuse successful assets. Regenerating one scene must not regenerate the story or
unrelated images.

### 5.3 Music selection

Prepare a small library organized by theme and emotional role: exploration,
tension, warm resolution, and somber resolution. Metadata includes a stable
track ID, title, compatible themes, emotional role, source, license, attribution
requirements, duration, and tested loop behavior.

AI supplies emotional cues; deterministic matching selects valid catalog IDs.
Do not let the model invent tracks or external media URLs. Reuse compatible
tracks to maintain continuity, and use Silence when no suitable match exists.

Each passage resolves to an explicit track or Silence. Converging branches
therefore reach a predictable audio state. Avoid ambiguous inheritance from
whichever branch happened to play previously.

The initial library is curated and checked before inclusion. It must permit the
intended application use, bundling, and offline game exports. Free access alone
does not establish those permissions. Preserve source and license records;
provide required credits in exports.

## 6. Playtesting and player behavior

Track the editor selection and the playback passage separately. Clicking a node
to inspect it does not restart an active playtest. **Play from selected** is an
explicit action that moves the playback start.

During playtesting:

- Highlight the current playback card and choices actually traversed in the
  current run. Restart clears the previous run's path.
- Update the inspector preview as the player follows choices.
- Keep the editing selection distinguishable from playback highlighting.
- Offer a locate-current-passage action instead of constantly moving the canvas
  while the author is inspecting another area.
- Maintain a valid playback state when passages are edited or removed; a removed
  current passage stops playback and offers a restart.

The standalone player keeps a landscape image above readable text and choices.
Image transitions are restrained and respect reduced-motion preferences.
Playback must not wait for an unavailable optional image.

Sound starts only after an explicit player action. Keep mute and volume controls
available. The same track continues across passages without restarting. Different
tracks crossfade over approximately one second; Silence fades audio out.
Rapid choices must cancel superseded transitions. Handle browser playback
rejection with an actionable sound control while retaining text play.

Changing story, leaving the player, stopping audition, or closing the preview
releases its audio. Preview, the main player, and the exported player should obey
the same transition rules. No AI requests occur during playback.

## 7. State, compatibility, and export

### 7.1 Proposed story representation

Introduce a versioned story format with one asset collection per story and
passage references to image and audio assets. Include the shared media plan and
provenance metadata needed for editing and credits.

Use a version 2 writer and a version 1 compatibility reader. Convert legacy
embedded passage images into deduplicated assets when reading an old story,
preserving story IDs, passage IDs, choices, layout, and viewport. Commit migrated
data only through a successful save; retain the original stored record on a
failed read or save. Old backups remain importable; old application versions are
not promised to understand version 2 backups.

Immutable asset records support shared use and undo. Temporary generation jobs
and unapplied candidates are session state, not playable story content. Never
store provider credentials in the story, an export, or browser media metadata.

### 7.2 Persistence and size

Keep persistence in the existing browser-local workspace. The proposed editor
storage separates story references and asset metadata from the media bytes in
IndexedDB. Store each used file once per story rather than once per passage;
text edits should not serialize audio files. Self-contained backups and HTML
exports bundle the used bytes. Persist actual files, not only temporary provider
URLs or browser object URLs. This storage migration is not part of the module
restructuring and must preserve compatibility before version 2 writes begin.

Compress images and use compact audio files. Account for encoded size before
committing changes. The current workspace has a 24 MB serialized save limit and
a 25 MB import limit; maintain consistent limits across saving, import, and
export, or deliberately migrate them together. Do not silently raise a single
limit or save an export that the app cannot import again.

### 7.3 Exports

- Editable backups include the media plan, used assets, assignments, provenance,
  and editor layout needed to restore the story.
- Playable HTML includes the resolved story, used media, audio controls, and
  required credits. It excludes authoring layout and generation-job state.
- Include each used asset only once. Exported play makes no network requests.
- Missing optional media can be omitted explicitly while retaining text play.
  Invalid asset references or unsafe embedded data must be resolved before export.
- Continue to block structural story errors independently of optional media
  warnings. Pending or failed image generation must not be reported as complete.

## 8. Generation lifecycle and reliability

Image states: unassigned, queued, generating, ready, failed, cancelled, and review
suggested. A replacement candidate is separate from the currently assigned image.

Every job records the story/draft ID, target passage or scene, source revision,
and request identity. Before applying a result, verify that the target still
exists and the job is current. Late results from cancellation, another account,
an older draft, changed scene facts, or undo must not overwrite current work.

Editing text may mark the associated media for review. It does not automatically
regenerate media or consume additional provider usage. Review status is a prompt
to inspect consistency, not a claim that an existing image is definitely wrong.

Keep billable requests server-side with explicit authentication and bounded
inputs, output sizes, deadlines, concurrency, and duplicate-submission handling.
Use a separately verified image-provider authorization path. Preserve the
existing text-provider guards and never silently change its billing route.

Use bounded requests for the first increment. Do not describe in-memory jobs as
durable background processing. If measured image generation cannot fit hosting
limits, durable jobs and storage become a separate prerequisite before enabling
that provider in a hosted release.

Provider failures preserve valid text, existing media, and successful independent
results. Offer per-item retry; do not automatically retry a potentially billable
request of unknown outcome. Cancellation prevents further application of results
but cannot guarantee reversal of work or charges already started upstream.

## 9. Implementation sequence

| Stage | Main work | Completion evidence |
| --- | --- | --- |
| 1. Story assets | Versioned media schema, legacy import, shared assignments, history, size limits, and exports. | Old and new backups round-trip; shared assets survive undo and reload. |
| 2. Graph and inspector | Scene cards, fixed thumbnail space, media tab, node states, Outline support, and layout measurement. | Existing canvas interactions and mobile authoring continue working. |
| 3. Music and playtest | Curated catalog, matching, audio ownership, transitions, playback highlighting, and offline audio. | Branch changes, replay, silence, and exported playback behave consistently. |
| 4. Automatic images | Shared media planning, provider adapter, generation controls, candidates, cancellation, and stale-result checks. | Bounded live image generation works with the selected authorized provider. |
| 5. Unified creation | Draft Graph review, incremental media results, Keep/Discard, and partial-completion handling. | One creation action reaches a reviewable and exportable story. |

Expected integration points now live under `src/modules/`: `generation/` for
builder/draft review, `editor/graph/` and `editor/outline/` for structure views,
`editor/media-panel/` for assignments, `editor/session/` for history, `media/` for
assets, `player/` for presentation, and `export/` for delivery. `src/storage/`
owns persistence and `src/server/` owns authorized provider operations. Share
media resolution and playback rules across Graph, preview, and export.

## 10. Acceptance criteria

- [ ] Generate and review Mystery, Sci-Fi, and Cozy stories, including Chinese
  and English content, across their complete branches and endings.
- [ ] A valid text draft remains playable if media planning or image generation
  fails; failures and unavailable providers are visible and actionable.
- [ ] An initial generation run respects the image count and concurrency limits.
- [ ] Shared images reflect compatible scene facts and do not reveal another
  branch's information or an ending prematurely.
- [ ] Node thumbnails, music assignments, and statuses agree with the inspector,
  Outline, and player.
- [ ] Image completion and replacement preserve manual positions and viewport;
  choice handles and auto-layout account for the new card dimensions.
- [ ] Dragging, reconnecting choices, branch convergence, cycles, deletion,
  undo/redo, and reload continue to work.
- [ ] Playtesting highlights the actual playback node and traversed path while
  leaving the editor selection independent.
- [ ] Replacing a shared asset affects only the requested passages; history can
  restore the previous assignments and assets.
- [ ] Cancellation, retries, late results, deleted nodes, edited scenes, account
  changes, and undo cannot apply obsolete media.
- [ ] Same-track continuation, crossfades, silence, mute, volume, rapid choices,
  autoplay rejection, restart, and audio cleanup behave correctly.
- [ ] Legacy backups import without losing story structure or saved layout.
- [ ] New backups and HTML include used media and required credits without
  repeated copies per node; oversized or invalid media is handled before save.
- [ ] Exported HTML supports image and music playback with networking disabled.
- [ ] Desktop Graph, mobile Outline, the media inspector, and the player pass
  visual and interaction checks in the Codex in-app browser where available.
- [ ] TypeScript, lint, and relevant schema, history, generation, and export tests
  pass. Follow project instructions: do not run `pnpm build`.

The conversation includes an interactive design illustration for node selection,
media assignments, and playtest highlighting. Its artwork is illustrative and it
contains no actual music. Script syntax was checked; browser visual and
interaction verification was not completed. It is a design reference, not
evidence that the proposed product features are implemented.

## 11. Dependencies and later work

Before enabling automatic images, verify the selected OpenAI model, API-key
authorization, reference-image behavior, generation latency, output format,
pricing, and allowed usage. Requests use the environment API key without a sign-in or access-code step. `OPENAI_IMAGE_MODEL` now selects the image model (default
`gpt-image-2.5-flare`). See [AI setup](AI_SETUP.md) for credentials and UI steps.

Choose and audition the actual Kenney/Freesound CC0 files, normalize playback
levels, check loop seams, and fit the existing asset/export size limits before
inclusion. Reject harsh or distracting samples. The expanded 24-track catalog is hosted in Supabase; technical checks do not
replace subjective listening approval.

Selected-source references:

- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation)
- [Kenney asset licensing](https://kenney.nl/support)
- [Freesound license guidance](https://freesound.org/help/faq/)
- [Freesound API terms](https://freesound.org/help/tos_api/): API access conditions
  are distinct from the CC0 status of a downloaded sound.
