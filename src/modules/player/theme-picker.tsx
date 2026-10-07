"use client";
import { useId } from "react";
import type { Story } from "@/modules/story/model";
import { resolveTheme, storyThemes, themeIds, themeVariables, type Appearance } from "@/modules/story/themes";

export default function ThemePicker({ story, onChange, onSceneGlowChange }: { story: Story; onChange: (theme: Appearance["theme"]) => void; onSceneGlowChange: (enabled: boolean) => void }) {
  const id = useId();
  const selected = story.appearance?.theme || "auto";
  const recommended = resolveTheme({ ...story, appearance: { ...story.appearance, theme: "auto" } });
  return <fieldset className="theme-picker">
    <legend>Story atmosphere</legend>
    <label className="theme-auto">
      <input type="radio" name={id} value="auto" checked={selected === "auto"} onChange={() => onChange("auto")} />
      <span>Auto <span className="theme-recommendation">· {recommended.label}</span></span>
      <span className="theme-auto-hint">Recommended</span>
    </label>
    <div className="theme-swatches">
      {themeIds.map(key => {
        const theme = storyThemes[key];
        return <label key={key} className="theme-option" data-selected={selected === key}>
          <input type="radio" name={id} value={key} checked={selected === key} onChange={() => onChange(key)} aria-label={`${theme.label} theme`} />
          <span className="theme-swatch" style={themeVariables(theme)} aria-hidden="true"><span>Aa</span><i /><i /></span>
          <span className="theme-option-name">{theme.label}</span>
          <span className="theme-option-description">{theme.description}</span>
        </label>;
      })}
    </div>
    <label className="scene-glow-toggle">
      <span><strong>Scene glow</strong><small>Let each scene image softly color the background.</small></span>
      <input type="checkbox" role="switch" aria-label="Scene glow" checked={story.appearance?.sceneGlow !== false} onChange={event => onSceneGlowChange(event.target.checked)} />
    </label>
    <p>Your theme stays consistent. Scenes add a touch of color.</p>
  </fieldset>;
}
