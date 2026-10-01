"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { Story } from "@/lib/story";
import Player from "./player";

export default function AIDraftReview({
  story,
  repaired,
  onKeep,
  onDiscard,
}: {
  story: Story;
  repaired: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const [start, setStart] = useState(story.startId);
  const [run, setRun] = useState(0);
  const preview = (id: string) => {
    setStart(id);
    setRun((n) => n + 1);
  };
  return (
    <div className="generation-review">
      <span className="tag">DRAFT READY · NOT SAVED YET</span>
      <h3>{story.title}</h3>
      <p>{story.description}</p>
      <div className="review-stats" role="status">
        <CheckCircle2 size={15} /> {story.passages.length} passages ·{" "}
        {story.passages.filter((p) => p.ending).length} endings · Paths checked
      </div>
      {repaired && (
        <p className="quiet">
          We fixed a few connections before bringing you this draft.
        </p>
      )}
      <div className="draft-preview-tools">
        <label className="field-label">
          Preview from passage
          <select value={start} onChange={(e) => preview(e.target.value)}>
            {story.passages.map((p, i) => (
              <option key={p.id} value={p.id}>
                {String(i + 1).padStart(2, "0")} · {p.title}
                {p.ending
                  ? " · Ending"
                  : p.id === story.startId
                    ? " · Opening"
                    : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button"
          onClick={() => preview(story.startId)}
        >
          Play from opening
        </button>
      </div>
      <p className="quiet">
        Follow the choices, or jump to any passage to review every ending.
      </p>
      <div className="draft-player">
        <Player key={run} story={story} startId={start} compact />
      </div>
      <div className="draft-review-footer">
        <p className="quiet">
          Keep this as a new story to edit and export. Check the writing and
          continuity as you play.
        </p>
        <div className="dialog-actions">
          <button className="button" onClick={onDiscard}>
            Discard draft
          </button>
          <button className="button primary" onClick={onKeep}>
            Keep & edit <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
