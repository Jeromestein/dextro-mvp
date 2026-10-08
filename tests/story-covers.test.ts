import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/stories/route";
import { sampleStory } from "../src/modules/story/sample";
import { addAndAssignAsset } from "../src/modules/media/assets/operations";
import { summarize, type StoredStory } from "../src/modules/storage/model";

test("cloud summaries point to the opening image without downloading story media", async t => {
  const saved = { ...process.env };
  const env = { STORAGE_MODE: "supabase", INTERNAL_TEST_OWNER_ID: "8dc1ba9a-adf2-48ff-8dec-c0b4152e326a", SUPABASE_URL: "https://coverstest.supabase.co", SUPABASE_SECRET_KEY: "test-only" };
  Object.assign(process.env, env);
  t.after(() => { for (const key of Object.keys(env)) { if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key]; } });
  const first = "3467d48c-18e4-4c6d-a426-91c47024b681", opening = "8c1426af-8ec4-4432-976d-44f59d0bf976";
  const story = sampleStory();
  const document: StoredStory["document"] = {
    startId: "letter",
    passages: story.passages.map(p => ({ ...p, media: { imageId: p.id === "arrival" ? "first" : p.id === "letter" ? "opening" : "", audioId: "" } })),
    assets: [{ id: "first", assetId: first, name: "First image", credit: "" }, { id: "opening", assetId: opening, name: "Opening image", credit: "" }],
  };
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === "/rest/v1/story_publications") return Response.json([]);
    assert.equal(url.pathname, "/rest/v1/stories", "a list request never downloads media or loads individual stories");
    assert.equal(url.searchParams.get("owner_id"), `eq.${env.INTERNAL_TEST_OWNER_ID}`);
    return Response.json([{ id: story.id, title: story.title, description: story.description, genre: story.genre, updated_at: story.updatedAt, passage_count: story.passages.length, ending_count: 3, status: "ready", revision: 1, document }]);
  });
  const list = async () => {
    const response = await GET(new Request("http://localhost:3100/api/stories"));
    assert.equal(response.status, 200);
    return (await response.json()).stories[0];
  };
  const summary = await list();
  assert.equal(summary.coverSrc, `/api/assets/${opening}/content`);
  assert.equal(summary.document, undefined);
  assert.equal(summary.assets, undefined);
  document.startId = "arrival";
  assert.equal((await list()).coverSrc, `/api/assets/${first}/content`);
  document.startId = "missing";
  assert.equal((await list()).coverSrc, undefined);
  document.startId = "letter";
  document.assets = document.assets.filter(a => a.id !== "opening");
  assert.equal((await list()).coverSrc, undefined);
});

test("unsynced changes update the cover immediately without adding a separate cover asset", () => {
  const image = { id: "opening-image", kind: "image" as const, name: "Opening", source: "upload" as const, credit: "", data: "data:image/png;base64,aGVsbG8=" };
  const story = addAndAssignAsset(sampleStory(), "letter", image);
  assert.equal(summarize(story).coverSrc, undefined);
  const updated = { ...story, startId: "letter" };
  assert.equal(summarize(updated).coverSrc, image.data);
  assert.equal(updated.assets.length, 1);
});
