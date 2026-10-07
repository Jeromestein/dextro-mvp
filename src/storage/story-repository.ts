import { storySchema, type Story } from "@/modules/story/model";
import { requireStorySize } from "@/modules/media/assets/operations";
import { openingImageId, summarize, type StorySummary } from "@/modules/storage/model";

const DB = "dextro-studio-v1";
type StoredMedia = { storyId: string; assetId: string; blob: Blob };
const persistedData = new Map<string, Map<string, string>>();
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 2);
    let blocked = false;
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("stories")) db.createObjectStore("stories", { keyPath: "id" });
      if (!db.objectStoreNames.contains("media")) db.createObjectStore("media", { keyPath: ["storyId", "assetId"] });
    };
    request.onsuccess = () => {
      const db = request.result;
      if (blocked) { db.close(); return; }
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(new Error("Browser storage is unavailable. Export a backup before leaving."));
    request.onblocked = () => { blocked = true; reject(new Error("Close other Dextro tabs and reload to update media storage.")); };
  });
}
function toBlob(data: string) {
  const [header, base64] = data.split(",");
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: header.slice(5).split(";")[0] });
}
function fromBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read saved media."));
    reader.readAsDataURL(blob);
  });
}
// The library reads metadata and opening images only, leaving other media on disk.
export async function listLocalStories(): Promise<StorySummary[]> {
  const db = await openDB();
  const records = await new Promise<{ stories: Story[]; covers: Map<string, Blob> }>((resolve, reject) => {
    const tx = db.transaction(["stories", "media"], "readonly");
    const stories = tx.objectStore("stories").getAll();
    const covers = new Map<string, Blob>();
    stories.onsuccess = () => {
      try {
        for (const record of stories.result) {
          if (record.version !== 2) continue;
          const imageId = openingImageId(record);
          if (!record.assets.some((a: Story["assets"][number]) => a.id === imageId && a.kind === "image")) continue;
          const cover = tx.objectStore("media").get([record.id, imageId]);
          cover.onsuccess = () => { if (cover.result?.blob) covers.set(record.id, cover.result.blob); };
        }
      } catch { tx.abort(); }
    };
    tx.oncomplete = () => { db.close(); resolve({ stories: stories.result, covers }); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Could not read your saved stories. Existing data has been preserved.")); };
  });
  try {
    const summaries = await Promise.all(records.stories.map(async record => {
      const story = record.version === 2 ? record : storySchema.parse(record);
      const summary = summarize(story);
      const cover = records.covers.get(story.id);
      // An unreadable preview should not hide the story or prevent opening it.
      if (cover) summary.coverSrc = await fromBlob(cover).catch(() => undefined);
      return summary;
    }));
    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch { throw new Error("A saved story could not be read. Existing data has been preserved."); }
}
export async function loadStory(id: string): Promise<Story> {
  const [story] = await loadStories(id);
  if (!story) throw new Error("This game was not found in this browser.");
  return story;
}
export async function loadStories(storyId?: string): Promise<Story[]> {
  const db = await openDB();
  const records = await new Promise<{ stories: unknown[]; media: StoredMedia[] }>((resolve, reject) => {
    const tx = db.transaction(["stories", "media"], "readonly");
    const stories = tx.objectStore("stories").getAll(storyId);
    const media = tx.objectStore("media").getAll(storyId === undefined ? undefined : IDBKeyRange.bound([storyId], [storyId, []]));
    tx.oncomplete = () => { db.close(); resolve({ stories: stories.result, media: media.result }); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Could not read your saved stories. Existing data has been preserved.")); };
  });
  try {
    const bytes = new Map<string, string>();
    await Promise.all(records.media.map(async (item) => bytes.set(JSON.stringify([item.storyId, item.assetId]), await fromBlob(item.blob))));
    const stories = records.stories.map((raw) => {
      const record = raw as Story;
      const input = record.version === 2 ? { ...record, assets: record.assets.map((a) => ({ ...a, data: bytes.get(JSON.stringify([record.id, a.id])) })) } : record;
      return storySchema.parse(input);
    });
    stories.forEach((story) => {
      // Legacy images were read from the story, not persisted in the media store yet.
      persistedData.set(story.id, new Map(story.assets.filter((a) => bytes.has(JSON.stringify([story.id, a.id]))).map((a) => [a.id, a.data])));
    });
    return stories.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    throw new Error("A saved story or media file could not be read. Existing data has been preserved.");
  }
}
export async function saveStory(story: Story): Promise<void> {
  requireStorySize(story);
  const previous = persistedData.get(story.id) || new Map<string, string>();
  const changed = story.assets.filter((a) => previous.get(a.id) !== a.data).map((a) => ({ storyId: story.id, assetId: a.id, blob: toBlob(a.data) }));
  const metadata = { ...story, assets: story.assets.map((asset) => ({ ...asset, data: undefined })) };
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["stories", "media"], "readwrite");
    tx.oncomplete = () => { db.close(); persistedData.set(story.id, new Map(story.assets.map((a) => [a.id, a.data]))); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Your changes could not be saved. Storage may be full. Export a backup before leaving.")); };
    try {
      tx.objectStore("stories").put(metadata);
      const media = tx.objectStore("media");
      changed.forEach((asset) => media.put(asset));
      const kept = new Set(story.assets.map((a) => a.id));
      const cursor = media.openKeyCursor(IDBKeyRange.bound([story.id], [story.id, []]));
      cursor.onsuccess = () => {
        const row = cursor.result;
        if (!row) return;
        const [, assetId] = row.primaryKey as [string, string];
        if (!kept.has(assetId)) media.delete(row.primaryKey);
        row.continue();
      };
    } catch { tx.abort(); }

  });
}
export async function removeStory(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["stories", "media"], "readwrite");
    tx.objectStore("stories").delete(id);
    tx.objectStore("media").delete(IDBKeyRange.bound([id], [id, []]));
    tx.oncomplete = () => { db.close(); persistedData.delete(id); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Could not delete this story. Your saved data has been preserved.")); };
  });
}
