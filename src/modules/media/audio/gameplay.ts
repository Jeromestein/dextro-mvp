import { createAudioController, type AudioStatus } from "./controller";

type PlaybackState = { storyId: string; status: AudioStatus; volume: number };

// One session survives the client-side transition from Play to the game route.
// Creating the store is side-effect free; start() runs inside the user's click.
export function createGameplayAudio() {
  let state: PlaybackState = { storyId: "", status: "off", volume: 0.35 };
  let controller: ReturnType<typeof createAudioController> | undefined;
  let revision = 0;
  const listeners = new Set<() => void>();
  const update = (changes: Partial<PlaybackState>) => {
    const next = { ...state, ...changes };
    if (next.storyId === state.storyId && next.status === state.status && next.volume === state.volume) return;
    state = next;
    listeners.forEach((listener) => listener());
  };
  const session = {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start(storyId: string, data: string) {
      const job = ++revision;
      controller?.dispose();
      update({ storyId, status: "off" });
      controller = createAudioController((status) => {
        if (job === revision) update({ status });
      });
      controller.setVolume(state.volume);
      controller.setTrack(data);
      controller.enable();
    },
    enter(storyId: string, data: string) {
      if (state.storyId !== storyId) session.start(storyId, data);
      else controller?.setTrack(data);
    },
    enable() { controller?.enable(); },
    mute() { controller?.mute(); },
    setVolume(volume: number) {
      const value = Math.max(0, Math.min(1, volume));
      controller?.setVolume(value);
      update({ volume: value });
    },
    stop() {
      revision++;
      controller?.dispose();
      controller = undefined;
      update({ storyId: "", status: "off" });
    },
  };
  return session;
}
