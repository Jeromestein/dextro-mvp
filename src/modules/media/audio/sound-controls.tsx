"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createAudioController, type AudioStatus } from "./controller";

export default function SoundControls({ data, title, audition = false }: { data: string; title: string; audition?: boolean }) {
  const controller = useRef<ReturnType<typeof createAudioController> | null>(null);
  const [status, setStatus] = useState<AudioStatus>("off");
  const [volume, setVolume] = useState(.35);
  useEffect(() => {
    const audio = createAudioController(setStatus);
    controller.current = audio;
    return () => { audio.dispose(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.setTrack(data); }, [data]);
  const enabled = status === "playing" || status === "silent";
  return <div className="sound-controls" aria-label={audition ? "Music audition" : "Story sound"}>
    <div className="sound-controls-row"><button type="button" className="button" aria-pressed={enabled} onClick={() => {
      if (enabled) controller.current?.mute(); else controller.current?.enable();
    }}>{enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}{enabled ? (audition ? "Stop audition" : "Mute") : (audition ? "Listen" : "Enable sound")}</button>
    <label>Volume<input aria-label={audition ? "Audition volume" : "Story volume"} type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => { const value = Number(e.target.value); setVolume(value); controller.current?.setVolume(value); }} /></label></div>
    <p role="status">{status === "blocked" ? "Sound could not play. Try again or choose another file." : data ? title : "Silence for this passage"}</p>
  </div>;
}
