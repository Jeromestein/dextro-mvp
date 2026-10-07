"use client";
import { useState } from "react";
import type { StorySummary } from "@/modules/storage/model";

export default function StoryCover({ story, variant, onEdit }: {
  story: StorySummary; variant: number; onEdit: () => void;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const source = story.coverSrc;
  const showImage = Boolean(source && source !== failedSrc);
  const symbol = [null, "◇", "◒"][variant];
  return (
    <button className={`written-cover cover-${variant}`} onClick={onEdit} aria-label={`Edit ${story.title}`}>
      {showImage ? (
        // Data URLs and private media routes are served directly, without the image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="story-cover-image" src={source} alt="" loading="lazy" decoding="async"
          onLoad={() => setFailedSrc(undefined)} onError={() => setFailedSrc(source)} />
      ) : (
        <>
          <span className="cover-label">YOUR NEXT ADVENTURE</span>
          {symbol && <span className="cover-symbol" aria-hidden="true">{symbol}</span>}
          <span className="cover-title">{story.title || "Untitled story"}</span>
        </>
      )}
    </button>
  );
}
