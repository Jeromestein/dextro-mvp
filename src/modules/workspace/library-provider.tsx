"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { loadStories, saveStory, removeStory } from "@/storage/story-repository";
import { requireStorySize } from "@/modules/media/assets/operations";
import type { Story } from "@/modules/story/model";

function useLibraryState() {
  const [stories, setStories] = useState<Story[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const writes = useRef(0);
  useEffect(() => {
    loadStories().then(setStories).catch((error) => setStorageError(error.message)).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (writes.current || storageError) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [storageError]);
  const persistStory = useCallback((story: Story) => {
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    try { requireStorySize(stamped); } catch (error) {
      setStorageError((error as Error).message);
      return false;
    }
    setStories((previous) => [stamped, ...previous.filter((item) => item.id !== stamped.id)]);
    writes.current++;
    setSaving(true);
    saveQueue.current = saveQueue.current.then(() => saveStory(stamped))
      .then(() => setStorageError(""))
      .catch((error) => setStorageError(error.message))
      .finally(() => { writes.current--; if (!writes.current) setSaving(false); });
    return true;
  }, []);
  const deleteSavedStory = async (id: string) => {
    await saveQueue.current;
    await removeStory(id);
    setStories((previous) => previous.filter((story) => story.id !== id));
  };
  return { stories, ready, storageError, saving, persistStory, deleteSavedStory };
}
const LibraryContext = createContext<ReturnType<typeof useLibraryState> | null>(null);
export function LibraryProvider({ children }: { children: ReactNode }) {
  return <LibraryContext.Provider value={useLibraryState()}>{children}</LibraryContext.Provider>;
}
export function useLibrary() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("Library provider is missing.");
  return value;
}
