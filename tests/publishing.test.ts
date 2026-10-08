import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { sampleStory } from "./helpers/sample-story";
import { contentKey, projectContent, storyContentHash, mediaPath, publicationLabel, type PublicManifest } from "../src/modules/publishing/model";
import { loadPublicStory } from "../src/modules/publishing/reader-data";
import { mediaResponse } from "../src/server/publishing/http";

const owner = "8dc1ba9a-adf2-48ff-8dec-c0b4152e326a";
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const stored = { title: "A public story", description: "Find your way home.", genre: "Adventure", document: {
  startId: "start", passages: [{ id: "start", title: "Home", text: "You made it home.", ending: true, choices: [], media: { imageId: "", audioId: "" } }], assets: [],
} };

test("reader projection and change detection exclude editor state, unused media and private prompts", async () => {
  const story = sampleStory(), baseline = await storyContentHash(story);
  story.editor = { positions: [{ id: story.startId, x: 100, y: 20 }], viewport: { x: 7, y: 8, zoom: 1.2 } };
  story.updatedAt = "later";
  story.appearance = { sceneGlow: true, theme: "garden", recommendation: "midnight" };
  const bytes = Buffer.from("RIFF0000WEBPprivate");
  story.assets.push({ id: "unused", kind: "image", name: "Unused", credit: "", source: "generated", data: `data:image/webp;base64,${bytes.toString("base64")}`,
    provenance: { provider: "openai", prompt: "Private prompt", model: "private-model", createdAt: "today" } });
  assert.equal(await storyContentHash(story), baseline);
  story.passages[0].media.imageId = "unused";
  const changed = await storyContentHash(story);
  assert.notEqual(changed, baseline);
  const projected = projectContent(story, [{ id: "unused", name: "Unused", credit: "", kind: "image", sha256: sha(bytes), mimeType: "image/webp", byteSize: bytes.length }]);
  const serialized = contentKey(projected);
  for (const secret of ["editor", "viewport", "Private prompt", "private-model", "provenance", "updatedAt", "recommendation", "theme"]) assert.ok(!serialized.includes(secret));
  assert.equal(sha(serialized), changed, "browser byte hash and server reference projection agree");
  const glow = { ...story, appearance: { sceneGlow: false } };
  assert.notEqual(await storyContentHash(glow), changed);
  const title = story.title; story.title = "A changed title";
  assert.notEqual(await storyContentHash(story), changed);
  story.title = title; assert.equal(await storyContentHash(story), changed, "undo restores the clean state");
  story.assets = story.assets.map(a => ({ ...a, credit: "Updated credit" }));
  assert.notEqual(await storyContentHash(story), changed, "reader credits count as content");
});

test("publishing SQL preserves stable URLs, snapshots, retries, conflicts, ownership and atomic withdrawal/deletion", async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
    for (const file of ["202610060001_cloud_storage.sql", "202610080001_story_publishing.sql"]) await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    const save = (base: number, story = stored) => db.query("select dextro_save_story($1,'test-story',$2,$3,$4,$5::jsonb)", [owner, base, randomUUID(), JSON.stringify(story), JSON.stringify(story)]);
    const content = projectContent({ ...stored, ...stored.document }, []), snapshot = JSON.stringify(content);
    type Result = { publicId: string; releaseId: string | null; revision: number; deleted: boolean };
    const publish = async (action: string, source: number, expected: number, mutation = randomUUID(), request: string = mutation, data = snapshot, contentHash = sha(data)) =>
      (await db.query<{ result: Result }>("select dextro_publish_story($1,'test-story',$2,$3,$4,$5,$6,$7,$8::jsonb) as result", [owner, source, expected, mutation, request, action, contentHash, data])).rows[0].result;
    await save(0);
    const mutation = randomUUID(), first = await publish("publish", 1, 0, mutation);
    assert.ok(first.releaseId); assert.equal(first.revision, 1);
    assert.deepEqual(await publish("publish", 1, 0, mutation), first, "lost response replay");
    await assert.rejects(publish("publish", 1, 1, mutation, "different"), /IDEMPOTENCY_CONFLICT/);
    const same = await publish("publish", 1, 1);
    assert.equal(same.revision, 1); assert.equal(same.releaseId, first.releaseId, "identical content is a no-op");
    await save(1, { ...stored, title: "Unpublished edit" });
    const live = (await db.query<{ snapshot: { title: string } }>("select snapshot from story_publications")).rows[0];
    assert.equal(live.snapshot.title, stored.title, "autosave cannot replace the live snapshot");
    await assert.rejects(publish("publish", 1, 1), /REVISION_CONFLICT/);
    await assert.rejects(publish("unpublish", 0, 0), /PUBLICATION_CONFLICT/);
    const updated = JSON.stringify({ ...content, title: "Unpublished edit" });
    const second = await publish("publish", 2, 1, randomUUID(), "update", updated);
    assert.equal(second.publicId, first.publicId); assert.notEqual(second.releaseId, first.releaseId);
    const withdrawn = await publish("unpublish", 0, second.revision);
    assert.equal(withdrawn.releaseId, null); assert.equal(withdrawn.publicId, first.publicId);
    const again = await publish("publish", 2, withdrawn.revision, randomUUID(), "again", updated);
    assert.equal(again.publicId, first.publicId); assert.ok(again.releaseId);
    await assert.rejects(publish("delete", 1, again.revision), /REVISION_CONFLICT/);
    assert.ok((await db.query<{release_id:string}>("select release_id from story_publications")).rows[0].release_id, "failed delete keeps live state");
    const deletion = randomUUID(), deleted = await publish("delete", 2, again.revision, deletion);
    assert.equal(deleted.releaseId, null); assert.equal(deleted.deleted, true);
    assert.deepEqual(await publish("delete", 2, again.revision, deletion), deleted, "deletion retries recover after soft delete");
    assert.ok((await db.query<{deleted_at:string}>("select deleted_at from stories")).rows[0].deleted_at);
    assert.equal((await db.query<{count:number}>("select count(*)::int as count from story_versions")).rows[0].count, 2);
    await db.exec("set role anon");
    await assert.rejects(db.query("select * from story_publications"), /permission denied/);
    await assert.rejects(publish("publish", 2, 0), /permission denied/);
    await db.exec("reset role");
    const other = randomUUID();
    await assert.rejects(db.query("select dextro_publish_story($1,'test-story',2,0,$2,'x','publish',$3,$4::jsonb)", [other, randomUUID(), sha(snapshot), snapshot]), /STORY_DELETED/);
  } finally { await db.close(); }
});

test("reader hydration uses only public APIs, checks bytes and pins a release across playback", async t => {
  const bytes = Buffer.from("RIFF0000WEBPreader"), publicId = randomUUID();
  const asset = { id: "image", name: "Cover", credit: "Illustration credit", kind: "image" as const, sha256: sha(bytes), mimeType: "image/webp" as const, byteSize: bytes.length };
  const content = projectContent({ ...stored, ...stored.document, passages: [{ ...stored.document.passages[0], media: { imageId: "image", audioId: "" } }] }, [asset]);
  let manifest: PublicManifest = { publicId, releaseId: randomUUID(), publishedAt: new Date().toISOString(), content };
  let updateWhileLoading = true;
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requests.push(url);
    if (url.endsWith(publicId)) return Response.json(manifest);
    if (updateWhileLoading) { updateWhileLoading = false; manifest = { ...manifest, releaseId: randomUUID(), content: { ...content, title: "Updated release" } }; return Response.json({}, { status: 409 }); }
    assert.equal(url, mediaPath(manifest, "image"));
    return new Response(bytes);
  });
  const story = await loadPublicStory(publicId, new AbortController().signal);
  assert.equal(story.title, "Updated release"); assert.equal(story.assets.length, 1);
  assert.equal(story.assets[0].data, `data:image/webp;base64,${bytes.toString("base64")}`);
  manifest = { ...manifest, content: { ...content, title: "Later edit" } };
  assert.equal(story.title, "Updated release", "loaded playthrough owns its data");
  assert.ok(requests.every(url => url.startsWith("/api/public/stories/")));
  t.mock.method(globalThis, "fetch", async (url: string) => url.endsWith(publicId) ? Response.json(manifest) : new Response(Buffer.from("wrong")));
  await assert.rejects(loadPublicStory(publicId, new AbortController().signal), /integrity/);
  t.mock.method(globalThis, "fetch", async () => Response.json({}, { status: 404 }));
  await assert.rejects(loadPublicStory(publicId, new AbortController().signal), /no longer public/);
});

test("public media supports bounded ranges without caching and status labels distinguish withdrawal", async () => {
  const bytes = new Uint8Array([1, 2, 3, 4]);
  const response = mediaResponse(new Request("http://localhost/media", { headers: { range: "bytes=1-2" } }), bytes, "audio/wav");
  assert.equal(response.status, 206); assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-range"), "bytes 1-2/4");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [2, 3]);
  for (const range of ["bytes=9-10", "bytes=0-1,2-3", "bytes=-0", "bytes=-", "other"]) assert.equal(mediaResponse(new Request("http://localhost/media", { headers: { range } }), bytes, "audio/wav").status, 416);
  assert.equal(publicationLabel(null), "Draft");
  const publication = { publicId: randomUUID(), releaseId: randomUUID(), revision: 1, contentHash: "x", publishedAt: "today" };
  assert.equal(publicationLabel(publication), "Public");
  assert.equal(publicationLabel({ ...publication, changed: true }), "Public · Unpublished changes");
  assert.equal(publicationLabel({ ...publication, releaseId: null }), "Unpublished");
});
