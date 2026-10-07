"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Story } from "@/modules/story/model";
import type { MediaAsset } from "../assets/model";
import { createAudioController, type AudioStatus } from "../audio/controller";
import { fetchMusicCatalog, loadCatalogTrack } from "./catalog";
import { catalogAssetId, musicThemes, type CatalogTrack } from "./model";
import { passageMood, recommendTracks } from "./recommend";

export default function CatalogPicker({ story, passageId, onApply, assignedId }: {
  story: Story; passageId: string; assignedId?: string; onApply: (asset: MediaAsset) => boolean;
}) {
  const [tracks, setTracks] = useState<CatalogTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [browse, setBrowse] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("");
  const [mood, setMood] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<AudioStatus>("off");
  const [volume, setVolume] = useState(.35);
  const job = useRef<AbortController | null>(null);
  const audio = useRef<ReturnType<typeof createAudioController> | null>(null);
  useEffect(() => {
    const controller = createAudioController(setStatus); audio.current = controller;
    return () => { job.current?.abort(); controller.dispose(); audio.current = null; };
  }, []);
  useEffect(() => {
    const request = new AbortController();
    fetchMusicCatalog(request.signal).then(setTracks).catch(e => {
      if (!request.signal.aborted) setLoadError((e as Error).message);
    }).finally(() => { if (!request.signal.aborted) setLoading(false); });
    return () => request.abort();
  }, [attempt]);
  const currentMood = passageMood(story, passageId);
  const recommended = recommendTracks(tracks, story, currentMood);
  const visible = browse ? tracks.filter(t => (!theme || t.themes.some(v => v === theme))
    && (!mood || t.moods.some(v => v === mood))
    && `${t.title} ${t.originalTitle} ${t.author} ${t.instruments.join(" ")}`.toLowerCase().includes(query.toLowerCase().trim())) : recommended;
  const listen = (track: CatalogTrack) => {
    if (preview === track.id && status === "playing") { audio.current?.mute(); return; }
    setPreview(track.id); audio.current?.setTrack(track.url); audio.current?.enable();
  };
  const apply = async (track: CatalogTrack) => {
    job.current?.abort();
    const request = new AbortController(); job.current = request;
    setBusy(track.id); setError("");
    try {
      const asset = await loadCatalogTrack(track, request.signal);
      request.signal.throwIfAborted();
      if (!onApply(asset)) throw new Error("Could not apply this track. Check storage and try again.");
      audio.current?.mute();
    } catch (e) { if (!request.signal.aborted) setError((e as Error).message); }
    finally { if (job.current === request) { job.current = null; setBusy(""); } }
  };
  return <div className="media-catalog">
    <div className="music-library-heading"><h4>Free music library</h4>{!loading && <span>{tracks.length} tracks · CC0</span>}</div>
    {loading ? <p role="status">Loading music…</p> : loadError ? <><p className="form-error" role="alert">{loadError}</p><button className="button" onClick={() => { setLoading(true); setLoadError(""); setAttempt(v => v + 1); }}>Try again</button></> : <>
      <div className="music-library-tabs"><button className="button" aria-pressed={!browse} onClick={() => setBrowse(false)}>Recommended</button><button className="button" aria-pressed={browse} onClick={() => setBrowse(true)}>Browse all</button></div>
      {browse ? <div className="music-library-filters">
        <label className="editor-field">Search music<input value={query} placeholder="Title, instrument or creator" onChange={e => setQuery(e.target.value)} /></label>
        <div><label className="editor-field">Theme<select value={theme} onChange={e => setTheme(e.target.value)}><option value="">All themes</option>{musicThemes.map(t => <option key={t} value={t}>{t === "scifi" ? "Sci-fi" : t[0].toUpperCase() + t.slice(1)}</option>)}</select></label>
        <label className="editor-field">Mood<select value={mood} onChange={e => setMood(e.target.value)}><option value="">All moods</option>{["calm", "mysterious", "tense", "hopeful", "somber"].map(m => <option key={m} value={m}>{m[0].toUpperCase() + m.slice(1)}</option>)}</select></label></div>
      </div> : <p className="music-library-note">{currentMood === "silence" ? "This passage is planned as silence. Browse all to choose music instead." : "Three suggestions for this story and passage. Listen before choosing."}</p>}
      <div className="music-library-results" aria-label={browse ? "All music" : "Recommended music"}>
        {visible.map(track => {
          const assigned = assignedId === catalogAssetId(track);
          const playing = preview === track.id && status === "playing";
          return <article className="music-track" key={track.id} aria-label={track.title}>
            <strong>{track.title}</strong><p>{track.instruments.join(" · ")} · {track.moods.join(" / ")} · {Math.round(track.duration)}s</p>
            <div className="music-track-actions"><button className="button" aria-label={`${playing ? "Stop" : "Listen to"} ${track.title}`} aria-pressed={playing} onClick={() => listen(track)}>{playing ? <Square size={13} /> : <Play size={13} />}{playing ? "Stop" : "Listen"}</button>
            <button className="button" disabled={Boolean(busy) || assigned} onClick={() => void apply(track)}>{assigned ? "In use" : busy === track.id ? "Adding…" : "Use music"}</button>
            <a href={track.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Source and license for ${track.title}`}>Source</a></div>
          </article>;
        })}
        {!visible.length && <p className="music-library-note">{tracks.length ? "No tracks match this selection." : "No music is available yet."}</p>}
      </div>
      <label className="music-library-volume">Preview volume<input aria-label="Library preview volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={e => { const v = Number(e.target.value); setVolume(v); audio.current?.setVolume(v); }} /></label>
      {status === "blocked" && <p className="form-error" role="alert">Sound could not start. Select Listen to try again.</p>}
    </>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </div>;
}
