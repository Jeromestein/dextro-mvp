"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import styles from "./select-field.module.css";

type Option = { value: string; label: string; description?: string };
type Props = {
  label: string;
  value: string;
  options: readonly Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function SelectField({ label, value, options, onChange, disabled = false }: Props) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const search = useRef({ text: "", time: 0 });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 280 });
  const selected = options.findIndex(option => option.value === value);
  const expanded = open && !disabled && options.length > 0;

  const place = () => {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return;
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft ?? 0;
    const topEdge = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const below = topEdge + height - rect.bottom - 14;
    const above = rect.top - topEdge - 14;
    const up = below < 220 && above > below;
    const maxHeight = Math.max(44, Math.min(280, up ? above : below));
    const menuWidth = Math.min(rect.width, width - 16);
    setPosition({ left: Math.max(leftEdge + 8, Math.min(rect.left, leftEdge + width - menuWidth - 8)),
      top: up ? rect.top - 6 : rect.bottom + 6, width: menuWidth, maxHeight });
    return up;
  };
  const show = (index = Math.max(0, selected)) => {
    if (disabled || !options.length) return;
    setUp(Boolean(place())); setActive(index); setOpen(true);
    search.current = { text: "", time: 0 };
  };
  const choose = (index: number) => {
    if (options[index]) onChange(options[index].value);
    setOpen(false);
    trigger.current?.focus();
  };

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !list.current?.contains(event.target as Node)) setOpen(false);
    };
    const reposition = () => setUp(Boolean(place()));
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    window.visualViewport?.addEventListener("scroll", reposition);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
      window.visualViewport?.removeEventListener("scroll", reposition);
    };
  }, [expanded]);
  useEffect(() => {
    if (expanded) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const key = event.key;
    if (key === "Tab") { setOpen(false); return; }
    if (key === "Escape") { if (expanded) { event.preventDefault(); event.stopPropagation(); setOpen(false); } return; }
    if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " "].includes(key)) {
      event.preventDefault();
      if (!expanded) { show(key === "Home" ? 0 : key === "End" ? options.length - 1 : Math.max(0, selected)); return; }
      if (key === "Enter" || key === " ") choose(active);
      else setActive(key === "Home" ? 0 : key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, active + (key === "ArrowDown" ? 1 : -1))));
      return;
    }
    if (key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    const now = Date.now();
    const text = (now - search.current.time < 700 ? search.current.text : "") + key.toLocaleLowerCase();
    const prefix = [...text].every(character => character === text[0]) ? text[0] : text;
    const start = expanded ? active : selected;
    const order = options.map((_, index) => (start + index + 1 + options.length) % options.length);
    const match = order.find(index => options[index].label.toLocaleLowerCase().startsWith(prefix));
    if (!expanded) show(match ?? Math.max(0, selected));
    else if (match !== undefined) setActive(match);
    search.current = { text, time: now };
  };

  return <div className={styles.field}>
    <label className={styles.label} id={`${id}-label`} htmlFor={`${id}-trigger`}>{label}</label>
    <button ref={trigger} id={`${id}-trigger`} className={styles.trigger} type="button" role="combobox" aria-haspopup="listbox"
      aria-labelledby={`${id}-label`} aria-controls={expanded ? `${id}-list` : undefined}
      aria-expanded={expanded} aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
      disabled={disabled || !options.length} onClick={() => expanded ? setOpen(false) : show()}
      onKeyDown={onKeyDown} onBlur={() => setOpen(false)}>
      <span>{options[selected]?.label || "Choose an option"}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {expanded && createPortal(<div ref={list} id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`}
      className={styles.menu} data-direction={up ? "up" : "down"} style={position}
      onPointerDown={event => event.preventDefault()}>
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={option.value === value} data-active={index === active} className={styles.option}
        onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
        <span>{option.label}{option.description && <small>{option.description}</small>}</span>
        {option.value === value && <Check size={15} aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </div>;
}
