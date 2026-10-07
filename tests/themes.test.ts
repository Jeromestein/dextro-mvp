import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "../src/modules/story/sample";
import { copyStory, newStory, storySchema } from "../src/modules/story/model";
import { changeSceneGlow, changeTheme, preserveAppearance, recommendTheme, resolveTheme, storyThemes, themeDeclarations, themeIds } from "../src/modules/story/themes";
import { checkDraft } from "../src/modules/generation/story-schema";
import { buildBackup, buildGame } from "../src/modules/export/standalone";
import { storedStorySchema } from "../src/modules/storage/model";
import { prepareCloudStory } from "../src/storage/cloud-repository";
import { loadStories, removeStory, saveStory } from "../src/storage/story-repository";
import { createHistory, editorReducer } from "../src/modules/editor/session/history";

test("recommendation uses mood and bilingual content with darkness taking precedence", () => {
  const story = newStory();
  assert.equal(recommendTheme(story), "parchment");
  assert.equal(recommendTheme({ ...story, genre: "Dark" }), "midnight");
  assert.equal(recommendTheme(story, { tone: "Mysterious" }), "starlight");
  assert.equal(recommendTheme(story, { tone: "Hopeful" }), "garden");
  assert.equal(recommendTheme(story, { tone: "Whimsical" }), "garden");
  assert.equal(recommendTheme(story, { tone: "Suspenseful" }), "midnight");
  assert.equal(recommendTheme(story, { tone: "Adventurous", premise: "A spaceship crosses the galaxy." }), "starlight");
  assert.equal(recommendTheme(story, { tone: "Hopeful", premise: "Haunted houses and gothic horror." }), "midnight");
  for (const [description, expected] of [["黑暗童话里的旅人", "midnight"], ["宇宙飞船的最后信号", "starlight"], ["温馨治愈的小镇", "garden"], ["王国的历史冒险", "parchment"]]) {
    assert.equal(recommendTheme({ ...story, description }), expected);
  }
  assert.equal(recommendTheme({ ...story, description: "A workspace for gardeners." }), "parchment", "do not match English word fragments");
});

test("generated recommendations remain stable and overrides survive later media results", () => {
  const checked = checkDraft(sampleStory(), { tone: "Hopeful", premise: "A haunted town in a nightmare." });
  assert.ok(checked.story);
  assert.deepEqual(checked.story.appearance, { theme: "auto", recommendation: "midnight" });
  const manual = changeSceneGlow(changeTheme(checked.story, "garden"), false);
  assert.equal(resolveTheme(manual).id, "garden");
  const incoming = { ...checked.story, description: "New media result" };
  const merged = preserveAppearance(manual, incoming);
  assert.equal(merged.description, incoming.description);
  assert.equal(resolveTheme(merged).id, "garden");
  assert.equal(resolveTheme(changeTheme(merged, "auto")).id, "midnight");
  assert.equal(changeTheme(merged, "auto").appearance?.sceneGlow, false);
  assert.equal(changeSceneGlow(merged, true).appearance?.theme, "garden");
});

test("old stories import without themes and invalid styles cannot reach an export", () => {
  const old = sampleStory();
  assert.equal(storySchema.parse(old).appearance, undefined);
  const legacy = { ...old, version: 1, assets: undefined, passages: old.passages.map(p => ({ ...p, media: undefined, image: "" })) };
  assert.equal(storySchema.parse(legacy).version, 2);
  assert.equal(resolveTheme(storySchema.parse(legacy)).id, "starlight");
  for (const appearance of [{ theme: "unknown" }, { theme: "</style><script>alert(1)</script>" }, { theme: "auto", recommendation: "unknown" }, { theme: "auto", sceneGlow: "yes" }]) {
    assert.equal(storySchema.safeParse({ ...old, appearance }).success, false);
  }
});

test("theme and scene glow selections survive local saves, backups, copies, cloud documents, and undo/redo", async () => {
  const original = sampleStory(); original.id = crypto.randomUUID();
  const story = changeSceneGlow(changeTheme(original, "midnight"), false);
  await saveStory(story);
  assert.deepEqual((await loadStories()).find(s => s.id === story.id)?.appearance, story.appearance);
  assert.deepEqual(storySchema.parse(JSON.parse(buildBackup(story))).appearance, story.appearance);
  assert.deepEqual(copyStory(story).appearance, story.appearance);
  const cloud = storedStorySchema.parse(await prepareCloudStory(story));
  assert.deepEqual(cloud.document.appearance, story.appearance);
  let history = editorReducer(createHistory(original), { type: "commit", story, time: 1 });
  history = editorReducer(history, { type: "undo" });
  assert.equal(history.present.appearance, undefined);
  history = editorReducer(history, { type: "redo" });
  assert.deepEqual(history.present.appearance, story.appearance);
  await removeStory(story.id);
});

test("standalone games embed the exact shared palette for all themes and Auto", () => {
  for (const theme of [...themeIds, "auto"] as const) {
    const story = changeSceneGlow(changeTheme(sampleStory(), theme), false);
    const html = buildGame(story);
    const resolved = resolveTheme(story);
    assert.ok(html.includes(`data-story-theme="${resolved.id}"`));
    assert.ok(html.includes(themeDeclarations(resolved)));
    assert.ok(!html.includes("https://"));
    const json = JSON.parse(html.match(/id="story-data">(.*?)<\/script>/s)![1]);
    assert.deepEqual(json.appearance, story.appearance);
  }
});

function luminance(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(part => {
    const c = parseInt(part, 16) / 255;
    return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}
test("all palettes keep readable text contrast on reading and interactive surfaces", () => {
  for (const theme of Object.values(storyThemes)) {
    const c = theme.colors;
    for (const foreground of [c.text, c.narrative, c.muted, c.accent]) {
      for (const background of [c.backdrop, c.surface, c.choice, c.hover]) {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        assert.ok((values[0] + .05) / (values[1] + .05) >= 4.5, `${theme.id}: ${foreground} on ${background}`);
      }
    }
  }
});
