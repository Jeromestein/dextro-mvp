"use client";
import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { loadStories, saveStory, removeStory } from "@/storage/story-repository";
import { clearUploadCache, listCloudStories, prepareCloudStory, readCloudStory, requestJSON, storageStatus, writePreparedStory } from "@/storage/cloud-repository";
import { pendingSaves, persistPending, replacePending, type PendingSave } from "@/storage/cloud-outbox";
import { summarize, type StorageStatus, type StorySummary } from "@/modules/storage/model";
import { requireStorySize } from "@/modules/media/assets/operations";
import { copyStory, type Story } from "@/modules/story/model";

function useLibraryState() {
  const [stories, setStories] = useState<StorySummary[]>([]);
  const [ready, setReady] = useState(false);
  const [available, setAvailable] = useState(false);
  const [cloud, setCloud] = useState(false);
  const [scope, setScope] = useState("local");
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [recovery, setRecovery] = useState<Story[]>([]);
  const config = useRef<StorageStatus | null>(null);
  const loaded = useRef(new Map<string, Story>());
  const revisions = useRef(new Map<string, number>());
  const queue = useRef<PendingSave[]>([]);
  const staged = useRef(Promise.resolve());
  const draining = useRef(false);
  const blocked = useRef(false);
  const writes = useRef(0);
  const updateRecovery = useCallback(() => {
    setRecovery([...new Map(queue.current.map(entry => [entry.story.id, entry.story])).values()]);
  }, []);
  const drain = useCallback(async () => {
    if (draining.current || blocked.current || config.current?.mode !== "supabase" || !config.current.available) return;
    draining.current = true;
    setSaving(true);
    try {
      while (queue.current.length) {
        const entry = queue.current[0];
        // Record the exact asset references before sending a save. A lost response
        // can then replay the same immutable mutation after a browser restart.
        if (!entry.prepared) entry.prepared = await prepareCloudStory(entry.story);
        await persistPending(config.current.scope, entry);
        const result = await writePreparedStory(entry.story.id, entry.prepared, entry.baseRevision, entry.mutationId, entry.status);
        await persistPending(config.current.scope, entry.key);
        queue.current.shift();
        revisions.current.set(entry.story.id, result.revision);
        setStories(previous => previous.map(item => item.id === entry.story.id ? { ...item, revision: result.revision } : item));
        updateRecovery();
      }
      setStorageError("");
    } catch (error) {
      blocked.current = true;
      setStorageError((error as Error).message);
    } finally {
      draining.current = false;
      if (!writes.current) setSaving(false);
    }
  }, [updateRecovery]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await storageStatus();
        if (cancelled) return;
        config.current = status;
        setScope(status.scope);
        clearUploadCache();
        setCloud(status.mode === "supabase");
        if (status.mode === "local") {
          const local = await loadStories();
          if (cancelled) return;
          local.forEach(story => loaded.current.set(story.id, story));
          setStories(local.map(story => summarize(story)));
        } else {
          const [remote, pending] = await Promise.all([status.available ? listCloudStories() : Promise.resolve([]), pendingSaves(status.scope)]);
          if (cancelled) return;
          remote.forEach(item => revisions.current.set(item.id, item.revision));
          queue.current = pending;
          const merged = new Map(remote.map(item => [item.id, item]));
          pending.forEach(entry => { loaded.current.set(entry.story.id, entry.story); merged.set(entry.story.id, summarize(entry.story, entry.baseRevision, entry.status)); });
          setStories([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
          updateRecovery();
          void drain();
        }
        setAvailable(status.available);
        if (!status.available) setStorageError(status.error || "Cloud storage is unavailable. Local recovery copies are shown.");
      } catch (error) { if (!cancelled) setStorageError((error as Error).message); }
      finally { if (!cancelled) setReady(true); }
    })();
    return () => { cancelled = true; };
  }, [drain, updateRecovery]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (writes.current || draining.current || queue.current.length || storageError) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [storageError]);
  const loadStory = useCallback(async (id: string) => {
    const cached = loaded.current.get(id);
    if (cached) return cached;
    if (config.current?.mode !== "supabase") throw new Error("This game was not found in this browser.");
    const result = await readCloudStory(id);
    loaded.current.set(id, result.story);
    revisions.current.set(id, result.revision);
    return result.story;
  }, []);
  const refreshLibrary = useCallback(async () => {
    if (config.current?.mode !== "supabase") return;
    const remote = await listCloudStories();
    const merged = new Map(remote.map(item => [item.id, item]));
    // Do not advance an open editor's base revision past a remote edit.
    remote.forEach(item => { if (!loaded.current.has(item.id)) revisions.current.set(item.id, item.revision); });
    queue.current.forEach(entry => merged.set(entry.story.id, summarize(entry.story, entry.baseRevision, entry.status)));
    setStories([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  }, []);
  const persistStory = useCallback((story: Story, status = "ready") => {
    if (!config.current) { setStorageError("Storage is unavailable. Download a backup and check the server configuration."); return false; }
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    try { requireStorySize(stamped); } catch (error) { setStorageError((error as Error).message); return false; }
    loaded.current.set(story.id, stamped);
    setStories(previous => [summarize(stamped, revisions.current.get(story.id), status), ...previous.filter(item => item.id !== stamped.id)]);
    writes.current++;
    setSaving(true);
    // Serialize local staging as well as remote writes. Each edit reserves the
    // revision after the preceding pending edit; a conflict never rebases itself.
    staged.current = staged.current.then(async () => {
      if (config.current!.mode === "local") { await saveStory(stamped); setStorageError(""); return; }
      const preceding = queue.current.filter(entry => entry.story.id === story.id).at(-1);
      const replaceable = preceding && !preceding.prepared && (!draining.current || preceding !== queue.current[0]);
      const mutationId = replaceable ? preceding.mutationId : crypto.randomUUID();
      const entry: PendingSave = replaceable ? Object.assign(preceding, {story:stamped,status}) : { key: mutationId, mutationId, story: stamped, status, baseRevision: preceding ? preceding.baseRevision + 1 : revisions.current.get(story.id) || 0, createdAt: Date.now() };
      if (!replaceable) queue.current.push(entry);
      updateRecovery();
      await persistPending(config.current!.scope, entry);
      void drain();
    }).catch(error => { blocked.current = true; setStorageError(error.message); }).finally(() => {
      writes.current--; if (!writes.current && !draining.current) setSaving(false);
    });
    return true;
  }, [drain, updateRecovery]);
  const retrySync = useCallback(async () => {
    if (!config.current) { window.location.reload(); return; }
    await staged.current;
    try {
      const status = await storageStatus();
      if (status.scope !== config.current.scope) throw new Error("The workspace identity changed. Reload before syncing.");
      config.current = status;
      setAvailable(status.available);
      if (!status.available) throw new Error(status.error || "Cloud storage is unavailable.");
      blocked.current = false;
      await drain();
      await refreshLibrary();
    } catch (error) { setStorageError((error as Error).message); }
  }, [drain, refreshLibrary]);
  const deleteSavedStory = async (id: string) => {
    await staged.current;
    if (config.current?.mode === "supabase") {
      if (draining.current || queue.current.some(entry => entry.story.id === id)) throw new Error("Finish syncing or download your recovery copy before removing this game.");
      await requestJSON(`/api/stories/${encodeURIComponent(id)}?revision=${revisions.current.get(id) || 0}`, { method: "DELETE" });
    } else await removeStory(id);
    loaded.current.delete(id);
    setStories(previous => previous.filter(story => story.id !== id));
  };
  const saveRecoveryAsCopy = async (id: string) => {
    await staged.current;
    if (draining.current || config.current?.mode !== "supabase") throw new Error("Wait for the current save to finish.");
    const original = queue.current.filter(entry => entry.story.id === id);
    if (!original.length) throw new Error("No pending edits need recovery.");
    const story = copyStory(original.at(-1)!.story), mutationId = crypto.randomUUID();
    const entry: PendingSave = {key:mutationId,mutationId,story,baseRevision:0,createdAt:Date.now(),status:"ready"};
    await replacePending(config.current.scope, original.map(item=>item.key), entry);
    queue.current = [entry, ...queue.current.filter(item => item.story.id !== id)];
    loaded.current.delete(id);
    loaded.current.set(story.id,story);
    updateRecovery();
    setStories(previous=>[summarize(story),...previous.filter(item=>item.id!==id)]);
    blocked.current=false;
    void drain();
    return story.id;
  };
  const migrateLocalStories = async () => {
    const local = await loadStories();
    for (const story of local) if (!persistStory(copyStory(story))) throw new Error("Could not queue a local story.");
    return local.length;
  };
  return { scope, stories, ready, available, cloud, storageError, saving, recovery, persistStory, deleteSavedStory, loadStory, refreshLibrary, retrySync, migrateLocalStories, saveRecoveryAsCopy };
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
