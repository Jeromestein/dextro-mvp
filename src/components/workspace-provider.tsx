"use client";
import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { loadStories, saveStory, removeStory } from "@/lib/storage";
import type { Story } from "@/lib/story";

function useWorkspaceState() {
  const [stories, setStories] = useState<Story[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const saveQueue = useRef(Promise.resolve());
  const writes = useRef(0);
  // Connection secrets stay in memory across client-side navigation, never browser storage.
  const [accessCode, setAccessCode] = useState("");
  const [model, setModel] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [provider, setProvider] = useState("api");
  const [local, setLocal] = useState(false);
  const [brief, setBrief] = useState({ premise: "", tone: "Mysterious", language: "auto" });
  const [draft, setDraft] = useState<{ story: Story; repaired: boolean } | null>(null);
  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/generate", { cache: "no-store" });
      const data = await response.json();
      setProvider(data.provider || "api");
      setLocal(data.local === true);
      setAiReady(response.ok && data.available === true);
    } catch { setAiReady(false); }
    finally { setChecking(false); }
  }, []);
  useEffect(() => {
    loadStories().then(setStories).catch((error) => setStorageError(error.message)).finally(() => setReady(true));
    const timer = setTimeout(() => void checkConnection(), 0);
    const refresh = () => { void checkConnection(); };
    window.addEventListener("focus", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [checkConnection]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (writes.current || storageError || draft) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [storageError, draft]);
  const persistStory = (story: Story) => {
    const stamped = { ...story, updatedAt: new Date().toISOString() };
    if (new TextEncoder().encode(JSON.stringify(stamped)).length > 24_000_000) {
      setStorageError("This story is too large to save. Remove an image or shorten the text.");
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
  };
  const deleteSavedStory = async (id: string) => {
    await saveQueue.current;
    await removeStory(id);
    setStories((previous) => previous.filter((story) => story.id !== id));
  };
  return { stories, ready, storageError, saving, persistStory, deleteSavedStory, accessCode, setAccessCode, model, setModel, aiReady, setAiReady, checking, provider, local, checkConnection, brief, setBrief, draft, setDraft };
}
const WorkspaceContext = createContext<ReturnType<typeof useWorkspaceState> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const value = useWorkspaceState();
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider is missing.");
  return value;
}
