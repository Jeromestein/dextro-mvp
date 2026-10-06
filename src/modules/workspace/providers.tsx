"use client";
import type { ReactNode } from "react";
import { LibraryProvider } from "./library-provider";
import { ConnectionProvider } from "@/modules/connections/provider";
import { GenerationDraftProvider } from "@/modules/generation/draft-provider";
import { GameplayAudioProvider } from "@/modules/media/audio/gameplay-provider";

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  return <LibraryProvider>
    <ConnectionProvider>
      <GenerationDraftProvider><GameplayAudioProvider>{children}</GameplayAudioProvider></GenerationDraftProvider>
    </ConnectionProvider>
  </LibraryProvider>;
}
