import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { sampleStory } from "../src/modules/story/sample";
import { storySchema } from "../src/modules/story/model";
import { addAndAssignAsset, assignAsset, pruneAssets, storyByteSize } from "../src/modules/media/assets/operations";
import type { MediaAsset } from "../src/modules/media/assets/model";
import { createHistory, editorReducer } from "../src/modules/editor/session/history";
import { buildBackup, buildGame } from "../src/modules/export/standalone";
import { createAudioController, type AudioStatus } from "../src/modules/media/audio/controller";

const image: MediaAsset = { id: "image-a", kind: "image", name: "Harbor", credit: "Original artwork", source: "upload", data: "data:image/png;base64,aGVsbG8=" };
const music: MediaAsset = { id: "music-a", kind: "audio", name: "Quiet tide", credit: "Test composer", source: "upload", data: "data:audio/wav;base64,YXVkaW8=" };

test("legacy images migrate once per file while preserving story identity and layout", () => {
  const sample = sampleStory();
  const base = { ...sample, assets: undefined };
  const legacy = { ...base, version: 1, editor: { positions: [{ id: "arrival", x: 200, y: 100 }], viewport: { x: 20, y: 30, zoom: .8 } },
    passages: sample.passages.map((p, i) => ({ ...p, media: undefined, image: i < 2 ? image.data : "" })) };
  const before = structuredClone(legacy);
  const migrated = storySchema.parse(legacy);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.assets.length, 1);
  assert.equal(migrated.id, legacy.id);
  assert.deepEqual(migrated.editor, legacy.editor);
  assert.deepEqual(migrated.passages.map((p) => p.choices), legacy.passages.map((p) => p.choices));
  assert.equal(migrated.passages[0].media.imageId, migrated.passages[1].media.imageId);
  assert.deepEqual(legacy, before, "reading must not mutate the legacy record");
  assert.deepEqual(storySchema.parse(migrated), migrated);
});

test("shared replacement is passage-specific, and pruning remains undoable", () => {
  let story = addAndAssignAsset(sampleStory(), "arrival", image);
  story = assignAsset(story, "letter", "image", image.id);
  assert.equal(addAndAssignAsset(story, "letter", { ...image, id: "duplicate" }).assets.length, 1);
  const original = story;
  story = addAndAssignAsset(story, "arrival", { ...image, id: "image-b", data: "data:image/png;base64,bmV3" });
  assert.equal(story.passages[1].media.imageId, image.id);
  assert.equal(original.passages[0].media.imageId, image.id);
  assert.equal(story.assets.length, 2);
  story = assignAsset(assignAsset(story, "arrival", "image", ""), "letter", "image", "");
  const history = editorReducer(createHistory(story), { type: "commit", story: pruneAssets(story), time: 1 });
  assert.equal(history.present.assets.length, 0);
  assert.deepEqual(editorReducer(history, { type: "undo" }).present, story);
});

test("bad references, wrong asset kinds, duplicate IDs and remote audio are rejected", () => {
  const story = addAndAssignAsset(sampleStory(), "arrival", music);
  for (const candidate of [
    { ...story, assets: [] },
    { ...story, assets: [music, music] },
    { ...story, assets: [{ ...music, data: "https://example.com/song.mp3" }] },
    { ...story, passages: story.passages.map((p) => ({ ...p, media: { imageId: music.id, audioId: "" } })) },
  ]) assert.equal(storySchema.safeParse(candidate).success, false);
  assert.equal(assignAsset(story, "arrival", "image", music.id), story);
  assert.equal(addAndAssignAsset(story, "deleted", image), story);
});

test("backups and HTML embed used assets once, preserve credits and enforce the size limit", () => {
  let story = addAndAssignAsset(addAndAssignAsset(sampleStory(), "arrival", image), "arrival", music);
  story = assignAsset(story, "letter", "audio", music.id);
  story.assets.push({ ...image, id: "unused" });
  assert.equal(storyByteSize(story), new TextEncoder().encode(JSON.stringify(story)).length);
  const backup = buildBackup(story);
  const restored = storySchema.parse(JSON.parse(backup));
  assert.equal(restored.assets.length, 2);
  assert.equal(backup.split(music.data).length - 1, 1);
  assert.equal(restored.assets[1].credit, music.credit);
  const html = buildGame(story);
  assert.equal(html.split(music.data).length - 1, 1);
  assert.ok(html.includes("Enable sound") && html.includes("Media credits"));
  assert.ok(!html.includes("https://"));
  const oversized = { ...story, assets: Array.from({ length: 9 }, (_, i) => ({ ...image, id: `large-${i}`, data: "data:image/png;base64," + "A".repeat(2_880_000) })),
    passages: story.passages.map((p, i) => ({ ...p, media: { imageId: `large-${i}`, audioId: "" } })) };
  assert.throws(() => buildBackup(oversized), /24 MB/);
});

test("shared audio engine handles user consent, continuity, rapid changes, silence and cleanup", async () => {
  const instances: FakeAudio[] = [];
  let now = 0;
  const timers = new Map<number, () => void>();
  let serial = 0;
  class FakeAudio {
    loop = false; volume = 0; paused = true; src: string;
    onerror?: () => void;
    constructor(src: string) { this.src = src; instances.push(this); }
    play() { this.paused = false; return this.src === "reject" ? Promise.reject(new Error("blocked")) : Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute() { this.src = ""; }
    load() {}
  }
  const target = new EventTarget();
  const makeController = runInNewContext(`(${createAudioController.toString()})`, {
    Audio: FakeAudio, window: target, CustomEvent, Date: { now: () => now },
    setInterval: (fn: () => void) => { timers.set(++serial, fn); return serial; },
    clearInterval: (id: number) => timers.delete(id),
  }) as typeof createAudioController;
  const tick = () => { now += 1100; [...timers.values()].forEach((fn) => fn()); };
  const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
  const states: AudioStatus[] = [];
  const audio = makeController((status) => states.push(status));
  audio.setTrack("one");
  assert.equal(instances.length, 0, "sound requires an explicit enable action");
  audio.enable(); await flush(); tick();
  audio.setTrack("one");
  assert.equal(instances.length, 1, "same track must not restart");
  assert.equal(instances[0].volume, .35);
  audio.setTrack("two"); audio.setTrack("three"); await flush(); tick();
  assert.equal(instances.filter((a) => !a.paused).length, 1);
  assert.equal(instances.at(-1)!.src, "three");
  audio.setTrack(""); tick();
  assert.equal(instances.filter((a) => !a.paused).length, 0);
  assert.equal(states.at(-1), "silent");
  audio.setTrack("one"); await flush(); tick();
  const audition = makeController(() => {}); audition.setTrack("audition"); audition.enable(); await flush(); tick();
  assert.equal(states.at(-1), "off", "audition takes ownership from story playback");
  assert.equal(instances.filter((a) => !a.paused).length, 1);
  audition.mute(); audio.setTrack("reject"); audio.enable(); await flush();
  assert.equal(states.at(-1), "blocked");
  assert.equal(instances.filter((a) => !a.paused).length, 0);
  audio.dispose(); audition.dispose();
  assert.equal(timers.size, 0);
});
