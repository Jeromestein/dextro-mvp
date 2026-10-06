"use client";
import { useCallback, useReducer, useRef } from "react";
import type { Story } from "@/modules/story/model";
import { createHistory, editorReducer, type HistoryAction } from "./history";

export function useEditorSession(initialStory: Story, persistStory: (story: Story) => boolean) {
  const [history, dispatch] = useReducer(editorReducer, initialStory, createHistory);
  const historyRef = useRef(history);
  const send = useCallback((action: HistoryAction) => {
    const next = editorReducer(historyRef.current, action);
    if (next === historyRef.current) return false;
    if (next.present !== historyRef.current.present && !persistStory(next.present)) return false;
    historyRef.current = next;
    dispatch(action);
    return true;
  }, [persistStory]);
  const commit = useCallback((transform: (story: Story) => Story, group?: string) => {
    return send({ type: "commit", story: transform(historyRef.current.present), group, time: Date.now() });
  }, [send]);
  return { history, historyRef, send, commit };
}
