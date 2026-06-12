"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "subradar.web.theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored ? stored === "dark" : prefersDark;
    setIsDark(next);
    applyTheme(next);
  }, []);

  function updateTheme(next: boolean) {
    setIsDark(next);
    applyTheme(next);
    window.localStorage.setItem(storageKey, next ? "dark" : "light");
  }

  const Icon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      aria-label="Toggle dark theme"
      aria-pressed={isDark}
      onClick={() => updateTheme(!isDark)}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon data-icon="inline-start" aria-hidden="true" />
      {isDark ? "Dark" : "Light"}
    </button>
  );
}
