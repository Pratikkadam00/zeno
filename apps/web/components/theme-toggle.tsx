"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const storageKey = "zeno.web.theme";

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
}

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Deliberate: `document` isn't available during SSR, so the resolved
    // theme can only be read client-side. Rendering `isDark=false` on both
    // the server and the initial client render (then correcting it here)
    // avoids a hydration mismatch — reading document.documentElement in a
    // useState lazy initializer instead would make the client's hydration
    // render disagree with the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
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
