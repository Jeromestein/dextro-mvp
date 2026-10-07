"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { ModelOption } from "./models";

const storageKey = (kind: string) => `dextro.${kind}-model`;
function rememberedModel(kind: string) {
  try { return localStorage.getItem(storageKey(kind)) || ""; } catch { return ""; }
}
function useConnectionState() {
  const [model, updateModel] = useState("");
  const [imageModel, updateImageModel] = useState("");
  const [storyModels, setStoryModels] = useState<ModelOption[]>([]);
  const [imageModels, setImageModels] = useState<ModelOption[]>([]);
  const [aiReady, setAiReady] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [connectionError, setConnectionError] = useState("");
  const setModel = (value: string) => {
    updateModel(value);
    try { localStorage.setItem(storageKey("story"), value); } catch { /* Keep the choice for this session. */ }
  };
  const setImageModel = (value: string) => {
    updateImageModel(value);
    try { localStorage.setItem(storageKey("image"), value); } catch { /* Keep the choice for this session. */ }
  };
  const checkConnection = useCallback(async () => {
    setChecking(true);
    setConnectionError("");
    await Promise.all((["story", "image"] as const).map(async (kind) => {
      const ready = kind === "story" ? setAiReady : setImagesReady;
      try {
        const response = await fetch(kind === "story" ? "/api/generate" : "/api/media/image", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.models) || typeof data.model !== "string") throw new Error();
        const models: ModelOption[] = data.models;
        (kind === "story" ? setStoryModels : setImageModels)(models);
        (kind === "story" ? updateModel : updateImageModel)((current) => {
          const choice = current || rememberedModel(kind);
          return models.some((option) => option.id === choice) ? choice : data.model;
        });
        ready(data.available === true);
      } catch {
        ready(false);
        setConnectionError("Could not check AI configuration. Reload this page to try again.");
      }
    }));
    setChecking(false);
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void checkConnection(), 0);
    const refresh = () => { void checkConnection(); };
    window.addEventListener("focus", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [checkConnection]);
  return { model, setModel, imageModel, setImageModel, storyModels, imageModels, aiReady, checking, imagesReady, connectionError };
}
const ConnectionContext = createContext<ReturnType<typeof useConnectionState> | null>(null);
export function ConnectionProvider({ children }: { children: ReactNode }) {
  return <ConnectionContext.Provider value={useConnectionState()}>{children}</ConnectionContext.Provider>;
}
export function useConnection() {
  const value = useContext(ConnectionContext);
  if (!value) throw new Error("Connection provider is missing.");
  return value;
}
