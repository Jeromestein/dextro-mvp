import { z } from "zod";
import { ServiceError } from "@/server/errors";
import type { Principal } from "@/server/auth/principal";
import { cloudEnabled, storageClient, storageError } from "@/server/storage/client";
import { assetBytes, hash } from "@/server/storage/assets";
import { readCloudStory } from "@/server/storage/stories";
import { storySchema, validateStory } from "@/modules/story/model";
import { requireStorySize } from "@/modules/media/assets/operations";
import { storedStorySchema, type StoredStory } from "@/modules/storage/model";
import { contentKey, projectContent, releaseAssetSchema, releaseContentSchema, usedAssetIds,
  type Publication, type PublicationStatus, type PublicManifest } from "@/modules/publishing/model";

const setupMessage = "Publishing is not set up yet. Apply the story publishing database migration, then retry.";
export class PublishingSetupError extends ServiceError { constructor() { super(setupMessage, 503); } }
const internalSnapshotSchema = releaseContentSchema.extend({ assets: z.array(releaseAssetSchema.extend({ assetId: z.uuid() })).max(300) });
const operationSchema = z.object({ mutationId: z.uuid(), sourceRevision: z.number().int().nonnegative(), expectedPublicationRevision: z.number().int().nonnegative() });
type PublicationRow = { owner_id: string; story_id: string; public_id: string; release_id: string | null; revision: number; content_hash: string; published_at: string | null; snapshot?: unknown };
type AssetRow = { id: string; kind: string; sha256: string; mime_type: string; byte_size: number };
const missingMigration = (error: { code?: string; message?: string } | null) =>
  !!error && (["42P01", "PGRST205", "PGRST202"].includes(error.code || ""));
function publicationError(error: { code?: string; message?: string } | null) {
  if (missingMigration(error)) throw new PublishingSetupError();
  if (error?.message?.includes("PUBLICATION_CONFLICT")) throw new ServiceError("Publication changed in another tab. Refresh its status and try again.", 409);
  storageError(error);
}
function summary(row: PublicationRow): Publication {
  return { publicId: row.public_id, releaseId: row.release_id, revision: row.revision, contentHash: row.content_hash, publishedAt: row.published_at };
}
async function publicationRow(principal: Principal, id: string) {
  const result = await storageClient().from("story_publications").select("*").eq("owner_id", principal.ownerId).eq("story_id", id).maybeSingle();
  publicationError(result.error);
  return result.data as PublicationRow | null;
}
export async function publicationStatus(principal: Principal, id: string): Promise<PublicationStatus> {
  // A newly created draft may still be waiting for its first autosave. Its
  // publication is empty until that save completes; promotion verifies the row.
  try { const row = await publicationRow(principal, id); return { available: true, publication: row ? summary(row) : null }; }
  catch (error) { if (error instanceof PublishingSetupError) return { available: false, publication: null, error: setupMessage }; throw error; }
}

function references(story: StoredStory, assets: AssetRow[]) {
  const used = usedAssetIds(story.document);
  return story.document.assets.filter(a => used.has(a.id)).map(ref => {
    const asset = assets.find(a => a.id === ref.assetId);
    if (!asset) throw new ServiceError("Some story media is unavailable. Repair its assignment before publishing.", 422);
    return { ...releaseAssetSchema.parse({ id: ref.id, name: ref.name, credit: ref.credit, kind: asset.kind,
      sha256: asset.sha256, mimeType: asset.mime_type, byteSize: asset.byte_size }), assetId: asset.id };
  });
}
export async function libraryPublications(principal: Principal, stories: ({ id: string } & StoredStory)[]) {
  const result = await storageClient().from("story_publications").select("owner_id,story_id,public_id,release_id,revision,content_hash,published_at")
    .eq("owner_id", principal.ownerId).in("story_id", stories.map(s => s.id));
  if (missingMigration(result.error)) return new Map<string, Publication>();
  publicationError(result.error);
  const rows = (result.data || []) as PublicationRow[];
  const live = stories.filter(s => rows.some(r => r.story_id === s.id && r.release_id));
  const ids = [...new Set(live.flatMap(s => s.document.assets.filter(a => usedAssetIds(s.document).has(a.id)).map(a => a.assetId)))];
  const assets: AssetRow[] = [];
  // Keep PostgREST URLs bounded for libraries with many assigned media files.
  for (let i = 0; i < ids.length; i += 100) {
    const batch = await storageClient().from("media_assets").select("id,kind,sha256,mime_type,byte_size")
      .eq("owner_id", principal.ownerId).in("id", ids.slice(i, i + 100)).eq("state", "ready").is("deleted_at", null);
    storageError(batch.error);
    assets.push(...(batch.data || []));
  }
  return new Map(rows.map(row => {
    const status = summary(row), story = stories.find(s => s.id === row.story_id)!;
    if (status.releaseId) {
      try { status.changed = hash(contentKey(projectContent({ ...story, ...story.document }, references(story, assets)))) !== status.contentHash; }
      catch { status.changed = true; }
    }
    return [row.story_id, status];
  }));
}

export async function mutatePublication(principal: Principal, id: string, action: "publish" | "unpublish" | "delete", raw: unknown) {
  const parsed = operationSchema.safeParse(raw);
  if (!parsed.success) throw new ServiceError("Invalid publication request. Refresh and try again.", 400);
  const input = parsed.data, requestHash = hash(JSON.stringify({ action, ...input })), db = storageClient();
  // Recover a lost response before reading today's draft or checking its revision.
  const prior = await db.from("publication_operations").select("request_hash,result").eq("owner_id", principal.ownerId)
    .eq("story_id", id).eq("mutation_id", input.mutationId).maybeSingle();
  publicationError(prior.error);
  if (prior.data) {
    if (prior.data.request_hash !== requestHash) throw new ServiceError("This request ID was already used for different content.", 409);
    return prior.data.result;
  }
  let snapshot: z.infer<typeof internalSnapshotSchema> | null = null;
  let contentHash = "";
  if (action === "publish") {
    const row = await readCloudStory(principal, id, input.sourceRevision);
    if (row.revision !== input.sourceRevision) throw new ServiceError("Wait for the story to finish saving before publishing.", 409);
    const stored = storedStorySchema.parse(row), used = usedAssetIds(stored.document);
    const refs = stored.document.assets.filter(a => used.has(a.id));
    const ids = [...new Set(refs.map(a => a.assetId))];
    const files = new Map<string, Awaited<ReturnType<typeof assetBytes>>>();
    for (let i = 0; i < ids.length; i += 4) await Promise.all(ids.slice(i, i + 4).map(async assetId => { files.set(assetId, await assetBytes(principal, assetId)); }));
    const assets = references(stored, [...files.values()].map(file => file.asset as AssetRow));
    const content = projectContent({ ...stored, ...stored.document }, assets);
    const playable = storySchema.parse({ ...content, version: 2, id, updatedAt: row.updatedAt,
      assets: assets.map(a => ({ id: a.id, name: a.name, credit: a.credit, kind: a.kind, source: "upload",
        data: `data:${a.mimeType};base64,${files.get(a.assetId)!.bytes.toString("base64")}` })) });
    requireStorySize(playable);
    const errors = validateStory(playable).filter(issue => issue.level === "error");
    if (errors.length) throw new ServiceError(errors[0].message, 422);
    snapshot = internalSnapshotSchema.parse({ ...content, assets });
    contentHash = hash(contentKey(content));
  }
  const result = await db.rpc("dextro_publish_story", { p_owner: principal.ownerId, p_story: id,
    p_source: input.sourceRevision, p_expected: input.expectedPublicationRevision, p_mutation: input.mutationId,
    p_request_hash: requestHash, p_action: action, p_content_hash: contentHash, p_snapshot: snapshot });
  publicationError(result.error);
  return result.data;
}

async function activePublication(publicId: string) {
  if (!cloudEnabled() || !z.uuid().safeParse(publicId).success) throw new ServiceError("Story unavailable.", 404);
  const result = await storageClient().from("story_publications").select("*").eq("public_id", publicId).not("release_id", "is", null).maybeSingle();
  if (missingMigration(result.error)) throw new ServiceError("Story unavailable.", 404);
  publicationError(result.error);
  const row = result.data as PublicationRow | null;
  if (!row?.release_id) throw new ServiceError("Story unavailable.", 404);
  const story = await storageClient().from("stories").select("id").eq("owner_id", row.owner_id).eq("id", row.story_id).is("deleted_at", null).maybeSingle();
  storageError(story.error);
  if (!story.data) throw new ServiceError("Story unavailable.", 404);
  return { row, snapshot: internalSnapshotSchema.parse(row.snapshot) };
}
export async function publicManifest(publicId: string): Promise<PublicManifest> {
  const { row, snapshot } = await activePublication(publicId);
  return { publicId: row.public_id, releaseId: row.release_id!, publishedAt: row.published_at!, content: projectContent(snapshot, snapshot.assets) };
}
export async function publicAsset(publicId: string, releaseId: string, assetId: string) {
  const { row, snapshot } = await activePublication(publicId);
  if (row.release_id !== releaseId) throw new ServiceError("This story was updated. Open its current version.", 409);
  const ref = snapshot.assets.find(a => a.id === assetId);
  if (!ref) throw new ServiceError("Media unavailable.", 404);
  const file = await assetBytes({ ownerId: row.owner_id }, ref.assetId);
  if (file.asset.sha256 !== ref.sha256 || file.asset.mime_type !== ref.mimeType || file.bytes.length !== ref.byteSize)
    throw new ServiceError("Media unavailable.", 422);
  // Recheck after storage I/O so withdrawal during a download stops new delivery.
  const current = await activePublication(publicId);
  if (current.row.release_id !== releaseId) throw new ServiceError("This story was updated. Open its current version.", 409);
  return { bytes: file.bytes, mimeType: ref.mimeType };
}
