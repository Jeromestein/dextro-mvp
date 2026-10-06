import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import { sampleStory } from "../src/modules/story/sample";
import { saveStory, loadStories, removeStory } from "../src/storage/story-repository";
import { addAndAssignAsset, pruneAssets, assignAsset } from "../src/modules/media/assets/operations";

// Node supplies Blob but not FileReader; preserve the browser API used by the repository.
class TestFileReader {
  result = "";
  onload?: () => void;
  onerror?: () => void;
  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((bytes) => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString("base64")}`; this.onload?.(); }).catch(() => this.onerror?.());
  }
}
Object.defineProperty(globalThis, "FileReader", { value: TestFileReader, configurable: true });
const open = (version = 2) => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("dextro-studio-v1", version);
  request.onupgradeneeded = () => request.result.createObjectStore("stories", { keyPath: "id" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
async function records() {
  const db = await open();
  return new Promise<{ stories: Record<string, unknown>[]; media: { blob: Blob }[] }>((resolve) => {
    const tx = db.transaction(["stories", "media"]);
    const stories = tx.objectStore("stories").getAll();
    const media = tx.objectStore("media").getAll();
    tx.oncomplete = () => { db.close(); resolve({ stories: stories.result, media: media.result }); };
  });
}

test("repository migrates atomically, avoids repeated media writes, and restores media after undo", async (t) => {
  const sample = sampleStory();
  const legacy = { ...sample, version: 1, assets: undefined,
    passages: sample.passages.map((p, i) => ({ ...p, media: undefined, image: i < 2 ? "data:image/png;base64,aGVsbG8=" : "" })) };
  const db = await open(1);
  await new Promise<void>((resolve) => { const tx = db.transaction("stories", "readwrite"); tx.objectStore("stories").put(legacy); tx.oncomplete = () => { db.close(); resolve(); }; });
  let [story] = await loadStories();
  assert.equal(story.version, 2);
  assert.equal((await records()).stories[0].version, 1, "read alone preserves the old stored record");
  let abortMediaWrite = true, mediaWrites = 0;
  const original = IDBObjectStore.prototype.put;
  t.mock.method(IDBObjectStore.prototype, "put", function(this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
    const result = original.call(this, value, key);
    if (this.name === "media") {
      mediaWrites++;
      if (abortMediaWrite) result.addEventListener("success", () => this.transaction.abort());
    }
    return result;
  });
  await assert.rejects(saveStory(story), /could not be saved/);
  assert.equal((await records()).stories[0].version, 1, "an aborted migration cannot replace the legacy record");
  assert.equal((await records()).media.length, 0);
  abortMediaWrite = false;
  await saveStory(story);
  const saved = await records();
  assert.equal(saved.stories[0].version, 2);
  assert.ok(!JSON.stringify(saved.stories).includes("data:image"));
  assert.equal(saved.media.length, 1);
  assert.ok(saved.media[0].blob instanceof Blob);
  assert.deepEqual((await loadStories())[0], story);
  const count = mediaWrites;
  await saveStory({ ...story, title: "Only text changed" });
  assert.equal(mediaWrites, count, "editing text does not rewrite file bytes");
  story = addAndAssignAsset(story, "arrival", { id: "track", kind: "audio", name: "Audio", data: "data:audio/wav;base64,YXVkaW8=", source: "upload", credit: "Author" });
  await saveStory(story);
  const withoutImage = pruneAssets(assignAsset(assignAsset(story, "arrival", "image", ""), "letter", "image", ""));
  await saveStory(withoutImage);
  assert.equal((await records()).media.length, 1);
  await saveStory(story); // The undo snapshot retains bytes even after persisted unused media was removed.
  assert.deepEqual((await loadStories())[0], story);
  assert.equal((await records()).media.length, 2);
  await removeStory(story.id);
  assert.deepEqual(await records(), { stories: [], media: [] });
});
