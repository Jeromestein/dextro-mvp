"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createGameplayAudio } from "./gameplay";

const GameplayAudioContext = createContext<ReturnType<typeof createGameplayAudio> | null>(null);

export function GameplayAudioProvider({ children, playbackPath }: { children: ReactNode; playbackPath?: string }) {
  const [audio] = useState(createGameplayAudio);
  const pathname = usePathname();
  useEffect(() => {
    const { storyId } = audio.getSnapshot();
    if (storyId && pathname !== (playbackPath || `/play/${encodeURIComponent(storyId)}`)) audio.stop();
  }, [audio, pathname, playbackPath]);
  useEffect(() => () => audio.stop(), [audio]);
  return <GameplayAudioContext.Provider value={audio}>{children}</GameplayAudioContext.Provider>;
}

export function useGameplayAudio() {
  const audio = useContext(GameplayAudioContext);
  if (!audio) throw new Error("Gameplay audio provider is missing.");
  return audio;
}
