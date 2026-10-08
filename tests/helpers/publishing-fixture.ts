import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID, createHash } from "node:crypto";
import { sampleStory } from "../../src/modules/story/sample";
import type { StoredStory } from "../../src/modules/storage/model";

// PostgreSQL-backed Supabase transport for integration tests and isolated UI QA.
// This helper never connects to the configured production database.
export async function publishingFixture() {
  const db = new PGlite(), owner = "8dc1ba9a-adf2-48ff-8dec-c0b4152e326a";
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key); create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);");
  for (const migration of ["202610060001_cloud_storage.sql", "202610080001_story_publishing.sql"]) await db.exec(await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), "utf8"));
  const files = new Map<string, { bytes: Buffer; mime: string }>();
  const story = sampleStory(); story.id = "publishing-qa"; story.title = "Publishing QA — The Last Light";
  const image = await readFile(new URL("../../public/media/demo/scene-placeholder.png", import.meta.url));
  const assetId = randomUUID(), objectKey = `owners/${owner}/assets/${assetId}/original`, digest = createHash("sha256").update(image).digest("hex");
  files.set(objectKey, { bytes: image, mime: "image/png" });
  await db.query("insert into media_assets(id,owner_id,kind,source,state,name,credit,mime_type,byte_size,sha256,object_key) values($1,$2,'image','upload','ready','Lighthouse','Dextro QA','image/png',$3,$4,$5)", [assetId, owner, image.length, digest, objectKey]);
  story.passages[0].media.imageId = "opening-image";
  const stored: StoredStory = { title: story.title, description: story.description, genre: story.genre, document: {
    startId: story.startId, passages: story.passages, assets: [{ id: "opening-image", assetId, name: "Lighthouse", credit: "Dextro QA" }],
  } };
  await db.query("select dextro_save_story($1,$2,0,$3,$4,$5::jsonb)", [owner, story.id, randomUUID(), JSON.stringify(stored), JSON.stringify(stored)]);
  const tables = new Set(["stories", "story_versions", "story_asset_refs", "story_publications", "publication_operations", "app_users", "media_assets", "generation_jobs", "generation_attempts"]);
  const identifier = (name: string) => { if (!/^[a-z_]+$/.test(name)) throw new Error("Invalid fixture identifier"); return name; };
  async function fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const request = new Request(input, init), url = new URL(request.url), path = url.pathname;
    try {
      if (path.includes("/storage/v1/object/")) {
        const key = decodeURIComponent(path.split("/user-media/")[1] || ""), file = files.get(key);
        if (!file) return Response.json({ message: "Fixture file not found" }, { status: 404 });
        return new Response(new Uint8Array(file.bytes), { headers: { "Content-Type": file.mime } });
      }
      if (path.startsWith("/rest/v1/rpc/")) {
        const name = identifier(path.split("/").at(-1)!);
        if (!["dextro_save_story", "dextro_publish_story"].includes(name)) throw new Error("Unexpected fixture RPC");
        const args = await request.json() as Record<string, unknown>, entries = Object.entries(args);
        const result = await db.query<{ result: unknown }>(`select ${name}(${entries.map(([key], i) => `${identifier(key)} => $${i + 1}`).join(",")}) as result`, entries.map(([, value]) => value && typeof value === "object" ? JSON.stringify(value) : value));
        return Response.json(result.rows[0].result);
      }
      const table = path.split("/").at(-1)!;
      if (!tables.has(table)) throw new Error(`Unexpected fixture table ${table}`);
      if (request.method !== "GET" && request.method !== "HEAD") throw new Error(`Unexpected fixture write ${request.method} ${table}`);
      let rows = (await db.query<Record<string, unknown>>(`select * from ${table}`)).rows;
      for (const [key, expression] of url.searchParams) {
        if (["select", "order", "offset", "limit"].includes(key)) continue;
        identifier(key);
        const dot = expression.indexOf("."), op = expression.slice(0, dot), value = expression.slice(dot + 1);
        rows = rows.filter(row => {
          if (op === "eq") return String(row[key]) === value;
          if (op === "neq") return String(row[key]) !== value;
          if (op === "is") return value === "null" ? row[key] === null : String(row[key]) === value;
          if (op === "not" && value === "is.null") return row[key] !== null;
          if (op === "in") return value.slice(1, -1).split(",").map(v => v.replace(/^"|"$/g, "")).includes(String(row[key]));
          throw new Error(`Unexpected fixture filter ${op}`);
        });
      }
      const order = url.searchParams.get("order");
      if (order) rows.sort((a, b) => { for (const term of order.split(",")) { const [field, direction] = term.split("."); const x = String(a[field]), y = String(b[field]); const diff = x < y ? -1 : x > y ? 1 : 0; if (diff) return direction === "desc" ? -diff : diff; } return 0; });
      const offset = Number(url.searchParams.get("offset") || 0), limit = Number(url.searchParams.get("limit") || rows.length);
      rows = rows.slice(offset, offset + limit);
      const select = url.searchParams.get("select");
      if (select && select !== "*") rows = rows.map(row => Object.fromEntries(select.split(",").map(key => [key, row[key]])));
      if (request.headers.get("accept")?.includes("application/vnd.pgrst.object+json")) {
        if (rows.length !== 1) return Response.json({ code: "PGRST116", details: `The result contains ${rows.length} rows`, message: "JSON object requested, multiple (or no) rows returned" }, { status: 406 });
        return Response.json(rows[0]);
      }
      return Response.json(rows);
    } catch (error) { return Response.json({ code: "P0001", message: (error as Error).message }, { status: 400 }); }
  }
  return { db, owner, storyId: story.id, assetId, files, fetch, close: () => db.close() };
}
