"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-[11px] font-bold tracking-wide text-brand-foreground">
            CG
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            Cadrogo
          </span>
        </a>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">
            Go/No-Go personnalisé · ESN IT
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
