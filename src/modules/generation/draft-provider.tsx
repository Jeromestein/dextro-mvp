"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Story } from "@/modules/story/model";

function useDraftState() {
  const [brief, setBrief] = useState({ premise: "", tone: "Mysterious", language: "auto" });
  const [draft, setDraft] = useState<{ story: Story; repaired: boolean } | null>(null);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (draft) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [draft]);
  return { brief, setBrief, draft, setDraft };
}
const DraftContext = createContext<ReturnType<typeof useDraftState> | null>(null);
export function GenerationDraftProvider({ children }: { children: ReactNode }) {
  return <DraftContext.Provider value={useDraftState()}>{children}</DraftContext.Provider>;
}
export function useGenerationDraft() {
  const value = useContext(DraftContext);
  if (!value) throw new Error("Generation draft provider is missing.");
  return value;
}
