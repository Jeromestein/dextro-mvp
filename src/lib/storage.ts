import { storySchema, type Story } from "./story";
const DB = "dextro-studio-v1";
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("stories", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Browser storage is unavailable. Export a backup before leaving.",
        ),
      );
    request.onblocked = () =>
      reject(new Error("Close other Dextro tabs and try again."));
  });
}
export async function loadStories(): Promise<Story[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("stories", "readonly");
    const req = tx.objectStore("stories").getAll();
    req.onsuccess = () => {
      try {
        resolve(
          req.result
            .map((s) => storySchema.parse(s))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      } catch {
        reject(
          new Error(
            "A saved story could not be read. Existing data has been preserved.",
          ),
        );
      }
    };
    req.onerror = () => reject(new Error("Could not read your saved stories."));
    tx.oncomplete = () => db.close();
    tx.onabort = () => {
      db.close();
      reject(new Error("Could not read your saved stories."));
    };
  });
}
async function write(action: (store: IDBObjectStore) => void) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("stories", "readwrite");
    action(tx.objectStore("stories"));
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(
        new Error(
          "Your changes could not be saved. Storage may be full. Export a backup before leaving.",
        ),
      );
    };
  });
}
export const saveStory = (story: Story) => write((store) => store.put(story));
export const removeStory = (id: string) => write((store) => store.delete(id));
