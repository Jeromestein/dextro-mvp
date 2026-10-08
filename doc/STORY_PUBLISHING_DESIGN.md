# Story Publishing

Design approved: 2026-10-07. Status: documented; not implemented or deployed.

The author approved the product flow below and requested documentation first.
This document defines the first publishing increment and its proposed technical
contract. It does not report completed migrations, public routes, access controls,
or live verification. See [project requirements](PROJECT_REQUIREMENTS.md) for the
dated decision and [cloud storage design](CLOUD_STORAGE_DESIGN.md) for existing
persistence and access behavior.

## 1. Decision and scope

Keep an editable draft and publish a separate, immutable playable version.
Autosave changes the draft. Only an explicit Publish or Publish updates action
changes what new readers receive. A published story keeps the same share link
when its title or content changes, when it is withdrawn, and when republished.

For this increment, Public means anyone with the link can open and play the
story without signing in. Links may be forwarded; they are not secrets or reader
authorization. A discovery feed and search-engine listing are separate features.
Keep the current no-index policy initially, while providing share-preview metadata.

Include:

- Publish from the editor, with a review panel and actionable validation.
- A stable public landing page and the existing choice-based player.
- Accurate library/editor status, explicit updates, and withdrawal.
- Fixed content and media for each release, with failure-safe publication.
- A read-only public boundary that does not expose the authoring workspace.

Defer discovery, profiles, follows, likes, comments, analytics, payments, reader
accounts, cross-device progress, custom domains/slugs, scheduled publishing, and
a release-history/rollback UI. Public play never generates content or invokes AI.

## 2. Current baseline

| Source | Current behavior |
| --- | --- |
| `src/modules/workspace/studio.tsx` | My Games renders a fixed DRAFT badge for every saved story. |
| `src/modules/storage/model.ts` and the cloud migration | Saved records use draft, ready, or archived; ready is not a public state. |
| `src/app/(workspace)/play/[storyId]/page.tsx` and Studio | Play loads a story through the active workspace library, not a published release. |
| `src/modules/workspace/library-provider.tsx` | Cloud edits enter a durable save queue; accepting an edit does not prove remote persistence. |
| `src/server/storage/stories.ts` and `story_versions` | Cloud saves create numbered snapshots with revision and retry protection. |
| `src/modules/export/standalone.ts` | Playable exports validate content and remove editor metadata, media plans, unused assets, and provider prompts. |
| `src/server/auth/principal.ts` | Every visitor receives the same configured internal owner, without a verified author session. |

Reuse these foundations without treating workspace status or a saved revision
as publication. Existing story URLs and offline exports keep their current role.

## 3. Author workflow

### First publication

1. Add Publish to the editor's primary actions. Open a compact review panel on
   desktop and a full-width panel on mobile, retaining the current editor state.
2. Show the title, description, opening-image cover or text fallback, and the
   public-reader preview. Reuse the existing title and Story details controls;
   a separate cover-upload workflow is outside the first increment.
3. Show validation results with links to the affected passage. Explain that the
   link will allow anyone to play the published version without signing in.
4. Publish story waits for the selected content and referenced media to finish
   saving, runs authoritative server checks, then publishes that saved version.
5. On confirmed success, show Open public page and Copy link. Keep the link and
   published time available after closing the panel; do not rely on a toast alone.

Use named progress states such as Saving changes, Checking story, and Publishing,
not invented percentages. Prevent duplicate submissions while a request is
pending. A timeout is an uncertain result until the same request is recovered.

### Updates and withdrawal

Continue editing the draft after publication. Publish updates reviews and
publishes the current saved content at the existing URL. A failed update leaves
the previous public version available.

Offer Unpublish in the publication panel's secondary actions. Its confirmation
explains that new readers will lose access while the draft and saved versions
remain. Republishing repeats validation and reuses the same URL.

Deleting a published story must explicitly include withdrawal in the deletion
message. Withdraw and soft-delete together; a failed operation must not leave a
deleted story publicly accessible. A copied/imported story starts unpublished
and receives its own link only when published. Backups do not carry publication
authority or reuse another story's public ID.

### Visible states

| Condition | Badge | Primary publication action |
| --- | --- | --- |
| Never published | Draft | Publish |
| Live release matches current playable content | Public | Open public page / Copy link |
| Live release differs from current playable content | Public · Unpublished changes | Publish updates |
| Previously published, currently withdrawn | Unpublished | Publish again |

Show saving/conflict/error state separately from publication state. An unsaved
edit can already create Unpublished changes; a successful autosave does not
clear that badge. An invalid draft can coexist with a valid public release.

Compare a deterministic projection of reader-visible content, not updatedAt or
the raw storage revision. Include title, description, genre, opening, passages,
choice order/destinations, referenced media bytes and displayed credits, and
reader appearance. Exclude graph positions, viewport, selection, undo history,
generation plans/prompts, unused assets, and other authoring metadata. Undoing
back to the released content clears the change badge. Layout-only edits do not
create an update to publish.

## 4. Publication checks and storage modes

Client checks give immediate feedback; the server repeats all blocking checks
against the exact stored revision. Require a nonblank story title, valid schema,
valid opening, passage text and choice labels, valid destinations and endings,
and a route to an ending for each reachable passage. Use the shared validator's
error/warning distinction; unreachable passages remain warnings with a link to
review them. Missing descriptions and optional scene images/music are not blockers.

Every assigned asset must exist, be ready, belong to the publishing workspace,
match its declared kind, and have verified immutable bytes. A broken reference
blocks publication; deliberately empty media is valid. Keep existing story and
file-size limits. Publishing does not regenerate missing media or incur AI charges.

The first release requires durable cloud storage for hosted publication. In
browser-local mode, explain that the story must first be copied to the cloud
workspace through the existing Copy local games flow. Preserve the browser copy
and wait for the cloud save before publishing. If cloud storage is unavailable,
keep editing/export available and explain why publication is unavailable; never
report a browser-only save as a public release or silently migrate a library.

## 5. Reader experience and release consistency

Use `/s/[publicId]`, outside the workspace route group. The landing page shows
the released title, description, cover or fallback, genre, and Start story.
Provide title/description/cover share metadata from the released version only.
Changing the draft must not change either the landing page or its metadata.

Start story opens the shared player, preserving choices, endings, restart,
credits, sound controls, and appearance. Mount only reader/audio dependencies;
do not load LibraryProvider, generation settings, or the editor shell. Respect
browser audio restrictions and retain an Enable sound fallback.

Pin playback to one release. For the first implementation, use bounded media
hydration before starting: fetch the sanitized manifest and its referenced media
with limited concurrency and byte/hash checks, then hold the complete playable
story in memory. This follows the existing player data model and avoids replacing
text, branches, or music during a session. Keep the landing page lightweight;
show loading/retry feedback when the reader starts the game.

If an update races with loading, stop loading the old package and resolve the
current release again; never combine releases. Once the package is loaded,
updates cannot interrupt that playthrough. Restart within it replays the same
release; refreshing the page resolves the latest available release. Reloading
does not restore progress in this increment.

An unknown or withdrawn link shows a neutral Story unavailable page with no
draft details or editor links. Withdrawal denies new manifest/media requests.
It cannot erase a fully loaded playthrough, downloaded copies, or third-party
share-preview caches. State this limit accurately in withdrawal help text.

## 6. Proposed persistence and operation contract

Keep `stories.status` and `story_versions` for authoring. Add publication records
instead of changing ready into public or marking every saved revision as live.

| Record | Suggested fields and constraints |
| --- | --- |
| `story_publications` | Internal owner/story key, unique stable public ID, active release ID nullable, monotonic publication revision, first/last published and withdrawn timestamps. One publication per owned story; public IDs are never reassigned. |
| `story_releases` | Immutable release ID, publication ID, source story revision, release schema version, playable content hash, sanitized reference-only snapshot, creation time. The active pointer must reference a release of that same publication. |
| `story_release_assets` | Release ID, release-local asset ID, immutable asset reference, byte hash/type/size, and frozen reader-facing credits/license fields. Retain referenced bytes independently of later draft edits. |
| Publication operation record | Owner/story, unique mutation ID, operation kind, request hash, and durable result for retries of publish/update/withdraw/delete. |

These are proposed contracts, not applied SQL. Enforce ownership and same-story
relationships at both service and database boundaries. Do not expose direct
anonymous reads of authoring tables or grant clients the publication mutation RPC.

Build a dedicated allowlisted reader payload. Include only playable content,
assigned media, appearance, and necessary credits/license attribution. Strip
editor state, prompts, media plans, provider/job details, owner identifiers,
private storage paths, and unused assets. Do not serialize a whole saved record
and rely on the client to hide private fields. Reuse/export the relevant pure
projection logic without importing the standalone HTML template into the player.

### Publish or update

1. Capture the reviewed content and finish its cloud save/upload work. Obtain
   the server-confirmed source revision; a queued local save is insufficient.
2. Send sourceRevision, expectedPublicationRevision, and a mutationId. Resolve
   author authority on the server; never trust an owner ID from the browser.
3. Load that revision, validate its playable projection and referenced bytes,
   and compute the content hash. Do not accept arbitrary client snapshots as
   evidence of a valid published story.
4. In one database transaction, verify the source/publication revisions still
   match, insert the immutable release and asset references, switch the active
   pointer, increment the publication revision, and record the operation result.
5. Return the confirmed public URL and release identity. Edits made after the
   reviewed version remain draft changes rather than joining this operation.

Media bytes must be ready before the transaction; a database transaction cannot
make an object-storage upload atomic. Reuse existing immutable files and pin
them through release references. Future cleanup must honor those references.

Revision mismatches return a conflict with an action to reload publication state
and review again. Never overwrite another tab's publish or withdrawal silently.
Replay of the same mutation returns its recorded result; the same key with a
different request is rejected. A repeated publish of identical active content
is a no-op. After a lost response, recover the operation and refresh current
publication state so an old successful response cannot conceal a later withdrawal.

Withdraw uses the same revision/retry rules and atomically clears the active
pointer. Failure preserves the prior state. Saved releases remain internal;
public callers cannot enumerate drafts, revisions, or superseded releases.

### Suggested routes

| Route | Responsibility |
| --- | --- |
| `GET /api/stories/[id]/publication` | Authorized author status, public URL, released content hash, and publication revision. |
| `POST /api/stories/[id]/publication` | Authorized publish/update using the captured revision and mutation ID. |
| `DELETE /api/stories/[id]/publication` | Authorized withdrawal with expected revision and mutation ID. |
| `GET /s/[publicId]` | Public landing page and released share metadata. |
| `GET /api/public/stories/[publicId]` | Sanitized active release manifest; no workspace lookup by visitor identity. |
| `GET /api/public/stories/[publicId]/releases/[releaseId]/assets/[assetId]` | Only an asset referenced by that publication's currently active release. |

The public media endpoint resolves references on the server, checks active
publication on every request, and supports appropriate content types and audio
ranges. It never accepts arbitrary object paths or fetch URLs. Use no-store for
public resolution, manifests, covers, media, and unavailable responses initially;
avoid static generation, image optimization, or a CDN path that bypasses withdrawal
checks. The hydration client retains bytes only for its current playthrough.
Do not make the existing user-media or generation-output buckets public.

## 7. Public access boundary

The current shared-owner principal is not an author authorization check.
Same-origin checks, hidden editor navigation, private buckets, and unguessable
story IDs do not prevent an anonymous visitor from using the current workspace
APIs. The agreed public increment therefore requires a real boundary before launch.

Prefer a separately protected author workspace and a public reader surface that
exposes only published reads. If both run in one deployment, enforce equivalent
verified author access on every workspace page and API. Protect draft/revision
reads, raw assets and uploads, publication mutations, deletion, storage/settings,
generation submission/status, and any job recovery endpoint that can dispatch
work. A separate public hostname alone does not protect an open author origin.

Reader requests must never use the existing shared-owner wrapper as authorization.
Resolve only the requested active publication and its exact asset allowlist.
Server credentials stay server-side; public play has no paid-provider path.

The existing no-sign-in shared workspace remains the documented internal-testing
behavior today. This approved publishing design adds a public-launch requirement;
it does not claim protection already exists or change current settings. The exact
hosting/access mechanism must be selected during implementation. A full consumer
account/profile system is not required for the first author boundary.

## 8. Implementation sequence and acceptance

1. Define the playable projection/hash, release schema, and additive migration.
   Keep existing stories unpublished; migrate no data into public access by default.
2. Implement revision-safe, idempotent publication operations and private asset
   retention. Add the author access boundary before exposing these operations.
3. Build the independent public landing page, manifest/media reads, bounded
   hydration, player integration, metadata, and unavailable state.
4. Add the editor panel and real My Games badges, including pending-save, conflict,
   uncertain-result, local-only, and withdrawal behavior.
5. Verify locally, then verify the actual hosted reader and author boundaries
   separately. Code presence and a local pass do not establish deployment safety.

Required checks for the future implementation:

- Publish a text-only story and a media story; play branches to endings and restart
  in a fresh anonymous browser, on desktop and at a 390px mobile width.
- Edit a live story: public page, cover, and metadata remain unchanged until
  Publish updates; the URL stays stable afterward. Layout-only changes stay clean.
- Verify a loaded reader finishes the old release after an update, a new reader
  gets the new release, and an update during hydration never mixes versions.
- Exercise queued saves, missing/corrupt media, invalid branches, cloud failure,
  duplicate clicks, lost responses, and competing publish/withdraw requests.
  Failure must preserve the draft and the previous confirmed public state.
- Withdraw and republish at the same URL; verify direct old manifest/media/cover
  requests are denied after withdrawal. Verify published-story deletion is atomic.
- Confirm copy/import starts unpublished and local-only publication explains the
  required cloud copy without discarding the original.
- Inspect public payloads for prompts, unused media, private identifiers, and
  authoring metadata; attempt unrelated asset and historical-release access.
- From an anonymous client, verify draft/asset/job reads, editing, uploads,
  publishing, deletion, and AI/recovery APIs cannot use the shared internal owner.
- Use the Codex in-app browser for final author/reader interactions, keyboard
  access, mobile layout, sharing controls, and audio fallback. Run typecheck, lint,
  and relevant automated tests; do not run `pnpm build`.

Verification status for this document: design only. No publishing implementation,
database migration, access-setting change, paid request, or deployment is included.
