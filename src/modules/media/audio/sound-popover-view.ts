import type { AudioStatus } from "./controller";

// Shared labels and states for React and the offline player.
export function soundPopoverView(status: AudioStatus, volume: number, interacted: boolean) {
  const enabled = status === "playing" || status === "silent";
  return {
    enabled,
    audible: enabled && volume > 0,
    activate: status === "blocked" || (status === "off" && !interacted),
    toggleLabel: enabled ? "Mute" : "Unmute",
    message: status === "blocked" ? "Sound could not start. Select Enable sound to try again." : "",
  };
}
export const soundOnIcon = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';
export const soundOffIcon = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m11 5-6 4H2v6h3l6 4V5Z"/><path d="m17 9 5 6m0-6-5 6"/></svg>';
export const restartIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2.8 7M3 4v7h7"/></svg>';

export const soundPopoverCSS = `
.player[data-presentation="immersive"] .player-top { z-index:3; }
.player[data-presentation="immersive"] .player-top > span { min-width:0; }
.player-top-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; margin-left:auto; flex-shrink:0; }
.player[data-presentation="immersive"] .player-top-actions > .icon-button,
.player[data-presentation="immersive"] .player-sound-trigger,
.player[data-presentation="immersive"] .player-sound-mute {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  width:40px; height:40px; min-height:40px; margin:0; padding:0; flex-shrink:0;
  border:1px solid var(--scene-border); border-radius:50%; background:var(--scene-control); color:var(--scene-ink);
  font:500 12px/1.3 system-ui,sans-serif; letter-spacing:0; text-shadow:none; cursor:pointer;
}
.player[data-presentation="immersive"] .player-sound-trigger[data-activate="true"] { width:auto; padding:0 12px; border-radius:24px; white-space:nowrap; }
.player[data-presentation="immersive"] .player-sound-trigger[aria-expanded="true"] { background:var(--scene-hover); border-color:var(--scene-gold); }
.player[data-presentation="immersive"] :is(.player-sound-trigger,.player-sound-mute):hover { background:var(--scene-hover); border-color:var(--scene-gold); }
.player-sound-panel {
  position:absolute; z-index:5; inset-inline-end:0; top:calc(100% + 10px); width:min(280px,100%);
  margin:0; padding:14px; border:1px solid var(--scene-border); border-radius:16px;
  background:var(--scene-panel); color:var(--scene-ink); box-shadow:0 10px 30px #00000018;
  backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
  text-align:left; font:12px/1.5 system-ui,sans-serif; letter-spacing:0; text-shadow:none;
}
.player-sound-panel[hidden] { display:none; }
.player-sound-row { display:flex; align-items:center; gap:12px; }
.player[data-presentation="immersive"] .player-sound-mute { width:36px; height:36px; min-height:36px; border-color:transparent; background:var(--scene-panel-button); }
.player-sound-panel input[type="range"] { width:0; min-width:0; flex:1; height:32px; margin:0; padding:0; accent-color:var(--scene-gold); cursor:pointer; }
.player-sound-panel output { flex-shrink:0; width:30px; color:var(--scene-soft); font-size:11px; text-align:right; font-variant-numeric:tabular-nums; }
.player-sound-panel .player-sound-track { margin:10px 2px 0; padding:0; color:var(--scene-soft); font:11px/1.5 system-ui,sans-serif; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; }
.player-sound-status { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
`;
