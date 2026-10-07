import Skeleton from "@/shared/ui/skeleton";
import styles from "./editor-skeleton.module.css";

function NodeSkeleton({ index }: { index: number }) {
  return <div className={`${styles.node} ${styles[`node${index}`]}`}>
    <div className={styles.nodeHeading}><Skeleton className={styles.eyebrow} /><Skeleton className={styles.nodeTitle} /></div>
    <Skeleton className={styles.scene} />
    <div className={styles.nodeChoices}><Skeleton /><Skeleton /></div>
  </div>;
}

export function GraphSkeleton() {
  return <div className={styles.graph} role="status" aria-label="Loading story map">
    <div aria-hidden="true" className={styles.graphContents}>
      <Skeleton className={styles.mapLabel} />
      <div className={styles.mapTools}><Skeleton /><Skeleton /></div>
      <div className={styles.map}>
        <svg className={styles.edges} viewBox="0 0 1000 500" preserveAspectRatio="none">
          <path d="M 255 250 C 310 250 310 95 365 95 M 255 250 C 310 250 310 405 365 405 M 595 95 C 650 95 650 250 705 250 M 595 405 C 650 405 650 250 705 250" />
        </svg>
        {[0, 1, 2, 3].map(index => <NodeSkeleton key={index} index={index} />)}
      </div>
      <div className={styles.zoom}><Skeleton /><Skeleton /><Skeleton /></div>
      <Skeleton className={styles.hint} />
    </div>
  </div>;
}

export default function EditorSkeleton() {
  return <main className={styles.editor} aria-busy="true" aria-label="Loading story editor">
    <span className="sr-only" role="status">Loading your story and checking its media…</span>
    <div className={styles.header} aria-hidden="true">
      <div className={styles.identity}><Skeleton className={styles.eyebrow} /><Skeleton className={styles.title} /><Skeleton className={styles.save} /></div>
      <div className={styles.actions}><Skeleton /><Skeleton /></div>
    </div>
    <div className={styles.toolbar} aria-hidden="true"><Skeleton className={styles.history} /><Skeleton className={styles.check} /><div className={styles.actions}><Skeleton /><Skeleton /></div></div>
    <GraphSkeleton />
    <div className={styles.footer} aria-hidden="true"><Skeleton /><Skeleton /></div>
  </main>;
}
