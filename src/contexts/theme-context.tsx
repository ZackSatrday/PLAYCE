"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { PLAYCE_THEME_STORAGE_KEY } from "@/lib/theme-storage";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: ThemePreference;
  resolved: "light" | "dark";
  setTheme: (t: ThemePreference) => void;
  /** Flip between light and dark (forces explicit light/dark, not system). */
  toggleColorMode: () => void;
};

const STORAGE_KEY = PLAYCE_THEME_STORAGE_KEY;

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(pref: ThemePreference): "light" | "dark" {
  if (pref === "dark") return "dark";
  if (pref === "light") return "light";
  return getSystemDark() ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const apply = useCallback((pref: ThemePreference) => {
    setResolved(resolve(pref) === "dark" ? "dark" : "light");
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    let stored: ThemePreference = "system";
    try {
      const raw = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
      if (raw === "light" || raw === "dark" || raw === "system") stored = raw;
    } catch {
      /* ignore */
    }
    setThemeState(stored);
    apply(stored);
  }, [mounted, apply]);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setResolved(getSystemDark() ? "dark" : "light");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, mounted]);

  const setTheme = useCallback((t: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    setThemeState(t);
    apply(t);
  }, [apply]);

  const toggleColorMode = useCallback(() => {
    const next: ThemePreference = resolved === "dark" ? "light" : "dark";
    setTheme(next);
  }, [resolved, setTheme]);

  const value = useMemo(
    () => ({
      theme,
      resolved,
      setTheme,
      toggleColorMode,
    }),
    [theme, resolved, setTheme, toggleColorMode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={cn(
          "flex min-h-dvh w-full flex-1 flex-col bg-[var(--background)] text-[var(--foreground)] antialiased",
          mounted && resolved === "dark" && "dark",
        )}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
