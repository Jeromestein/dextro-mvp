export type AudioStatus = "off" | "playing" | "silent" | "blocked";

// Self-contained: the offline player embeds this same engine, without module dependencies.
export function createAudioController(onStatus: (status: AudioStatus) => void) {
  const owner = {};
  let enabled = false, volume = 0.35, source = "", revision = 0;
  let current: HTMLAudioElement | null = null;
  let retiring: HTMLAudioElement | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  const engine = {
    release(audio: HTMLAudioElement | null) { if (audio) { audio.pause(); audio.removeAttribute("src"); audio.load(); } },
    cancelFade() { clearInterval(timer); timer = undefined; engine.release(retiring); retiring = null; },
    stop() { revision++; enabled = false; engine.cancelFade(); engine.release(current); current = null; onStatus("off"); },
    claim(event: Event) { if ((event as CustomEvent).detail !== owner) engine.stop(); },
    transition() {
      if (!enabled) return;
      const job = ++revision;
      engine.cancelFade();
      retiring = current;
      current = source ? new Audio(source) : null;
      const next = current;
      if (next) { next.loop = true; next.volume = 0; }
      if (!next) engine.fade(job, next);
      else {
        next.onerror = () => { if (job === revision) { engine.stop(); onStatus("blocked"); } };
        void next.play().then(() => engine.fade(job, next)).catch(() => {
          if (job === revision) { engine.stop(); onStatus("blocked"); }
        });
      }
    },
    fade(job: number, next: HTMLAudioElement | null) {
      if (job !== revision || !enabled) { engine.release(next); return; }
      onStatus(next ? "playing" : "silent");
      const oldVolume = retiring?.volume || 0;
      const started = Date.now();
      timer = setInterval(() => {
        const progress = Math.min(1, (Date.now() - started) / 1000);
        if (current) current.volume = volume * progress;
        if (retiring) retiring.volume = oldVolume * (1 - progress);
        if (progress === 1) engine.cancelFade();
      }, 40);
    },
  };
  window.addEventListener("dextro-audio-owner", engine.claim);
  return {
    setTrack(data: string) { if (data === source) return; source = data; engine.transition(); },
    enable() { if (enabled) return; window.dispatchEvent(new CustomEvent("dextro-audio-owner", { detail: owner })); enabled = true; engine.transition(); },
    mute() { engine.stop(); },
    setVolume(value: number) { volume = Math.max(0, Math.min(1, value)); if (current) current.volume = volume; },
    dispose() { engine.stop(); window.removeEventListener("dextro-audio-owner", engine.claim); },
  };
}
