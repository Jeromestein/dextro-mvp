import test from "node:test";
import assert from "node:assert/strict";

import records from "../resources/music-library/catalog.json";
import { catalogRecordSchema, catalogAssetId, type CatalogTrack } from "../src/modules/media/catalog/model";
import { recommendTracks, planMusic, storyMusicTheme } from "../src/modules/media/catalog/recommend";
const musicCatalog: CatalogTrack[] = records.map(({record}) => ({...catalogRecordSchema.parse(record), url: `https://test.supabase.co/storage/v1/object/public/music-library/${record.objectPath}`})).filter(t => t.role === "music");
import { validMediaPlan } from "../src/modules/media/generation/plan";
import { checkDraft } from "../src/modules/generation/story-schema";
import { sampleStory as makeSampleStory } from "./helpers/sample-story";
import { buildBackup, buildGame } from "../src/modules/export/standalone";
import { addAndAssignAsset } from "../src/modules/media/assets/operations";
import type { MediaAsset } from "../src/modules/media/assets/model";

test("published catalog has licensed, versioned music and separate effects", () => {
  assert.equal(musicCatalog.length, 24);
  assert.equal(records.filter(t => t.record.role === "sfx").length, 3);
  assert.equal(new Set(records.map(t => t.record.id)).size, records.length);
  assert.equal(new Set(records.map(t => t.record.sha256)).size, records.length, "Each addition must contain different audio");
  for (const {record} of records) {
    const track = catalogRecordSchema.parse(record);
    assert.ok(track.byteSize > 1000 && track.byteSize < 6_000_000);
    assert.ok(track.objectPath.includes(track.sha256));
    assert.ok(catalogAssetId(track).length <= 100);
    assert.equal(catalogRecordSchema.safeParse({...track, sha256: "a".repeat(64)}).success, false);
    assert.equal(catalogRecordSchema.safeParse({...track, sourceUrl: "invalid"}).success, false);
  }
  for (const mood of ["calm", "mysterious", "tense", "hopeful", "somber"] as const) {
    assert.ok(musicCatalog.some(t => t.autoEligible && t.moods.includes(mood)));
  }
});
test("recommendations use story themes, remain stable and exclude short loops", () => {
  const story = {...makeSampleStory(), genre: "Sci-fi"};
  assert.equal(storyMusicTheme(story), "scifi");
  const picks = recommendTracks(musicCatalog, story, "mysterious");
  assert.equal(picks.length, 3);
  assert.ok(picks.every(t => t.themes.includes("scifi") && t.duration >= 25));
  assert.deepEqual(recommendTracks(musicCatalog.slice().reverse(), story, "mysterious"), picks);
  assert.deepEqual(recommendTracks(musicCatalog, story, "silence"), []);
  const cozy = {...story, genre: "温馨日常"};
  assert.equal(storyMusicTheme(cozy), "cozy");
  assert.ok(recommendTracks(musicCatalog, cozy, "calm").every(t => t.themes.includes("cozy")));
});
test("automatic scoring limits the palette, preserves manual choices and silence", () => {
  const story = makeSampleStory();
  const moods = ["calm", "mysterious", "tense", "hopeful", "somber", "silence"] as const;
  story.mediaPlan = {artBrief: "", scenes: [], cues: story.passages.map((p, i) => ({passageId: p.id, mood: moods[i % moods.length]}))};
  story.passages[0].media.audioId = "manual-track";
  const assignments = planMusic(musicCatalog, story);
  assert.ok(new Set([...assignments.values()].map(t => t.id)).size <= 4);
  assert.ok(assignments.size > 0);
  assert.equal(assignments.has(story.passages[0].id), false);
  for (const cue of story.mediaPlan.cues) {
    const track = assignments.get(cue.passageId);
    if (cue.mood === "silence") assert.equal(track, undefined);
    else if (track) assert.ok(track.moods.includes(cue.mood));
  }
  assert.equal(planMusic([], story).size, 0);
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
