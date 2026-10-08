"use client";
import { useEffect, useId, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { AudioStatus } from "./controller";
import { soundPopoverView } from "./sound-popover-view";

type Props = {
  data: string; title: string; status: AudioStatus; volume: number;
  onEnable: () => void; onMute: () => void; onVolume: (value: number) => void;
};
export default function SoundPopover({ data, title, status, volume, onEnable, onMute, onVolume }: Props) {
  const [open, setOpen] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const mute = useRef<HTMLButtonElement>(null);
  const id = useId();
  const view = soundPopoverView(status, volume, interacted);
  const Icon = view.audible ? Volume2 : VolumeX;
  useEffect(() => {
    if (!open) return;
    mute.current?.focus({ preventScroll: true });
    const outside = (event: Event) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault(); setOpen(false); trigger.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="player-sound" ref={root}>
    <button ref={trigger} type="button" className="player-sound-trigger" data-activate={view.activate}
      aria-label={view.activate ? "Enable sound" : "Sound settings"} aria-expanded={open} aria-controls={id}
      title={view.activate ? "Enable sound" : view.audible ? "Sound settings" : "Sound settings · muted"}
      onClick={() => {
        if (view.activate) { setInteracted(true); onEnable(); setOpen(false); }
        else setOpen(value => !value);
      }}>
      {view.activate ? <Volume2 size={17} /> : <Icon size={17} />}{view.activate && <span>Enable sound</span>}
    </button>
    <div id={id} className="player-sound-panel" role="dialog" aria-label="Sound controls" hidden={!open}>
      <div className="player-sound-row">
        <button ref={mute} type="button" className="player-sound-mute" aria-label={view.toggleLabel} title={view.toggleLabel}
          onClick={() => { setInteracted(true); if (view.enabled) onMute(); else onEnable(); }}><Icon size={17} /></button>
        <input aria-label="Story volume" type="range" min="0" max="1" step="0.05" value={volume}
          onChange={event => onVolume(Number(event.target.value))} />
        <output aria-hidden="true">{Math.round(volume * 100)}%</output>
      </div>
      <p className="player-sound-track" title={data ? title : undefined}>{data ? title : "Silence for this passage"}</p>
    </div>
    <span className="player-sound-status" role="status">{view.message}</span>
  </div>;
}
