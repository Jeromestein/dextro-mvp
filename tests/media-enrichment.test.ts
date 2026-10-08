import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "./helpers/sample-story";
import { bindMediaPlan, imageBrief } from "../src/modules/media/generation/plan";
import { enrichStoryMedia } from "../src/modules/media/generation/enrich";
import { mergeMediaResults, addAndAssignAsset } from "../src/modules/media/assets/operations";
import type { MediaAsset } from "../src/modules/media/assets/model";
import type { Story } from "../src/modules/story/model";
const image: MediaAsset = { id: "generated-image", name: "Scene", kind: "image", source: "generated", credit: "OpenAI", data: "data:image/webp;base64,UklGRjAwMDBXRUJQdGVzdA==" };
function planned() {
  const story = sampleStory(); story.assets = []; story.passages = story.passages.map((p) => ({ ...p, media: { imageId: "", audioId: "" } }));
  story.mediaPlan = { artBrief: "Muted seaside colors", scenes: [{ id: "scene-1", description: "A quiet seaside room at dusk.", passageIds: story.passages.slice(0, 2).map((p) => p.id) }], cues: [] };
  return bindMediaPlan(story);
}
test("one generated scene serves linked passages without replacing manual assets", async () => {
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(JSON.parse(String(init?.body)).model, "gpt-image-2.5-sunburst");
    assert.equal(new Headers(init?.headers).has("X-Workshop-Code"), false);
    return Response.json({ asset: image });
  };
  try {
    const source = planned(); const updates: Story[] = [];
    await enrichStoryMedia(source, { images: true, music: false, style: "storybook", imageModel: "gpt-image-2.5-sunburst", signal: new AbortController().signal, onUpdate: (s) => updates.push(s), onStatus: () => {} });
    const result = updates.at(-1)!;
    assert.equal(calls, 1); assert.equal(result.assets.length, 1);
    assert.equal(result.passages[0].media.imageId, result.passages[1].media.imageId);
    const manual = { ...image, id: "manual", data: "data:image/webp;base64,QUJD", source: "upload" as const };
    const live = addAndAssignAsset(source, source.passages[0].id, manual);
    const merged = mergeMediaResults(live, source, result);
    assert.equal(merged.passages[0].media.imageId, "manual");
    assert.equal(merged.passages[1].media.imageId, image.id);
  } finally { globalThis.fetch = original; }
});
test("cancelled image results never reach the draft and failed requests are not retried", async () => {
  const original = globalThis.fetch; const cancel = new AbortController(); let updates = 0, calls = 0;
  try {
    globalThis.fetch = async () => { calls++; cancel.abort(); return Response.json({ asset: image }); };
    await assert.rejects(enrichStoryMedia(planned(), { images: true, music: false, style: "storybook", imageModel: "gpt-image-2.5-sunburst", signal: cancel.signal, onUpdate: () => updates++, onStatus: () => {} }));
    assert.equal(updates, 0); assert.equal(calls, 1);
    globalThis.fetch = async () => { calls++; return Response.json({ error: "Unavailable" }, { status: 502 }); };
    const warnings = await enrichStoryMedia(planned(), { images: true, music: false, style: "storybook", imageModel: "gpt-image-2.5-sunburst", signal: new AbortController().signal, onUpdate: () => updates++, onStatus: () => {} });
    assert.deepEqual(warnings, ["Unavailable"]); assert.equal(calls, 2); assert.equal(updates, 0);
  } finally { globalThis.fetch = original; }
});
test("edited scene facts invalidate old plans and async results preserve live edits and layout", async () => {
  const source = planned(); const changed = { ...source, passages: source.passages.map((p, i) => i === 0 ? { ...p, text: "A completely different setting." } : p), editor: { positions: [{ id: source.startId, x: 77, y: 88 }] } };
  assert.ok(imageBrief(changed, source.passages[0].id).scene.includes("completely different"));
  const result = addAndAssignAsset(source, source.passages[0].id, image);
  const merged = mergeMediaResults(changed, source, result);
  assert.equal(merged.passages[0].media.imageId, ""); assert.deepEqual(merged.editor, changed.editor);
  const original = globalThis.fetch; let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    assert.equal(JSON.parse(String(init?.body)).model, "gpt-image-2.5-sunburst");
    assert.equal(new Headers(init?.headers).has("X-Workshop-Code"), false);
    return Response.json({ asset: image });
  };
  try {
    const warnings = await enrichStoryMedia(changed, { images: true, music: false, style: "storybook", imageModel: "gpt-image-2.5-sunburst", signal: new AbortController().signal, onUpdate: () => {}, onStatus: () => {} });
    assert.equal(calls, 0); assert.equal(warnings.length, 1);
  } finally { globalThis.fetch = original; }
});
