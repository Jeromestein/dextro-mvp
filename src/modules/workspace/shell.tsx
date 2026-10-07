"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, Library, Settings2, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { useLibrary } from "@/modules/workspace/library-provider";

export default function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { stories, storageError } = useLibrary();
  const builder = pathname.startsWith("/builder");
  return <div className="product-shell">
    <header className="product-nav">
      <Link href="/builder" className="product-brand" aria-label="Dextro game builder">dextro</Link>
      <nav aria-label="Main navigation">
        <Link href="/builder" className={builder ? "selected" : ""} aria-current={builder ? "page" : undefined}><Boxes size={17} /><span>Game Builder</span></Link>
        <Link href="/library" className={pathname === "/library" ? "selected" : ""} aria-current={pathname === "/library" ? "page" : undefined}><Library size={17} /><span>My Games</span><small>{stories.length}</small></Link>
      </nav>
      <Link href="/settings" aria-label="Settings" className={`settings-link ${pathname === "/settings" ? "selected" : ""}`} aria-current={pathname === "/settings" ? "page" : undefined}><Settings2 size={17} /><span>Settings</span></Link>
    </header>
    {storageError && (pathname === "/builder" || pathname === "/settings") && <div className="storage-warning" role="alert">{storageError} <Link href="/library">Open your games <ArrowUpRight size={14} /></Link></div>}
    {children}
  </div>;
}
