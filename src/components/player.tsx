"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ArrowUpRight, RotateCcw, Flag, ArrowRight } from "lucide-react";
import { passageById, type Story } from "@/lib/story";
export default function Player({
  story,
  startId,
  compact = false,
}: {
  story: Story;
  startId?: string;
  compact?: boolean;
}) {
  const [current, setCurrent] = useState(startId || story.startId);
  const [steps, setSteps] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const passage = passageById(story, current);
  useEffect(() => {
    if (steps > 0) {
      heading.current?.focus({ preventScroll: true });
      if (!compact) heading.current?.scrollIntoView({ block: "start" });
    }
  }, [steps, compact]);
  const go = (id: string) => {
    setCurrent(id);
    setSteps((s) => s + 1);
  };
  return (
    <div className={`player ${compact ? "compact" : ""}`}>
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
          {passage.image && (
            <Image
              unoptimized
              width={800}
              height={480}
              className="scene-image"
              src={passage.image}
              alt={`Illustration for ${passage.title}`}
            />
          )}
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
            {passage.ending ? (
              <div className="ending">
                <span className="ending-mark">✳</span>
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
                  onClick={() => go(c.target)}
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
        </>
      )}
      <div className="player-signature">
        A story made with{" "}
        <strong>
          dextro<span>✳</span>
        </strong>
      </div>
    </div>
  );
}
