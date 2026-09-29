import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

const themeKey = "crewi:theme";
const darkQuery = "(prefers-color-scheme: dark)";

export function resolveTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersDark ? "dark" : "light";
}

function readStored(): string | null {
  try {
    return localStorage.getItem(themeKey);
  } catch {
    return null;
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => resolveTheme(readStored(), matchMedia(darkQuery).matches));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const media = matchMedia(darkQuery);
    const follow = () => setTheme(resolveTheme(readStored(), media.matches));
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(themeKey, next);
    } catch {
      // Without storage the choice only lasts for this page view.
    }
    setTheme(next);
  }

  return { theme, toggle };
}
