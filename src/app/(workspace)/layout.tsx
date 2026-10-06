import { WorkspaceProviders } from "@/modules/workspace/providers";
import WorkspaceShell from "@/modules/workspace/shell";
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceProviders><WorkspaceShell>{children}</WorkspaceShell></WorkspaceProviders>;
}
