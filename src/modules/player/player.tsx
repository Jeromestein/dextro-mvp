"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowUpRight, RotateCcw, Flag, ArrowRight } from "lucide-react";
import SoundControls from "@/modules/media/audio/sound-controls";
import { assignedAsset } from "@/modules/media/assets/operations";
import { passageById, type Story } from "@/modules/story/model";
import { resolveTheme, themeVariables } from "@/modules/story/themes";
import SceneGlow from "./scene-glow";
import { immersiveCSS } from "./presentation";
export type PlaybackProgress = { current: string; path: { passageId: string; choiceId: string; target: string }[] };
export default function Player({
  story,
  startId,
  compact = false,
  onProgress,
}: {
  story: Story;
  startId?: string;
  compact?: boolean;
  onProgress?: (progress: PlaybackProgress) => void;
}) {
  const theme = resolveTheme(story);
  const [current, setCurrent] = useState(startId || story.startId);
  const [path, setPath] = useState<PlaybackProgress["path"]>([]);
  const [steps, setSteps] = useState(0);
  const player = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const passage = passageById(story, current);
  const image = assignedAsset(story, passage, "image");
  const music = assignedAsset(story, passage, "audio");
  useEffect(() => { onProgress?.({ current: passage ? current : "", path }); }, [current, path, onProgress, passage]);
  useEffect(() => {
    if (steps > 0) {
      heading.current?.focus({ preventScroll: true });
      if (!compact) player.current?.scrollIntoView({ block: "start" });
    }
  }, [steps, compact]);
  const go = (id: string, choiceId?: string) => {
    setPath((old) => choiceId ? [...old, { passageId: current, choiceId, target: id }] : []);
    setCurrent(id);
    setSteps((s) => s + 1);
  };
  return (
    <div ref={player} className={`player scene-reading-surface ${compact ? "compact" : ""}`} data-presentation="immersive" data-has-scene={Boolean(image)} data-story-theme={theme.id} style={themeVariables(theme)}>
      <style>{immersiveCSS}</style>
      <SceneGlow source={story.appearance?.sceneGlow === false ? "" : image?.data || ""} />
      <div className="player-top">
        <span>{compact ? "READER VIEW" : story.genre.toUpperCase()}</span>
        <button
          className="icon-button"
          title="Restart story"
          aria-label="Restart story"
          onClick={() => go(startId || story.startId)}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {story.assets.some((a) => a.kind === "audio") && <details className="player-audio"><summary>Sound</summary><SoundControls gameId={compact ? undefined : story.id} data={music?.data || ""} title={music?.name || ""} /></details>}
      {!passage ? (
        <div className="empty-passage">
          <h2>Passage unavailable</h2>
          <p>This passage was removed. Return to the beginning.</p>
          <button className="button" onClick={() => go(story.startId)}>
            Restart
          </button>
        </div>
      ) : (
        <>
          {image && (
            <Image
              unoptimized
              width={800}
              height={480}
              className="scene-image"
              src={image.data}
              alt={`Illustration for ${passage.title}`}
            />
          )}
          <div className="player-reading">
          <div className="passage-eyebrow">
            {passage.ending ? (
              <>
                <Flag size={12} /> An ending
              </>
            ) : current === story.startId ? (
              "The beginning"
            ) : (
              "The next chapter"
            )}
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {passage.title || "Untitled passage"}
          </h2>
          <div className="narrative">
            {passage.text ||
              "Your story will appear here. Start writing and watch it come to life."}
          </div>
          <div className="player-choices">
            {!passage.ending && passage.choices.length > 0 && <p className="choices-prompt">What will you do?</p>}
            {passage.ending ? (
              <div className="ending">
                <p>The end.</p>
                <span>Another choice, another story.</span>
                <button
                  className="choice-button"
                  onClick={() => go(story.startId)}
                >
                  Begin again <ArrowUpRight size={17} />
                </button>
              </div>
            ) : passage.choices.length ? (
              passage.choices.map((c, i) => (
                <button
                  className="choice-button"
                  key={c.id}
                  disabled={!passageById(story, c.target)}
                  onClick={() => go(c.target, c.id)}
                >
                  <span className="choice-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    {c.text || "Untitled choice"}
                    {!passageById(story, c.target) && (
                      <small> · Not connected</small>
                    )}
                  </span>
                  <ArrowRight size={16} />
                </button>
              ))
            ) : (
              <p className="quiet">
                Add a choice or mark this passage as an ending.
              </p>
            )}
          </div>
          </div>
        </>
      )}
      {story.assets.some((a) => a.credit) && <details className="media-credits"><summary>Media credits</summary>{story.assets.filter((a) => a.credit).map((a) => <p key={a.id}><strong>{a.name}</strong> — {a.credit}</p>)}</details>}
      <div className="player-signature">
        A story made with{" "}
        <strong>dextro</strong>
      </div>
    </div>
  );
}
