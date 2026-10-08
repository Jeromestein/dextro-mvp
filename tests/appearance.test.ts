import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "../src/modules/story/sample";
import { copyStory, newStory, storySchema } from "../src/modules/story/model";
import { changeSceneGlow, preserveAppearance } from "../src/modules/story/appearance";
import { checkDraft } from "../src/modules/generation/story-schema";
import { buildBackup, buildGame } from "../src/modules/export/standalone";
import { storedStorySchema } from "../src/modules/storage/model";
import { prepareCloudStory } from "../src/storage/cloud-repository";
import { loadStories, removeStory, saveStory } from "../src/storage/story-repository";
import { createHistory, editorReducer } from "../src/modules/editor/session/history";

test("new drafts do not generate theme recommendations and glow changes survive later media results", () => {
  const checked = checkDraft(sampleStory());
  assert.ok(checked.story);
  assert.equal(checked.story.appearance, undefined);
  assert.equal(newStory().appearance, undefined);
  const changed = changeSceneGlow(checked.story, false);
  assert.deepEqual(changed.appearance, { sceneGlow: false });
  const incoming = { ...checked.story, description: "New media result" };
  const merged = preserveAppearance(changed, incoming);
  assert.equal(merged.description, incoming.description);
  assert.deepEqual(merged.appearance, { sceneGlow: false });
});

test("legacy stories remain readable and invalid appearance data is rejected", () => {
  const old = sampleStory();
  assert.equal(storySchema.parse(old).appearance, undefined);
  const legacy = { ...old, version: 1, assets: undefined, passages: old.passages.map(p => ({ ...p, media: undefined, image: "" })) };
  assert.equal(storySchema.parse(legacy).version, 2);
  assert.equal(storySchema.parse(legacy).appearance, undefined);
  for (const appearance of [{ theme: "unknown" }, { theme: "</style><script>alert(1)</script>" }, { theme: "auto", recommendation: "unknown" }, { sceneGlow: "yes" }]) {
    assert.equal(storySchema.safeParse({ ...old, appearance }).success, false);
  }
});

test("glow settings and legacy metadata survive local saves, backups, copies, cloud documents, and undo/redo", async () => {
  for (const appearance of [undefined, { theme: "auto" as const, recommendation: "midnight" as const }, { theme: "garden" as const }]) {
    const original = { ...sampleStory(), id: crypto.randomUUID(), appearance };
    const story = changeSceneGlow(original, false);
    await saveStory(story);
    assert.deepEqual((await loadStories()).find(s => s.id === story.id)?.appearance, story.appearance);
    assert.deepEqual(storySchema.parse(JSON.parse(buildBackup(story))).appearance, story.appearance);
    assert.deepEqual(copyStory(story).appearance, story.appearance);
    const cloud = storedStorySchema.parse(await prepareCloudStory(story));
    assert.deepEqual(cloud.document.appearance, story.appearance);
    let history = editorReducer(createHistory(original), { type: "commit", story, time: 1 });
    history = editorReducer(history, { type: "undo" });
    assert.deepEqual(history.present.appearance, original.appearance);
    history = editorReducer(history, { type: "redo" });
    assert.deepEqual(history.present.appearance, story.appearance);
    await removeStory(story.id);
  }
});

test("standalone presentation ignores legacy themes while keeping backup metadata intact", () => {
  const original = sampleStory();
  const baseline = buildGame(original).split('<script type="application/json"')[0];
  for (const theme of ["midnight", "starlight", "parchment", "garden", "auto"] as const) {
    const story = { ...original, appearance: { theme, recommendation: "starlight" as const, sceneGlow: false } };
    const html = buildGame(story);
    assert.equal(html.split('<script type="application/json"')[0], baseline, "legacy palette choices cannot override image-driven presentation");
    assert.ok(!html.includes("https://"));
    const json = JSON.parse(html.match(/id="story-data">(.*?)<\/script>/s)![1]);
    assert.deepEqual(json.appearance, story.appearance);
  }
});
