"use client";
import { useState } from "react";
import { ImageIcon } from "lucide-react";
import Skeleton from "@/shared/ui/skeleton";
import type { StorySummary } from "@/modules/storage/model";
import styles from "./story-cover.module.css";

export default function StoryCover({ story, variant, onEdit }: {
  story: StorySummary; variant: number; onEdit: () => void;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const [loadedSrc, setLoadedSrc] = useState<string>();
  const source = story.coverSrc;
  const showImage = Boolean(source && source !== failedSrc);
  const loading = showImage && loadedSrc !== source;
  const symbol = [null, "◇", "◒"][variant];
  return (
    <button className={`written-cover cover-${variant}`} onClick={onEdit} aria-label={`Edit ${story.title}`} aria-busy={loading}>
      {showImage ? (
        // Data URLs and private media routes are served directly, without the image proxy.
        // eslint-disable-next-line @next/next/no-img-element
        <img key={source} className={`story-cover-image ${styles.image} ${loading ? styles.pending : ""}`} src={source} alt="" loading="lazy" decoding="async"
          onLoad={() => { setLoadedSrc(source); setFailedSrc(undefined); }} onError={() => setFailedSrc(source)} />
      ) : (
        <>
          <span className="cover-label">YOUR NEXT ADVENTURE</span>
          {symbol && <span className="cover-symbol" aria-hidden="true">{symbol}</span>}
          <span className="cover-title">{story.title || "Untitled story"}</span>
        </>
      )}
      {loading && <Skeleton className={styles.loading}><ImageIcon strokeWidth={1.25} /></Skeleton>}
    </button>
  );
}
