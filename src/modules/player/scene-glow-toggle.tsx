"use client";

export default function SceneGlowToggle({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  return <label className="scene-glow-toggle">
    <span><strong>Scene glow</strong><small>Let each scene image softly color the background.</small></span>
    <input type="checkbox" role="switch" aria-label="Scene glow" checked={enabled} onChange={event => onChange(event.target.checked)} />
  </label>;
}
