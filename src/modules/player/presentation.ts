import { soundPopoverCSS } from "@/modules/media/audio/sound-popover-view";

// Shared by the live player and self-contained HTML games.
export const immersiveCSS = `
.player[data-story-theme][data-presentation="immersive"] {
  --scene-base:color-mix(in srgb,var(--story-backdrop) 8%,#0b1419);
  --scene-ink:#f5f0e7;
  --scene-soft:#ddd8ce;
  --scene-control:#14212be8;
  --scene-hover:#2d3b43f5;
  --scene-border:#ecdfc454;
  --scene-panel:#14212bf5;
  --scene-panel-button:#293944;
  --scene-gold:color-mix(in srgb,var(--story-accent) 25%,#ecd6ab);
  --scene-inset:clamp(24px,6vw,100px);
  position:relative; isolation:isolate; color-scheme:dark; overflow:hidden;
  width:100%; max-width:none; min-height:100svh; margin:0; padding:80px var(--scene-inset) 26px;
  border:0; border-radius:0; box-shadow:none; background:var(--scene-base); color:var(--scene-ink);
}
.player[data-story-theme][data-presentation="immersive"] .scene-glow { inset:0; opacity:1; border-radius:inherit; }
.player[data-story-theme][data-presentation="immersive"] .scene-glow-image { inset:-40px; filter:blur(40px) saturate(.85); background-size:0 0; background-repeat:no-repeat; }
.player[data-story-theme][data-presentation="immersive"] .scene-glow-image::before { content:""; position:absolute; inset:0; background-image:var(--scene-edge,none); background-size:100% 100%; }
.player[data-story-theme][data-presentation="immersive"] .scene-glow::after { background:linear-gradient(180deg,#07111980,#07111945 35%,#071119ad 70%,var(--scene-base) 100%); }
.player[data-story-theme][data-presentation="immersive"] .scene-image { display:block; width:calc(100% + 2 * var(--scene-inset)); max-width:none; height:auto; max-height:54svh; object-fit:contain; border-radius:0; margin:22px calc(-1 * var(--scene-inset)) 0; mask-image:linear-gradient(#000 84%,transparent 100%); }
.player[data-story-theme][data-presentation="immersive"] .scene-image[hidden] { display:none; }
.player[data-story-theme][data-presentation="immersive"] .player-top { position:relative; gap:15px; margin:0; color:var(--scene-soft); font-size:10px; letter-spacing:1.8px; text-shadow:0 1px 8px #000; }
.player[data-story-theme][data-presentation="immersive"] .player-top > span { max-width:260px; line-height:1.6; }
.player[data-story-theme][data-presentation="immersive"] .icon-button { color:var(--scene-ink); width:36px; height:36px; flex-shrink:0; background:#101b24b8; border:1px solid #f5f0e747; border-radius:50%; }
.player[data-story-theme][data-presentation="immersive"] .player-reading { max-width:660px; margin:12px auto 0; text-shadow:0 2px 14px #0009; }
.player[data-story-theme][data-presentation="immersive"][data-has-scene="false"] .player-reading { margin-top:70px; }
.player[data-story-theme][data-presentation="immersive"] .passage-eyebrow { color:var(--scene-gold); font:500 10px/1.5 system-ui,sans-serif; letter-spacing:2.2px; margin:0 0 16px; }
.player[data-story-theme][data-presentation="immersive"] h2 { color:var(--scene-ink); font:400 clamp(34px,4vw,52px)/1.08 Georgia,serif; letter-spacing:-1px; margin:0 0 23px; text-wrap:balance; }
.player[data-story-theme][data-presentation="immersive"] .narrative { color:var(--scene-soft); font:18px/1.8 Georgia,serif; }
.player[data-story-theme][data-presentation="immersive"] .player-choices { margin:28px 0 34px; }
.player[data-story-theme][data-presentation="immersive"] .choices-prompt { color:var(--scene-gold); margin:0 0 12px; font:500 10px/1.5 system-ui,sans-serif; letter-spacing:1.8px; text-transform:uppercase; }
.player[data-story-theme][data-presentation="immersive"] .choice-button { min-height:54px; margin-top:10px; padding:14px 18px; border:1px solid #ecdfc454; border-radius:8px; background:#14212be8; color:var(--scene-ink); font:13px/1.6 system-ui,sans-serif; text-shadow:none; backdrop-filter:blur(12px); transition:background .2s,border-color .2s; }
.player[data-story-theme][data-presentation="immersive"] .choice-button:hover { background:#2d3b43f5; border-color:var(--scene-gold); }
.player[data-story-theme][data-presentation="immersive"] .choice-number { color:var(--scene-gold); font-size:11px; }
.player[data-story-theme][data-presentation="immersive"] :is(.ending,.player-signature) { border-color:#ecdfc42e; }
.player[data-story-theme][data-presentation="immersive"] :is(.ending > span,.quiet,.media-credits,.player-signature) { color:var(--scene-soft); }
.player[data-story-theme][data-presentation="immersive"] .player-signature { max-width:660px; margin:0 auto; text-align:left; font-size:10px; padding-top:18px; }
.player[data-story-theme][data-presentation="immersive"] .player-signature strong { color:var(--scene-gold); }
.player[data-story-theme][data-presentation="immersive"] .media-credits { max-width:660px; margin:0 auto 18px; font-size:11px; }
.player[data-story-theme][data-presentation="immersive"] :is(button,input,summary):focus-visible { outline:2px solid var(--scene-gold); outline-offset:4px; }
.product-shell:has(.play-page .player[data-story-theme][data-presentation="immersive"]) .product-nav { display:none; }
.studio-main .play-page:has(.player[data-story-theme][data-presentation="immersive"]) { padding:0; min-height:100svh; background:#0b1419; }
.play-page:has(.player[data-story-theme][data-presentation="immersive"]) .play-heading { position:absolute; z-index:2; top:0; left:0; right:0; max-width:none; padding:18px clamp(24px,6vw,100px); gap:16px; border-bottom:1px solid #f5f0e721; background:linear-gradient(#071119ad,#07111933); color:#f5f0e7; }
.play-page:has(.player[data-story-theme][data-presentation="immersive"]) .play-heading :is(.text-button,.button) { color:#f5f0e7; font-size:12px; }
.play-page:has(.player[data-story-theme][data-presentation="immersive"]) .play-heading .button { background:#14212baa; border-color:#f5f0e73d; }
.play-page .player[data-story-theme][data-presentation="immersive"] .scene-glow { position:absolute; }
.story-preview-stage:has(.player[data-story-theme][data-presentation="immersive"]) { padding:0; overflow:hidden; }
.player.compact[data-presentation="immersive"], .story-preview-stage .player[data-story-theme][data-presentation="immersive"] { --scene-inset:24px; min-height:720px; padding:24px; border-radius:8px; }
.player.compact[data-presentation="immersive"] .player-top { font-size:9px; letter-spacing:1px; }
.player.compact[data-presentation="immersive"] .player-reading, .story-preview-stage .player[data-story-theme][data-presentation="immersive"] .player-reading { margin-top:12px; }
.player.compact[data-presentation="immersive"] .scene-image { max-height:400px; }
.player.compact[data-presentation="immersive"] h2 { font-size:34px; }
.player.compact[data-presentation="immersive"] .narrative { font-size:16px; line-height:1.8; }
@media(max-width:600px) {
  .player-top { gap:12px; }
  .player[data-story-theme][data-presentation="immersive"] { --scene-inset:24px; padding:85px 24px 26px; }
  .player[data-story-theme][data-presentation="immersive"] .player-top { font-size:9px; letter-spacing:1.1px; align-items:flex-start; }
  .player[data-story-theme][data-presentation="immersive"] .player-reading { margin-top:12px; }
  .player[data-story-theme][data-presentation="immersive"] h2 { font-size:36px; line-height:1.12; }
  .player[data-story-theme][data-presentation="immersive"] .narrative { font-size:17px; line-height:1.85; }
  .player[data-story-theme][data-presentation="immersive"] .choice-button { padding:14px; font-size:13px; }
  .play-page:has(.player[data-story-theme][data-presentation="immersive"]) .play-heading { padding:14px 24px; }
  .play-page:has(.player[data-story-theme][data-presentation="immersive"]) .play-heading > span { display:none; }
}
@media(prefers-reduced-motion:reduce) { .player[data-story-theme][data-presentation="immersive"] .choice-button { transition:none; } }
${soundPopoverCSS}
`;
