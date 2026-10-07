import { memo, useId } from "react";
import { BezierEdge, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";

export type ChoiceEdge = Edge<{ highlighted: boolean; highlightKey: string }, "choice">;

export default memo(function StoryEdge(props: EdgeProps<ChoiceEdge>) {
  const gradientId = `story-edge-${useId().replace(/:/g, "")}`;
  const highlighted = props.data?.highlighted;
  const left = Math.min(props.sourceX, props.targetX);
  const right = Math.max(props.sourceX, props.targetX);
  const highlightPath = highlighted ? getBezierPath(props)[0] : "";
  return <>
    {highlighted && <defs>
      {/* Canvas coordinates keep the gradient visible on horizontal and vertical edges. */}
      <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={left} y1={0} x2={Math.max(right, left + 1)} y2={0}>
        <stop offset="0%" stopColor="var(--orange)" stopOpacity={0.45} />
        <stop offset="65%" stopColor="var(--orange)" stopOpacity={0.85} />
        <stop offset="100%" stopColor="var(--orange)" />
      </linearGradient>
    </defs>}
    <BezierEdge {...props} style={highlighted && !props.animated ? { ...props.style, stroke: "var(--graph-edge)", strokeWidth: 1.5 } : props.style} />
    {highlighted && <path key={props.data?.highlightKey} className="story-edge-flow" d={highlightPath} pathLength={1}
      fill="none" stroke={`url(#${gradientId})`} strokeWidth={props.style?.strokeWidth ?? 2} strokeLinecap="round"
      data-reverse={props.sourceX > props.targetX || undefined} pointerEvents="none" aria-hidden="true" />}
  </>;
});
