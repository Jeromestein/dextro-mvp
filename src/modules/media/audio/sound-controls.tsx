"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { createAudioController, type AudioStatus } from "./controller";
import { useGameplayAudio } from "./gameplay-provider";

type SoundProps = { data: string; title: string; audition?: boolean; gameId?: string };

export default function SoundControls(props: SoundProps) {
  return props.gameId ? <GameplaySoundControls {...props} gameId={props.gameId} /> : <LocalSoundControls {...props} />;
}

function GameplaySoundControls({ data, title, gameId }: SoundProps & { gameId: string }) {
  const audio = useGameplayAudio();
  const state = useSyncExternalStore(audio.subscribe, audio.getSnapshot, audio.getSnapshot);
  useEffect(() => { audio.enter(gameId, data); }, [audio, gameId, data]);
  return <Controls data={data} title={title} status={state.storyId === gameId ? state.status : "off"}
    volume={state.volume} onEnable={audio.enable} onMute={audio.mute} onVolume={audio.setVolume} />;
}

function LocalSoundControls({ data, title, audition = false }: SoundProps) {
  const controller = useRef<ReturnType<typeof createAudioController> | null>(null);
  const [status, setStatus] = useState<AudioStatus>("off");
  const [volume, setVolume] = useState(.35);
  useEffect(() => {
    const audio = createAudioController(setStatus);
    controller.current = audio;
    return () => { audio.dispose(); controller.current = null; };
  }, []);
  useEffect(() => { controller.current?.setTrack(data); }, [data]);
  return <Controls data={data} title={title} audition={audition} status={status} volume={volume}
    onEnable={() => controller.current?.enable()} onMute={() => controller.current?.mute()}
    onVolume={(value) => { setVolume(value); controller.current?.setVolume(value); }} />;
}

function Controls({ data, title, audition = false, status, volume, onEnable, onMute, onVolume }: SoundProps & {
  status: AudioStatus; volume: number; onEnable: () => void; onMute: () => void; onVolume: (value: number) => void;
}) {
  const enabled = status === "playing" || status === "silent";
  return <div className="sound-controls" aria-label={audition ? "Music audition" : "Story sound"}>
    <div className="sound-controls-row"><button type="button" className="button" aria-pressed={enabled} onClick={() => {
      if (enabled) onMute(); else onEnable();
    }}>{enabled ? <Volume2 size={14} /> : <VolumeX size={14} />}{enabled ? (audition ? "Stop audition" : "Mute") : (audition ? "Listen" : "Enable sound")}</button>
    <label>Volume<input aria-label={audition ? "Audition volume" : "Story volume"} type="range" min="0" max="1" step="0.05" value={volume} onChange={(e) => onVolume(Number(e.target.value))} /></label></div>
    <p role="status">{status === "blocked" ? `Sound could not start. Select ${audition ? "Listen" : "Enable sound"} to try again.` : data ? title : "Silence for this passage"}</p>
  </div>;
}
