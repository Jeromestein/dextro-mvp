"use client";
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

function useConnectionState() {
  // Connection secrets stay in memory across client-side navigation, never browser storage.
  const [accessCode, setAccessCode] = useState("");
  const [model, setModel] = useState("");
  const [aiReady, setAiReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [provider, setProvider] = useState("api");
  const [local, setLocal] = useState(false);
  const [imagesReady, setImagesReady] = useState(false);
  const [imageModel, setImageModel] = useState("");
  const checkConnection = useCallback(async () => {
    setChecking(true);
    const images = fetch("/api/media/image", { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      setImagesReady(response.ok && data.available === true);
      setImageModel(typeof data.model === "string" ? data.model : "");
    }).catch(() => setImagesReady(false));
    try {
      const response = await fetch("/api/generate", { cache: "no-store" });
      const data = await response.json();
      setProvider(data.provider || "api");
      setLocal(data.local === true);
      setAiReady(response.ok && data.available === true);
    } catch { setAiReady(false); }
    finally { await images; setChecking(false); }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void checkConnection(), 0);
    const refresh = () => { void checkConnection(); };
    window.addEventListener("focus", refresh);
    return () => { clearTimeout(timer); window.removeEventListener("focus", refresh); };
  }, [checkConnection]);
  return { accessCode, setAccessCode, model, setModel, aiReady, setAiReady, checking, provider, local, checkConnection, imagesReady, imageModel };
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
