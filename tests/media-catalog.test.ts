import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { musicCatalog, matchTrack } from "../src/modules/media/catalog/catalog";
import { validMediaPlan } from "../src/modules/media/generation/plan";
import { checkDraft } from "../src/modules/generation/story-schema";
import { sampleStory as makeSampleStory } from "../src/modules/story/sample";
import { buildBackup, buildGame } from "../src/modules/export/standalone";
import { addAndAssignAsset } from "../src/modules/media/assets/operations";
import type { MediaAsset } from "../src/modules/media/assets/model";

test("bundled music matches source/license records and covers the supported moods", () => {
  assert.equal(musicCatalog.length, 6);
  for (const track of musicCatalog) {
    assert.equal(track.license, "CC0-1.0"); assert.match(track.sourceUrl, /^https:\/\/freesound.org\/people\//);
    assert.match(track.path, /^\/media\/library\/music\/[\w-]+\.mp3$/);
    const file = readFileSync(new URL(`../public${track.path}`, import.meta.url));
    assert.ok(file.length > 1000 && file.length < 6_000_000);
    assert.equal(createHash("sha256").update(file).digest("hex"), track.sha256);
  }
  for (const mood of ["calm", "mysterious", "tense", "hopeful", "somber"] as const) assert.ok(matchTrack(mood));
  assert.equal(matchTrack("silence"), undefined);
});
const sampleStory = makeSampleStory();
const plan = { artBrief: "Muted seaside storybook", scenes: [{ id: "inn", description: "An empty seaside inn", passageIds: [sampleStory.startId] }], cues: [{ passageId: sampleStory.startId, mood: "calm" }] };
test("media plans reject unknown passages and conflicting shared scene assignments", () => {
  const ids = sampleStory.passages.map((p) => p.id);
  assert.ok(validMediaPlan(plan, ids));
  assert.equal(validMediaPlan({ ...plan, scenes: [{ ...plan.scenes[0], passageIds: ["missing"] }] }, ids), undefined);
  assert.equal(validMediaPlan({ ...plan, scenes: [plan.scenes[0], { ...plan.scenes[0], id: "other" }] }, ids), undefined);
  assert.equal(validMediaPlan({ ...plan, scenes: Array.from({ length: 5 }, (_, i) => ({ id: String(i), description: "A room", passageIds: [ids[i]] })) }, ids), undefined);
});
test("bad optional media planning never discards a valid story draft", () => {
  const raw = { ...sampleStory, mediaPlan: { ...plan, cues: [{ passageId: "missing", mood: "calm" }] } };
  const checked = checkDraft(raw);
  assert.ok(checked.story); assert.equal(checked.story.mediaPlan, undefined);
});
test("catalog provenance and plans survive backups; playable export contains only used files", () => {
  const track = musicCatalog[0];
  const asset: MediaAsset = { id: "music-1", kind: "audio", name: track.title, source: "catalog", data: "data:audio/mpeg;base64,QUJD", credit: `${track.author} · CC0 1.0 · ${track.sourceUrl}`,
    provenance: { provider: "freesound", catalogId: track.id, sourceUrl: track.sourceUrl, author: track.author, license: "CC0-1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", verifiedAt: track.verifiedAt } };
  let story = { ...sampleStory, mediaPlan: plan as NonNullable<typeof sampleStory.mediaPlan> };
  story = addAndAssignAsset(story, story.startId, asset) as typeof story;
  const backup = JSON.parse(buildBackup(story)); assert.equal(backup.assets.at(-1).provenance.license, "CC0-1.0");
  assert.deepEqual(backup.mediaPlan, plan);
  const html = buildGame(story); assert.ok(html.includes(track.sourceUrl)); assert.ok(!html.includes('"mediaPlan"'));
  assert.ok(!html.includes(musicCatalog[1].sourceUrl));
});
