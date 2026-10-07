// Run with: node --env-file=.env.local --import tsx scripts/music-library/publish.ts [--files-only]
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { catalogRecordSchema, MUSIC_BUCKET } from "../../src/modules/media/catalog/model";

async function main() {
  const url = process.env.SUPABASE_URL?.trim(), key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("Configure server-side Supabase credentials.");
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const entries = JSON.parse(await readFile("resources/music-library/catalog.json", "utf8"));
  const records = (entries as {record: unknown; file: string; publishedUrl?: string}[]).map(entry => ({ record: catalogRecordSchema.parse(entry.record), file: entry.file, publishedUrl: entry.publishedUrl }));
  // Check every local file before publishing anything. Never overwrite a versioned object.
  const buffers = await Promise.all(records.map(async ({record, file, publishedUrl}) => {
    let bytes: Buffer;
    try { bytes = await readFile(path.resolve(file)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT" || !publishedUrl) throw error;
      const source = new URL(publishedUrl);
      if (source.protocol !== "https:" || !/^[a-z0-9]+\.supabase\.co$/.test(source.hostname)
        || source.pathname !== `/storage/v1/object/public/${MUSIC_BUCKET}/${record.objectPath}`) throw new Error(`Invalid recovery URL for ${record.id}`);
      const response = await fetch(source, {signal: AbortSignal.timeout(60_000)});
      if (!response.ok) throw new Error(`Could not recover published bytes for ${record.id}`);
      bytes = Buffer.from(await response.arrayBuffer());
    }
    if (bytes.length !== record.byteSize || createHash("sha256").update(bytes).digest("hex") !== record.sha256) throw new Error(`Local integrity failure: ${record.id}`);
    return bytes;
  }));
  const { data: buckets, error: listError } = await db.storage.listBuckets();
  if (listError) throw new Error(`Could not inspect catalog bucket (${listError.name}).`);
  const existing = buckets.find(b => b.id === MUSIC_BUCKET);
  if (!existing) {
    const { error } = await db.storage.createBucket(MUSIC_BUCKET, { public: true, fileSizeLimit: 6_000_000, allowedMimeTypes: ["audio/mpeg", "audio/ogg"] });
    if (error) throw new Error(`Could not create catalog bucket (${error.name}).`);
  } else if (!existing.public) throw new Error("The music-library bucket is not public. Existing access settings were preserved.");
  const evidence: {id: string; sha256: string; byteSize: number; verified: boolean}[] = [];
  for (let i = 0; i < records.length; i++) {
    const { record } = records[i], bytes = buffers[i];
    const { error } = await db.storage.from(MUSIC_BUCKET).upload(record.objectPath, bytes, { upsert: false, contentType: record.mimeType, cacheControl: "31536000" });
    if (error && !["409", "400"].includes(String((error as {statusCode?: string}).statusCode))) throw new Error(`Upload failed for ${record.id} (${error.name}).`);
    const { data } = db.storage.from(MUSIC_BUCKET).getPublicUrl(record.objectPath);
    const response = await fetch(data.publicUrl);
    const downloaded = Buffer.from(await response.arrayBuffer());
    if (!response.ok || downloaded.length !== bytes.length || createHash("sha256").update(downloaded).digest("hex") !== record.sha256) throw new Error(`Public readback failed: ${record.id}`);
    if (!process.argv.includes("--files-only")) {
      const { error: saveError } = await db.from("music_library_tracks").upsert({ id: record.id, role: record.role, active: true, record, updated_at: new Date().toISOString() });
      if (saveError) throw new Error(`Could not publish ${record.id}; apply the music library migration first (${saveError.code}).`);
    }
    evidence.push({id: record.id, sha256: record.sha256, byteSize: bytes.length, verified: true});
    console.log(`Verified ${record.id} (${bytes.length} bytes)`);
  }
  await mkdir("output/music-curation", {recursive: true});
  await writeFile("output/music-curation/published.json", JSON.stringify({ verifiedAt: new Date().toISOString(), filesOnly: process.argv.includes("--files-only"), records: evidence }, null, 2));
  console.log(`Published and verified ${records.length} catalog files.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
