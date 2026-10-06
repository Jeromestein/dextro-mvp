"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { DEFAULT_CHATGPT_MODEL } from "@/modules/generation/models";

type Connection = {
  available: boolean;
  configured: boolean;
  activeId: string;
  needsWelcome: boolean;
  profiles: { id: string; label: string; connected: boolean; planEnabled: boolean }[];
};
export default function ChatGPTConnection({ onReady, model, onModel, disabled }: {
  onReady: (ready: boolean) => void;
  model: string; onModel: (value: string) => void; disabled: boolean;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const priorActive = useRef<string | null>(null);
  const [models, setModels] = useState<{ id: string; name: string }[]>([]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/chatgpt", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not check ChatGPT connection.");
      setConnection(data);
      if (priorActive.current !== data.activeId) {
        priorActive.current = data.activeId;
        setSelected(data.activeId || "");
        setModels([]);
      }
      onReady(data.available && data.configured);
      return data as Connection;
    } catch (error) { setMessage((error as Error).message); onReady(false); }
  }, [onReady]);
  useEffect(() => { const timer = setTimeout(() => void refresh(), 0); return () => clearTimeout(timer); }, [refresh]);
  useEffect(() => {
    const check = () => { void refresh(); };
    window.addEventListener("focus", check);
    return () => { window.removeEventListener("focus", check); };
  }, [refresh]);

  const action = async (name: string, profileId?: string) => {
    if (busy || disabled) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/chatgpt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: name, profileId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not connect to ChatGPT.");
      if (name === "signin") {
        const url = new URL(data.url);
        if (url.origin !== "https://auth.openai.com") throw new Error("Unexpected sign-in destination.");
        window.location.assign(url.toString());
      } else if (name === "models") {
        setModels(data.models);
        if (!data.models.length) setMessage("No models are available for this account.");
        else if (!data.models.some((m: { id: string }) => m.id === (model || DEFAULT_CHATGPT_MODEL.id)))
          setMessage(model ? "The selected model is unavailable. Choose another model." : `${DEFAULT_CHATGPT_MODEL.name} is unavailable for this account. Choose another model.`);
      } else {
        setMessage(data.message || "");
        if (name !== "acknowledge") { setModels([]); onModel(""); }
        await refresh();
      }
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  };
  const current = connection?.profiles.find((p) => p.id === connection.activeId);
  return (
    <section className="chatgpt-connection" aria-label="ChatGPT connection">
      <div className="chatgpt-heading"><strong>{connection?.available ? "Using ChatGPT plan" : "Use your ChatGPT plan"}</strong><a href="https://chatgpt.com/settings/usage" target="_blank" rel="noopener noreferrer">Manage usage <ExternalLink size={13} /></a></div>
      <p className="quiet">Local testing with an eligible Plus or Pro account. Usage is shared with your plan.</p>
      <p className="quiet">To stay within your subscription, turn off credit usage after reaching your limit in ChatGPT settings. Dextro never switches to API billing automatically.</p>
      {connection?.configured === false && <p className="form-error">The local ChatGPT connection is unavailable. Check the server configuration.</p>}
      {current && <p className="chatgpt-account">{current.label}{!current.connected ? " — signed out" : !current.planEnabled ? " — plan permission needed" : ""}</p>}
      {(connection?.profiles.length || 0) > 0 && <label className="field-label">ChatGPT account<select value={selected} onChange={(event) => setSelected(event.target.value)} disabled={disabled || busy}>
        <option value="">Add another account or workspace</option>
        {connection!.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}{!profile.connected ? " (sign in again)" : ""}</option>)}
      </select></label>}
      <div className="chatgpt-actions">
        <button type="button" className="button chatgpt-signin" onClick={() => void action("signin", selected || undefined)} disabled={disabled || busy || !connection?.configured}>{busy ? <LoaderCircle size={16} className="spin" /> : null}Continue with ChatGPT</button>
        {selected && selected !== connection?.activeId && connection?.profiles.find((p) => p.id === selected)?.connected && <button type="button" className="button" onClick={() => void action("select", selected)} disabled={disabled || busy}>Use this account</button>}
        {current?.connected && <button type="button" className="button" onClick={() => void action("signout")} disabled={disabled || busy}>Sign out</button>}
        <button type="button" className="button" disabled={disabled || busy} onClick={async () => { await refresh(); setMessage(""); }}>Check connection</button>
      </div>
      {connection?.needsWelcome && <div className="chatgpt-welcome" role="status"><strong>You’re using your ChatGPT plan</strong><p>Eligible requests in Dextro use your plan allowance or permitted credits. Manage app limits and credit access in ChatGPT settings.</p><button type="button" className="button" onClick={() => void action("acknowledge")} disabled={disabled || busy}>Got it</button></div>}
      {connection?.available && <div className="chatgpt-model"><label className="field-label">Model<select value={model} onChange={(event) => onModel(event.target.value)} disabled={disabled || busy}>
        <option value="">{DEFAULT_CHATGPT_MODEL.name} (default)</option>
        {model && !models.some((item) => item.id === model) && <option value={model}>{model}</option>}
        {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select></label><button type="button" className="button" onClick={() => void action("models")} disabled={disabled || busy}>Load available models</button></div>}
      {message && <p className="quiet" role="status">{message}</p>}
    </section>
  );
}
