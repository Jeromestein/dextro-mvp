import type { CSSProperties, ReactNode } from "react";
import styles from "./skeleton.module.css";

export default function Skeleton({ className = "", style, children }: {
  className?: string; style?: CSSProperties; children?: ReactNode;
}) {
  return <span aria-hidden="true" className={`${styles.block} ${className}`} style={style}>{children}</span>;
}
