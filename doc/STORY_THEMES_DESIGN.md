# Story Atmosphere Themes

Confirmed: 2026-10-07. Implementation and verification are tracked in
[VERIFICATION.md](VERIFICATION.md).

## Scope

Give each story a consistent visual atmosphere while keeping the authoring
workspace's brand styling. A theme controls the reading backdrop, surface,
headings, body text, secondary text, borders, choices, focus states, and sound
controls together. It stays the same through every branch and ending.

| Theme | Direction | Suggested stories |
| --- | --- | --- |
| Midnight | Charcoal, soft ivory, muted gold | Dark, horror, suspense |
| Starlight | Deep blue, cool text, lavender | Science fiction, mystery, space |
| Parchment | Warm paper, brown ink, ochre | Fantasy, history, adventure |
| Garden | Soft green, cream, forest accents | Hopeful, gentle, whimsical |

## Author workflow

- Show four theme swatches and an Auto option beside draft and editor previews.
- Switching themes immediately updates the preview without resetting its passage.
- Auto recommends a curated palette from the creation mood and story content;
  it uses local rules rather than an additional AI request or arbitrary generated
  colors. Dark content takes priority over a broadly optimistic mood.
- Save the initial recommendation with generated drafts so it remains stable
  during editing. Authors can override it at any time or return to Auto.
- Theme edits use normal story persistence and editor undo/redo.
- Manual stories and older backups without appearance metadata infer a sensible
  theme from their content, with Parchment as the neutral fallback.

## Data and rendering

Add optional validated appearance metadata to version 2 stories and cloud story
documents: `theme` is `auto`, `midnight`, `starlight`, `parchment`, or `garden`;
`recommendation` optionally retains the generated draft's initial recommendation.
No destructive migration or new database columns are needed. Version 1 imports
remain readable. Copies and editable backups retain appearance metadata.

The React player, draft preview, editor preview, full play backdrop, and offline
HTML all consume one palette definition. Standalone export resolves Auto before
embedding its colors and requires no network or generation service. No raw CSS
or user-controlled style strings are accepted.

## Scene glow prototype — 2026-10-07

Extend the current passage image into a soft ambient backdrop. Reuse the assigned
image, enlarge and blur it, then blend it with the story backdrop. Keep a nearly
opaque reading surface and the theme's existing text and interaction colors.
There is no image generation, palette extraction, additional provider request,
or extra embedded asset in the exported file.

- Enable the effect by default when a passage has an image. A separate **Scene
  glow** switch below the theme swatches lets authors turn it off without changing
  their theme or restarting the preview.
- Persist optional `appearance.sceneGlow` with the story. Missing values mean
  enabled, preserving compatibility with existing stories and backups.
- Preload each new image before an approximately 800 ms crossfade. Reused images
  stay steady; stale loads cannot replace the currently requested scene.
- Passages without images and failed image loads fade back to the story theme.
- Respect reduced-motion preferences, clip the blurred edges, ignore pointer
  events, and keep decorative layers hidden from assistive technology.
- Share the transition controller and effect styles between React previews,
  gameplay, and standalone HTML. Theme and glow settings survive late media
  updates, undo/redo, local/cloud saves, copies, and backups.

## Acceptance

- All four themes have legible text, choices, focus rings, endings, and audio UI.
- Switching theme preserves the current passage and reading progress.
- Reload, undo/redo, backup import/export, cloud serialization, and story copying
  preserve an explicit choice. A background media result cannot overwrite it.
- The selected theme matches in preview, play, and standalone export.
- Verify desktop and mobile in the in-app browser, including choice navigation,
  ending, restart, keyboard access, and old stories without theme metadata.
- Run typecheck, lint, and relevant automated tests; do not run `pnpm build`.

## Deferred

Per-passage theme changes, continuous ambient animation, image-derived theme
palettes, generated image extensions, custom colors, and custom fonts remain
outside this release.
