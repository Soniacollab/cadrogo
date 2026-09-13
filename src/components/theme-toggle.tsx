"use client";

import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center rounded-lg border border-line bg-surface p-1 shadow-panel"
      role="group"
      aria-label="Choisir le thème d'affichage"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
          theme === "light"
            ? "bg-brand text-brand-foreground"
            : "text-muted hover:text-foreground"
        )}
        aria-pressed={theme === "light"}
      >
        Clair
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "rounded-md px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors",
          theme === "dark"
            ? "bg-brand text-brand-foreground"
            : "text-muted hover:text-foreground"
        )}
        aria-pressed={theme === "dark"}
      >
        Sombre
      </button>
    </div>
  );
}
