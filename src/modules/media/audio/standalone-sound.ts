import type { AudioStatus, createAudioController } from "./controller";
import type { soundPopoverView } from "./sound-popover-view";

// Embedded in exported games; dependencies are passed explicitly.
export function createStandaloneSound(
  root: HTMLElement,
  audio: Pick<ReturnType<typeof createAudioController>, "enable" | "mute" | "setVolume">,
  viewFor: typeof soundPopoverView,
  icons: { on: string; off: string },
) {
  const doc = root.ownerDocument;
  const trigger = root.querySelector<HTMLButtonElement>(".player-sound-trigger")!;
  const panel = root.querySelector<HTMLElement>(".player-sound-panel")!;
  const mute = root.querySelector<HTMLButtonElement>(".player-sound-mute")!;
  const slider = root.querySelector<HTMLInputElement>("input")!;
  const output = root.querySelector<HTMLOutputElement>("output")!;
  const track = root.querySelector<HTMLElement>(".player-sound-track")!;
  const message = root.querySelector<HTMLElement>(".player-sound-status")!;
  let status: AudioStatus = "off", volume = .35, interacted = false;
  const ui = {
    render() {
      const view = viewFor(status, volume, interacted);
      trigger.dataset.activate = String(view.activate);
      trigger.setAttribute("aria-label", view.activate ? "Enable sound" : "Sound settings");
      trigger.title = view.activate ? "Enable sound" : view.audible ? "Sound settings" : "Sound settings · muted";
      trigger.innerHTML = view.activate ? icons.on + "<span>Enable sound</span>" : view.audible ? icons.on : icons.off;
      mute.innerHTML = view.audible ? icons.on : icons.off;
      mute.setAttribute("aria-label", view.toggleLabel);
      mute.title = view.toggleLabel;
      slider.value = String(volume);
      output.textContent = Math.round(volume * 100) + "%";
      message.textContent = view.message;
    },
    close(focus = false) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (focus) trigger.focus({ preventScroll: true });
    },
    toggle() {
      if (viewFor(status, volume, interacted).activate) {
        interacted = true; audio.enable(); ui.close(); ui.render();
      } else if (!panel.hidden) ui.close();
      else { panel.hidden = false; trigger.setAttribute("aria-expanded", "true"); mute.focus({ preventScroll: true }); }
    },
    toggleMute() {
      interacted = true;
      if (viewFor(status, volume, interacted).enabled) audio.mute(); else audio.enable();
      ui.render();
    },
    setVolume() { volume = Number(slider.value); audio.setVolume(volume); ui.render(); },
    outside(event: Event) { if (event.target && !root.contains(event.target as Node)) ui.close(); },
    escape(event: KeyboardEvent) {
      if (!panel.hidden && event.key === "Escape") { event.preventDefault(); ui.close(true); }
    },
  };
  trigger.addEventListener("click", ui.toggle);
  mute.addEventListener("click", ui.toggleMute);
  slider.addEventListener("input", ui.setVolume);
  doc.addEventListener("pointerdown", ui.outside);
  doc.addEventListener("focusin", ui.outside);
  doc.addEventListener("keydown", ui.escape);
  ui.close(); ui.render();
  return {
    setStatus(value: AudioStatus) { status = value; ui.render(); },
    setTrackTitle(title: string) { track.textContent = title; track.title = title; },
    close: ui.close,
    dispose() {
      trigger.removeEventListener("click", ui.toggle);
      mute.removeEventListener("click", ui.toggleMute);
      slider.removeEventListener("input", ui.setVolume);
      doc.removeEventListener("pointerdown", ui.outside);
      doc.removeEventListener("focusin", ui.outside);
      doc.removeEventListener("keydown", ui.escape);
    },
  };
}
