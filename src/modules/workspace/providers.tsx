"use client";
import type { ReactNode } from "react";
import { LibraryProvider } from "./library-provider";
import { ConnectionProvider } from "@/modules/connections/provider";
import { GenerationDraftProvider } from "@/modules/generation/draft-provider";

export function WorkspaceProviders({ children }: { children: ReactNode }) {
  return <LibraryProvider>
    <ConnectionProvider>
      <GenerationDraftProvider>{children}</GenerationDraftProvider>
    </ConnectionProvider>
  </LibraryProvider>;
}
