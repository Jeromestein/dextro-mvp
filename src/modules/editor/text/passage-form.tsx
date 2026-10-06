"use client";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, Flag, GitBranch, Maximize2, Plus, Trash2, X, AlertCircle } from "lucide-react";
import type { Story, Passage, Issue } from "@/modules/story/model";
import type { ChoiceRef, Point } from "../session/types";

type Props = {
  story: Story;
  passage: Passage;
  issues: Issue[];
  media: ReactNode;
  onChange: (changes: Partial<Passage>, group?: string) => unknown;
  onSetOpening: () => void;
  onLocate: () => void;
  onDelete: () => void;
  onAddChoice: () => void;
  onConnect: (ref: ChoiceRef, target: string) => void;
  onAddPassage: (ending?: boolean, position?: Point, from?: ChoiceRef) => void;
  onOpenTarget: (id: string) => void;
};
export default function PassageForm({ story, passage, issues, media, onChange, onSetOpening, onLocate,
  onDelete, onAddChoice, onConnect, onAddPassage, onOpenTarget }: Props) {
  const selected = passage.id;
  return <>
<div className="inspector-caption"><span>{selected === story.startId ? "OPENING" : passage.ending ? "ENDING" : "PASSAGE"}</span><div><button className="icon-button" title="Locate on graph" aria-label="Locate passage on graph" onClick={onLocate}><Maximize2 size={14} /></button><button className="icon-button" aria-label="Delete passage" title="Delete passage" disabled={story.passages.length <= 1} onClick={onDelete}><Trash2 size={14} /></button></div></div>
          <label className="editor-field">Passage title<input aria-label="Passage title" maxLength={200} value={passage.title} onChange={(e) => onChange({ title: e.target.value }, `${selected}:title`)} /></label>
          <div className="inspector-flags"><button aria-pressed={selected === story.startId} onClick={onSetOpening}><span className="opening-dot" /> Opening</button><button aria-pressed={passage.ending} disabled={!passage.ending && passage.choices.length > 0} title={passage.choices.length ? "Remove outgoing choices before marking an ending" : "Mark as an ending"} onClick={() => onChange({ ending: !passage.ending })}><Flag size={12} /> Ending</button></div>
          <label className="editor-field">Story text<textarea aria-label="Story text" maxLength={12000} placeholder="What does your reader discover?" value={passage.text} onChange={(e) => onChange({ text: e.target.value }, `${selected}:text`)} /></label>
          {media}
          {issues.length > 0 && <div className="inspector-issues" aria-label="Passage issues">{issues.map((issue, i) => <p className={issue.level} key={i}><AlertCircle size={13} />{issue.message}</p>)}</div>}
          <div className="inspector-choices-heading"><h2>{passage.ending ? "The ending" : "What happens next?"}</h2><span>{passage.ending ? <Flag size={14} /> : `${passage.choices.length}/8 choices`}</span></div>
          {passage.ending ? <div className="inspector-ending"><Flag size={23} /><p>Readers finish their journey here.<br />They can restart to explore another path.</p></div> : <>
            {passage.choices.map((c, i) => <div className="inspector-choice" key={c.id}>
              <div className="inspector-choice-top"><span>CHOICE {String(i + 1).padStart(2, "0")}</span><div><button className="icon-button" aria-label={`Move choice ${i + 1} up`} disabled={i === 0} onClick={() => { const choices = [...passage.choices]; [choices[i - 1], choices[i]] = [choices[i], choices[i - 1]]; onChange({ choices }); }}><ArrowUp size={13} /></button><button className="icon-button" aria-label={`Move choice ${i + 1} down`} disabled={i === passage.choices.length - 1} onClick={() => { const choices = [...passage.choices]; [choices[i + 1], choices[i]] = [choices[i], choices[i + 1]]; onChange({ choices }); }}><ArrowDown size={13} /></button><button className="icon-button" aria-label={`Remove choice ${i + 1}`} onClick={() => onChange({ choices: passage.choices.filter((item) => item.id !== c.id) })}><X size={14} /></button></div></div>
              <label className="editor-field"><span className="sr-only">Choice {i + 1} text</span><input aria-label={`Choice ${i + 1} text`} maxLength={300} placeholder="Write a choice…" value={c.text} onChange={(e) => onChange({ choices: passage.choices.map((item) => item.id === c.id ? { ...item, text: e.target.value } : item) }, `${selected}:${c.id}:text`)} /></label>
              <label className="editor-field destination-field"><span><GitBranch size={12} /> Leads to</span><select aria-label={`Choice ${i + 1} destination`} value={story.passages.some((p) => p.id === c.target) ? c.target : ""} onChange={(e) => {
                const from = { passageId: selected, choiceId: c.id };
                if (e.target.value === "__new" || e.target.value === "__end") onAddPassage(e.target.value === "__end", undefined, from);
                else onConnect(from, e.target.value);
              }}><option value="">Not connected</option>{story.passages.map((p) => <option value={p.id} key={p.id}>{p.title || "Untitled passage"}{p.ending ? " · Ending" : ""}</option>)}{story.passages.length < 150 && <><option value="__new">＋ New passage</option><option value="__end">＋ New ending</option></>}</select></label>
              {c.target && story.passages.some((p) => p.id === c.target) && <button className="choice-open-target" onClick={() => onOpenTarget(c.target)}>Open destination <ArrowUpRight size={12} /></button>}
            </div>)}
            <button className="inspector-add-choice" disabled={passage.choices.length >= 8} onClick={onAddChoice}><Plus size={15} /> Add a choice</button>
          </>}
  </>;
}
