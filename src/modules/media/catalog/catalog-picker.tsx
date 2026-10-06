"use client";
import { useEffect, useRef, useState } from "react";
import type { MediaAsset } from "../assets/model";
import SoundControls from "../audio/sound-controls";
import { loadCatalogTrack, musicCatalog } from "./catalog";

export default function CatalogPicker({ onApply, assignedId }: { assignedId?: string; onApply: (asset: MediaAsset) => boolean }) {
  const [selected, setSelected] = useState(musicCatalog[0].id);
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const job = useRef<AbortController | null>(null);
  useEffect(() => () => { job.current?.abort(); }, []);
  const track = musicCatalog.find((item) => item.id === selected)!;
  const load = async () => {
    job.current?.abort();
    const request = new AbortController(); job.current = request;
    setBusy(true); setError(""); setAsset(null);
    try { const result = await loadCatalogTrack(selected, request.signal); if (!request.signal.aborted) setAsset(result); }
    catch (e) { if (!request.signal.aborted) setError((e as Error).message); }
    finally { if (job.current === request) { job.current = null; setBusy(false); } }
  };
  return <div className="media-catalog"><h4>Free music library</h4>
    <label className="editor-field">CC0 music<select value={selected} disabled={busy} onChange={(e) => { setSelected(e.target.value); setAsset(null); setError(""); }}>{musicCatalog.map((item) => <option key={item.id} value={item.id}>{item.title} · {item.mood}</option>)}</select></label>
    <p className="media-file-hint">{track.description} {Math.round(track.duration)} seconds · CC0</p>
    <a href={track.sourceUrl} target="_blank" rel="noreferrer">{track.author} · Freesound source</a>
    {!asset && <button className="button" disabled={busy} onClick={() => void load()}>{busy ? "Loading track…" : "Load for preview"}</button>}
    {asset && <>{asset.id !== assignedId && <SoundControls key={asset.id} data={asset.data} title={asset.name} audition />}<button disabled={asset.id === assignedId} className="button primary" onClick={() => { try { if (!onApply(asset)) throw new Error("Could not apply this track. It may already be assigned; check storage if it is not."); } catch (e) { setError((e as Error).message); } }}>{asset.id === assignedId ? "Assigned to this passage" : "Use this music"}</button></>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
