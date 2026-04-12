"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "rose" | "midnight";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "rose",
  setTheme: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("rose");

  useEffect(() => {
    // Read stored preference, fall back to OS preference
    const stored = localStorage.getItem("herphase-theme") as Theme | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Theme = stored ?? (prefersDark ? "midnight" : "rose");
    setThemeState(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("herphase-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "rose" ? "midnight" : "rose");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
