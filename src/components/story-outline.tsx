"use client";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronRight, CornerDownRight, Flag, GitMerge, RotateCcw, AlertCircle } from "lucide-react";
import { outlineFor, type OutlineItem } from "@/lib/editor";
import type { Issue, Story } from "@/lib/story";

export default function StoryOutline({ story, selected, issues, onSelect }: {
  story: Story; selected: string; issues: Issue[]; onSelect: (id: string) => void;
}) {
  const outline = useMemo(() => outlineFor(story), [story]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const containsSelection = (item: OutlineItem): boolean => item.passage.id === selected ||
    item.branches.some((b) => b.child && containsSelection(b.child));
  const renderItem = (item: OutlineItem, depth = 0) => {
    const p = item.passage;
    const closed = collapsed.has(p.id) && !item.branches.some((b) => b.child && containsSelection(b.child));
    const problems = issues.filter((i) => i.passageId === p.id);
    return <div className={`outline-entry ${item.disconnected ? "disconnected" : ""}`} key={p.id}>
      {item.disconnected && <div className="outline-detached"><AlertCircle size={13} /> Separate branch</div>}
      <div className={`outline-passage ${selected === p.id ? "selected" : ""}`}>
        <button className="outline-toggle" disabled={!item.branches.length} aria-expanded={!closed}
          aria-label={`${closed ? "Expand" : "Collapse"} ${p.title || "Untitled passage"}`} onClick={() => {
            if (!closed && item.branches.some((b) => b.child && containsSelection(b.child))) onSelect(p.id);
            setCollapsed((previous) => { const next = new Set(previous); if (closed) next.delete(p.id); else next.add(p.id); return next; });
          }}>{p.ending ? <Flag size={15} /> : closed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}</button>
        <button className="outline-select" onClick={() => onSelect(p.id)} aria-pressed={selected === p.id}>
          <span><strong>{p.title || "Untitled passage"}</strong><small>{p.id === story.startId ? "Opening" : p.ending ? "Ending" : `${p.choices.length} choices`}</small></span>
          {problems.length > 0 && <span className={`outline-issue ${problems.some((i) => i.level === "error") ? "error" : ""}`} aria-label={`${problems.length} issues`}><AlertCircle size={14} /></span>}
        </button>
      </div>
      {!closed && <div className={`outline-branches ${depth >= 3 ? "flat" : ""}`}>
        {item.branches.map((b) => <div className="outline-branch" key={b.choice.id}>
          <div className="outline-choice-label"><CornerDownRight size={14} /><span>{b.choice.text || "Untitled choice"}</span></div>
          {b.child ? renderItem(b.child, depth + 1) : b.reference === "missing" ?
            <button className="outline-reference missing" onClick={() => onSelect(p.id)}><AlertCircle size={14} /> Choose a destination <ArrowRight size={13} /></button> :
            <button className="outline-reference" onClick={() => onSelect(b.choice.target)}>
              {b.reference === "loop" ? <RotateCcw size={14} /> : <GitMerge size={14} />}
              <span>{b.reference === "loop" ? "Return to" : "Continue at"} <strong>{story.passages.find((p) => p.id === b.choice.target)?.title || "Untitled passage"}</strong></span><ArrowRight size={13} />
            </button>}
        </div>)}
      </div>}
    </div>;
  };
  return <div className="story-outline" aria-label="Story outline">
    <div className="outline-intro"><span className="kicker">FOLLOW THE STORY</span><h2>Every choice has a destination.</h2><p>Open a passage to write. Follow a reference to a shared branch or loop.</p></div>
    {outline.map((item) => renderItem(item))}
  </div>;
}
