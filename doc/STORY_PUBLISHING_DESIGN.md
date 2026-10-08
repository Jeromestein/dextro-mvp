# Story Publishing

Design approved: 2026-10-07. Simplified scope approved: 2026-10-08.
Implementation: hosted migration applied and production publishing verified 2026-10-08.

On 2026-10-08, the author requested the simplest public-sharing implementation
without a user system or author-password gate. Existing `owner_id` values stay;
all current visitors still use the shared internal workspace. Public pages offer
playback only, but that is not enforcement of exclusive editing rights. Future
verified users may edit their own stories; other users must create an independent
copy under their own owner ID. That user/copy authorization workflow is deferred.

The implementation includes Publish, explicit updates, withdrawal, stable links,
a fixed playable snapshot, media hydration, and library status. Apply
`supabase/migrations/202610080001_story_publishing.sql` after the existing storage
migration to enable it in a new cloud workspace. The configured Supabase project
and user-deployed Vercel site passed publishing QA on 2026-10-08.

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
- An independent reader page and API exposing only published playable content.
  Existing shared authoring access remains unchanged; it is not private per user.

Defer discovery, profiles, follows, likes, comments, analytics, payments, reader
accounts, cross-device progress, custom domains/slugs, scheduled publishing, and
a release-history/rollback UI. Public play never generates content or invokes AI.

## 2. Baseline before this increment

| Source | Current behavior |
| --- | --- |
| `src/modules/workspace/studio.tsx` | My Games renders a fixed DRAFT badge for every saved story. |
| `src/modules/storage/model.ts` and the cloud migration | Saved records use draft, ready, or archived; ready is not a public state. |
| `src/app/(workspace)/play/[storyId]/page.tsx` and Studio | Play loads a story through the active workspace library, not a published release. |
| `src/modules/workspace/library-provider.tsx` | Cloud edits enter a durable save queue; accepting an edit does not prove remote persistence. |
| `src/server/storage/stories.ts` and `story_versions` | Cloud saves create numbered snapshots with revision and retry protection. |
| `src/modules/export/standalone.ts` | Playable exports validate content and remove editor metadata, media plans, unused assets, and provider prompts. |
| `src/server/auth/principal.ts` | Every visitor receives the same configured internal owner, without a verified author session. |

The implementation builds on these foundations without treating workspace status
or a saved revision as publication. Existing story URLs and offline exports keep
their current role. `src/modules/publishing/` owns projection, sharing controls,
and reader hydration; `src/server/publishing/` owns publication and public reads.

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

## 6. Persistence and operation contract

Keep `stories.status` and `story_versions` for authoring. Add publication records
instead of changing ready into public or marking every saved revision as live.

| Record | Implemented role |
| --- | --- |
| `story_publications` | One row per owned story: stable public ID, active release ID, publication revision, source story revision, content hash, frozen reference-only playable snapshot, and publication/withdrawal times. |
| `publication_operations` | Owner/story/mutation key, request hash, and durable result for retries of publish, update, withdrawal, and deletion. |
| Existing `story_versions` and `story_asset_refs` | Retain original revisions and their immutable media; a publication has a same-owner/story foreign key to its source version. |

The simplest implementation replaces the active frozen snapshot atomically when
publishing an update. It does not add a second complete release-history system;
source versions remain in the existing history. Readers already holding a loaded
package finish that package. Old release URLs cannot fetch media after a switch.

The additive migration grants access only to the server role. Ownership filters
and same-owner foreign keys preserve the future account boundary, but the current
principal still resolves everyone to the same internal owner. No story becomes
public merely because the migration runs.

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
   the existing internal owner on the server; never accept a browser-supplied
   owner ID. This is workspace scoping, not verification of the visitor identity.
3. Load that revision, validate its playable projection and referenced bytes,
   and compute the content hash. Do not accept arbitrary client snapshots as
   evidence of a valid published story.
4. In one database transaction, verify the source/publication revisions still
   match, replace the frozen snapshot and active release ID, retain its source
   revision reference, increment the publication revision, and record the result.
5. Return the confirmed public URL and release identity. Edits made after the
   reviewed version remain draft changes rather than joining this operation.

Media bytes must be ready before the transaction; a database transaction cannot
make an object-storage upload atomic. Reuse existing immutable files and pin
them through release references. Future cleanup must honor the retained source-version asset references.

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
| `GET /api/stories/[id]/publication` | Shared-workspace status, public URL, released content hash, and publication revision. |
| `POST /api/stories/[id]/publication` | Shared-workspace publish/update using the captured revision and mutation ID. |
| `DELETE /api/stories/[id]/publication` | Shared-workspace withdrawal with expected revision and mutation ID. |
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

## 7. Current ownership and future users

Keep the existing no-sign-in internal workspace. Do not introduce an author
password, account screens, new credentials, or deployment access protection in
this increment. This supersedes the original public-launch authentication
requirement after the author's explicit simplification on 2026-10-08.

Each story and publication remains associated with `owner_id`. When accounts are
introduced, replace the shared principal with a verified session. Permit original
story changes only when that user owns it; copying another user's public story
must create a new ID and owner binding, with no inherited publication authority.
Browser-provided user IDs cannot establish that identity.

For now, the `/s/[publicId]` page has no editing controls and public endpoints
return only the active playable snapshot and its assigned assets. Public readers
do not mount the workspace providers or call AI. However, existing workspace
URLs and APIs are still accessible under the shared internal identity. Do not
claim that stories are protected from other visitors or label this setup as
per-person private storage. Same-origin checks remain in place for writes.

Private media buckets remain private. Public media requests resolve through an
active publication and its exact assigned-asset list; no arbitrary storage paths,
provider prompts, unused assets, or authoring records are included in the public
payload. This narrows the sharing interface without pretending to add user auth.

## 8. Implementation and acceptance

1. Define the playable projection/hash, release schema, and additive migration.
   Keep existing stories unpublished; migrate no data into public access by default.
2. Implement revision-safe, idempotent publication operations and private asset
   retention using the current shared-workspace principal.
3. Build the independent public landing page, manifest/media reads, bounded
   hydration, player integration, metadata, and unavailable state.
4. Add the editor panel and real My Games badges, including pending-save, conflict,
   uncertain-result, local-only, and withdrawal behavior.
5. Verify locally, then apply the migration and verify the actual hosted reader
   separately. Local fixture results do not establish hosted behavior.

Acceptance checks:

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
- Verify public reads never return draft-only content or unassigned media, and
  that write endpoints still reject cross-origin requests. Document that existing
  workspace APIs continue using the shared owner; user authorization is deferred.
- Use the Codex in-app browser for final author/reader interactions, keyboard
  access, mobile layout, sharing controls, and audio fallback. Run typecheck, lint,
  and relevant automated tests; do not run `pnpm build`.

Verification is recorded in [VERIFICATION.md](VERIFICATION.md), including the
hosted migration and production publishing checks. Account/access configuration
and paid generation were not changed during that QA run.
For absolute cover-preview metadata, set `NEXT_PUBLIC_SITE_URL` to the canonical
app origin and restart/redeploy when that environment value changes.
