"use client";
import { useCallback, useReducer, useRef } from "react";
import type { Story } from "@/modules/story/model";
import { createHistory, editorReducer, type HistoryAction } from "./history";
import { rememberViewport, restoreViewport, withoutViewport } from "./viewport";

export function useEditorSession(initialStory: Story, persistStory: (story: Story) => boolean, scope: string) {
  const [history, dispatch] = useReducer(editorReducer, initialStory, story => createHistory(restoreViewport(story, scope)));
  const historyRef = useRef(history);
  const send = useCallback((action: HistoryAction) => {
    const next = editorReducer(historyRef.current, action);
    if (next === historyRef.current) return false;
    const viewOnly = action.type === "viewport" || action.type === "initialize-layout";
    if (!viewOnly && next.present !== historyRef.current.present && !persistStory(withoutViewport(next.present))) return false;
    if (action.type === "viewport") rememberViewport(scope, initialStory.id, next.present.editor!.viewport!);
    historyRef.current = next;
    dispatch(action);
    return true;
  }, [persistStory, scope, initialStory.id]);
  const commit = useCallback((transform: (story: Story) => Story, group?: string) => {
    return send({ type: "commit", story: transform(historyRef.current.present), group, time: Date.now() });
  }, [send]);
  return { history, historyRef, send, commit };
}
