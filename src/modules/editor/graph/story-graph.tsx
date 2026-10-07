"use client";
import Image from "next/image";
import { assignedAsset } from "@/modules/media/assets/operations";
import type { PlaybackProgress } from "@/modules/player/player";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ReactFlow, ReactFlowProvider, Background, Handle, Position, MarkerType, Panel,
  useReactFlow, useUpdateNodeInternals, useViewport, type Node, type NodeProps, type NodeChange,
  type OnConnectEnd, type Viewport as FlowViewport } from "@xyflow/react";
import { AlertCircle, ArrowUpRight, Flag, Link2, Plus, Minus, Unlink, X, Focus, ImagePlus, Music2, MousePointer2, Move, PenLine } from "lucide-react";
import { GRAPH_COORDINATE_LIMIT, type Issue, type Passage, type Story } from "@/modules/story/model";
import { NODE_WIDTH, positionsFor } from "./layout";
import StoryEdge, { type ChoiceEdge } from "./story-edge";
import type { Point, Positions, ChoiceRef, Viewport } from "../session/types";

type PassageNode = Node<{
  readOnly: boolean; image: string; music: string; showThumbnails: boolean; playing: boolean;
  passage: Passage; opening: boolean; issues: Issue[]; connecting: boolean;
  onMedia: (id: string) => void;
  onSelect: (id: string) => void; onChoice: (id: string) => void; onConnect: (ref: ChoiceRef) => void;
}, "passage">;
const PassageCard = memo(function PassageCard({ id, data, selected }: NodeProps<PassageNode>) {
  const { passage: p } = data;
  const updateHandles = useUpdateNodeInternals();
  const handles = p.choices.map((c) => c.id).join("|");
  useEffect(() => { updateHandles(id); }, [id, handles, p.ending, data.showThumbnails, updateHandles]);
  return <div className={`map-node ${selected ? "selected" : ""} ${p.ending ? "ending" : ""} ${data.connecting ? "connect-target" : ""} ${data.playing ? "playing" : ""}`}>
    <Handle type="target" position={Position.Left} id="in" aria-label={`Connect to ${p.title || "Untitled passage"}`} />
    <div className="map-node-heading">
      <span className="map-node-type">{data.opening ? <><span className="opening-dot" /> Opening</> : p.ending ? <><Flag size={12} /> Ending</> : "Passage"}</span>
      <button className="map-node-title nodrag" onClick={() => data.onSelect(id)} title={p.title || "Untitled passage"}>{p.title || "Untitled passage"}</button>
      {data.issues.length > 0 && <button className={`map-node-problem nodrag ${data.issues.some((i) => i.level === "error") ? "error" : ""}`} onClick={() => data.onSelect(id)} aria-label={`${data.issues.length} issues in ${p.title}`} title={data.issues.map((i) => i.message).join("\n")}><AlertCircle size={14} /></button>}
    </div>
    {data.showThumbnails && <button className="map-scene nodrag" aria-label={`Media for ${p.title}`} onClick={(e) => { e.stopPropagation(); data.onMedia(id); }}>{data.image ? <Image unoptimized src={data.image} fill sizes="250px" alt="Scene thumbnail" /> : <><ImagePlus size={19} /><span>No scene image</span></>}</button>}
    <div className="map-music"><Music2 size={11} /><span>{data.music || "Silence"}</span>{data.playing && <b>Playing</b>}</div>
    {!p.ending && p.choices.map((c, i) => <div className={`map-choice ${!c.target ? "unconnected" : ""}`} key={c.id}>
      <span className="map-choice-number">{i + 1}</span><span className="map-choice-label" title={c.text || "Untitled choice"}>{c.text || "Untitled choice"}</span>
      <button disabled={data.readOnly} className="map-connect-button nodrag" aria-label={`Choose destination for ${c.text || `choice ${i + 1}`}`} title="Click to choose a destination" onClick={(e) => { e.stopPropagation(); data.onConnect({ passageId: id, choiceId: c.id }); }}><ArrowUpRight size={13} /></button>
      <Handle type="source" position={Position.Right} id={c.id} aria-label={`Drag to connect ${c.text || `choice ${i + 1}`}`} />
    </div>)}
    {p.ending ? <div className="map-ending-caption">A place to end the journey.</div> : <button className="map-add-choice nodrag" disabled={data.readOnly || p.choices.length >= 8} onClick={(e) => { e.stopPropagation(); data.onChoice(id); }}><Plus size={12} /> Add choice</button>}
  </div>;
});
const nodeTypes = { passage: PassageCard };
const edgeTypes = { choice: StoryEdge };
type Props = {
  readOnly?: boolean;
  toolbarHost?: HTMLDivElement | null;
  playback?: PlaybackProgress; onMedia: (id: string) => void;
  story: Story; selected: string; issues: Issue[]; focusToken: number;
  onSelect: (id: string) => void; onSelectEdge?: () => void;
  onMove: (positions: Positions) => void; onViewport: (v: Viewport) => void;
  onConnect: (ref: ChoiceRef, target: string) => void; onAddChoice: (id: string) => void;
  onCreateAt: (position: Point, from?: ChoiceRef) => void; onDelete: (id: string) => void;
};
function Graph(props: Props) {
  const { story, selected, issues, onSelect, onMove, onConnect, onAddChoice, onMedia, playback } = props;
  const readOnly = props.readOnly === true;
  const playingId = playback?.current;
  const flow = useReactFlow<PassageNode>();
  const { zoom } = useViewport();
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [dragPositions, setDragPositions] = useState<Record<string, Point>>({});
  const [measurements, setMeasurements] = useState<Record<string, { width: number; height: number }>>({});
  const [pending, setPending] = useState<ChoiceRef | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<ChoiceRef | null>(null);
  const reconnecting = useRef(false);
  const graphRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const latest = useRef(props);
  useEffect(() => { latest.current = props; });
  const select = useCallback((id: string) => {
    if (pending) { onConnect(pending, id); setPending(null); }
    setSelectedEdge(null); onSelect(id);
  }, [pending, onConnect, onSelect]);
  const positions = useMemo(() => new Map(positionsFor(story).map((p) => [p.id, p])), [story]);
  const nodes: PassageNode[] = useMemo(() => story.passages.map((p) => ({
    id: p.id, type: "passage", position: dragPositions[p.id] || positions.get(p.id)!, width: NODE_WIDTH,
    measured: measurements[p.id],
    selected: p.id === selected, dragHandle: ".map-node-heading", ariaLabel: `${p.title || "Untitled passage"}, ${p.ending ? "ending" : "passage"}`,
    data: { readOnly, image: assignedAsset(story, p, "image")?.data || "", music: assignedAsset(story, p, "audio")?.name || "",
      showThumbnails, playing: playingId === p.id, onMedia, passage: p, opening: story.startId === p.id, issues: issues.filter((i) => i.passageId === p.id),
      connecting: !!pending, onSelect: select, onChoice: onAddChoice, onConnect: setPending },
  })), [story, dragPositions, measurements, positions, selected, issues, pending, select, onAddChoice, onMedia, playingId, showThumbnails, readOnly]);
  const edges: ChoiceEdge[] = useMemo(() => story.passages.flatMap((p) => p.ending ? [] : p.choices.flatMap((c) => {
    if (!story.passages.some((p) => p.id === c.target)) return [];
    const visited = playback?.path.some((step) => step.passageId === p.id && step.choiceId === c.id && step.target === c.target);
    const active = p.id === selected || c.target === selected;
    const edgeSelected = selectedEdge?.passageId === p.id && selectedEdge.choiceId === c.id;
    const highlighted = active || edgeSelected;
    return [{ id: JSON.stringify([p.id, c.id]), source: p.id, sourceHandle: c.id, target: c.target, targetHandle: "in",
      animated: !!visited,
      reconnectable: readOnly ? false : "target" as const, type: "choice" as const, selected: edgeSelected,
      data: { highlighted, highlightKey: edgeSelected ? JSON.stringify([p.id, c.id]) : selected },
      ariaLabel: `${c.text || "Untitled choice"} from ${p.title} to ${story.passages.find((p) => p.id === c.target)?.title}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: visited || highlighted ? "var(--orange)" : "var(--graph-edge)" },
      style: { stroke: visited || highlighted ? "var(--orange)" : "var(--graph-edge)", strokeWidth: visited ? 3 : edgeSelected ? 2.5 : active ? 2 : 1.5 } }];
  })), [story, selected, selectedEdge, playback, readOnly]);

  const onNodesChange = useCallback((changes: NodeChange<PassageNode>[]) => {
    const dimensions = changes.filter((c) => c.type === "dimensions" && c.dimensions);
    if (dimensions.length) setMeasurements((old) => {
      const next = { ...old };
      dimensions.forEach((c) => { if (c.type === "dimensions" && c.dimensions) next[c.id] = c.dimensions; });
      return next;
    });
    const moves = changes.filter((c) => c.type === "position" && c.position);
    if (moves.length) {
      const next: Record<string, Point> = {};
      moves.forEach((c) => { if (c.type === "position" && c.position) next[c.id] = c.position; });
      if (dragging.current) setDragPositions((old) => ({ ...old, ...next }));
      else onMove(Object.entries(next).map(([id, p]) => ({ id, ...p })));
    }
  }, [onMove]);
  const fit = useCallback(() => { void flow.fitView({ padding: .18, minZoom: .2, maxZoom: 1, duration: 250 }); }, [flow]);
  useEffect(() => {
    if (!props.focusToken) return;
    const current = latest.current;
    const position = positionsFor(current.story).find((p) => p.id === current.selected);
    if (position) {
      const zoom = Math.max(.85, flow.getZoom());
      const width = graphRef.current?.clientWidth || 800;
      const offset = width < 500 ? 0 : width / (4 * zoom);
      void flow.setCenter(position.x + NODE_WIDTH / 2 + offset, position.y + 100, { zoom, duration: 200 });
    }
  }, [props.focusToken, flow]);
  const onConnectEnd: OnConnectEnd = (event, state) => {
    if (reconnecting.current || state.isValid || state.toNode || state.fromHandle?.type !== "source" || !state.fromNode || !state.fromHandle.id) return;
    const target = event.target;
    if (!(target instanceof Element) || !target.closest(".react-flow__pane")) return;
    const point = "changedTouches" in event ? event.changedTouches[0] : event;
    props.onCreateAt(flow.screenToFlowPosition({ x: point.clientX, y: point.clientY }), { passageId: state.fromNode.id, choiceId: state.fromHandle.id });
  };
  const edgeChoice = selectedEdge && story.passages.find((p) => p.id === selectedEdge.passageId)?.choices.find((c) => c.id === selectedEdge.choiceId);
  const pendingChoice = pending && story.passages.find((p) => p.id === pending.passageId)?.choices.find((c) => c.id === pending.choiceId);
  const canvasControls = <div className="graph-canvas-controls" role="group" aria-label="Canvas view">
    <div className="graph-zoom-controls">
      <button aria-label="Zoom out" title="Zoom out" disabled={zoom <= .2} onClick={() => void flow.zoomOut()}><Minus size={15} /></button>
      <span className="graph-zoom-level" aria-label={`Zoom ${Math.round(zoom * 100)} percent`}>{Math.round(zoom * 100)}%</span>
      <button aria-label="Zoom in" title="Zoom in" disabled={zoom >= 2} onClick={() => void flow.zoomIn()}><Plus size={15} /></button>
    </div>
    <button title="Fit all passages without moving them" onClick={fit}><Focus size={15} /> Fit view</button>
    <button aria-pressed={showThumbnails} title="Show or hide scene images on the map" onClick={() => setShowThumbnails(show => !show)}><ImagePlus size={15} /> Images</button>
  </div>;
  return <div className="story-graph" ref={graphRef} aria-label="Story graph" onKeyDown={(e) => {
    if (readOnly) return;
    if ((e.target as HTMLElement).closest("input,textarea,select,[contenteditable=true],.graph-canvas-controls")) return;
    if (e.key === "Escape") { setPending(null); setSelectedEdge(null); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); if (selectedEdge) { onConnect(selectedEdge, ""); setSelectedEdge(null); } else props.onDelete(selected); }
  }}>
    {props.toolbarHost ? createPortal(canvasControls, props.toolbarHost) : <div className="graph-inline-toolbar">{canvasControls}</div>}
    <ReactFlow<PassageNode, ChoiceEdge> nodesDraggable={!readOnly} nodesConnectable={!readOnly} edgesReconnectable={!readOnly} nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onNodesChange={onNodesChange}
      onNodeClick={(_, n) => select(n.id)} onEdgeClick={(_, e) => { setPending(null); setSelectedEdge({ passageId: e.source, choiceId: e.sourceHandle! }); props.onSelectEdge?.(); }}
      onPaneClick={() => { setPending(null); setSelectedEdge(null); }}
      onNodeDragStart={() => { dragging.current = true; }}
      onNodeDragStop={(_, n, moved) => { onMove((moved.length ? moved : [n]).map((n) => ({ id: n.id, ...n.position }))); dragging.current = false; setDragPositions({}); }}
      onConnect={(c) => { if (c.sourceHandle) { onConnect({ passageId: c.source, choiceId: c.sourceHandle }, c.target); setPending(null); } }}
      onConnectEnd={onConnectEnd} onReconnectStart={() => { reconnecting.current = true; }}
      onReconnect={(edge, connection) => { if (edge.sourceHandle) onConnect({ passageId: edge.source, choiceId: edge.sourceHandle }, connection.target); }}
      onReconnectEnd={() => { reconnecting.current = false; }}
      isValidConnection={(c) => !!c.sourceHandle && !!c.target && !!story.passages.find((p) => p.id === c.source && !p.ending)?.choices.some((v) => v.id === c.sourceHandle)}
      onMoveEnd={(_, v: FlowViewport) => props.onViewport(v)}
      defaultViewport={story.editor?.viewport} fitView={!story.editor?.viewport} fitViewOptions={{ padding: .2, minZoom: .2, maxZoom: .9 }}
      minZoom={.2} maxZoom={2} deleteKeyCode={null} selectionKeyCode={null} multiSelectionKeyCode={null} autoPanOnNodeFocus={false}
      nodeExtent={[[-GRAPH_COORDINATE_LIMIT, -GRAPH_COORDINATE_LIMIT], [GRAPH_COORDINATE_LIMIT, GRAPH_COORDINATE_LIMIT]]}
      snapToGrid snapGrid={[10, 10]} panOnScroll zoomOnDoubleClick={false} elevateEdgesOnSelect
      onNodeDoubleClick={(_, n) => onSelect(n.id)}>
      <Background color="var(--line)" gap={22} size={1} />
      <Panel position="top-left"><div className="graph-caption"><span className="graph-caption-dot" /> YOUR STORY MAP <small>{story.passages.length} passages · {story.passages.filter((p) => p.ending).length} endings</small></div></Panel>
      <Panel position="bottom-left" className="graph-tools-panel">
        <aside className="graph-tools" aria-label="Story map tools" aria-live="polite">
          <div className="graph-tools-heading"><PenLine size={15} /><span>{pending ? "Connect choice" : !readOnly && selectedEdge && edgeChoice ? "Connection" : readOnly ? "Preview story" : "Edit story"}</span></div>
          {pending ? <div className="graph-tools-body">
            <p className="graph-tools-choice" title={pendingChoice?.text}>{pendingChoice?.text || "Untitled choice"}</p>
            <p className="graph-tools-help">Click a passage to connect this choice.</p>
            <button className="graph-tools-action" onClick={() => setPending(null)}><X size={15} /> Cancel connection</button>
          </div> : !readOnly && selectedEdge && edgeChoice ? <div className="graph-tools-body">
            <p className="graph-tools-choice" title={edgeChoice.text}>{edgeChoice.text || "Untitled choice"}</p>
            <p className="graph-tools-help">Disconnect the link to change where this choice leads.</p>
            <button className="graph-tools-action" onClick={() => { onConnect(selectedEdge, ""); setSelectedEdge(null); }}><Unlink size={15} /> Disconnect</button>
          </div> : <ul className="graph-tools-guide">
            <li><MousePointer2 size={17} /><span><strong>Click a passage</strong><small>{readOnly ? "Preview its scene" : "Edit text & media"}</small></span></li>
            {!readOnly && <li><Move size={17} /><span><strong>Drag a heading</strong><small>Move the passage</small></span></li>}
            {!readOnly && <li><Link2 size={17} /><span><strong>Click a connection</strong><small>Manage its link</small></span></li>}
            {readOnly && <li><Move size={17} /><span><strong>Scroll to pan</strong><small>Explore the map</small></span></li>}
          </ul>}
        </aside>
      </Panel>
    </ReactFlow>
  </div>;
}
export default function StoryGraph(props: Props) { return <ReactFlowProvider><Graph {...props} /></ReactFlowProvider>; }
