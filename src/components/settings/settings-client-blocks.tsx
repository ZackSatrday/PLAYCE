"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme, type ThemePreference } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";

const themes: {
  id: "light" | "dark" | "sync";
  label: string;
  preview: string;
  pref: ThemePreference;
}[] = [
  {
    id: "light",
    label: "UTILITY LIGHT",
    pref: "light",
    preview: "bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-600",
  },
  {
    id: "dark",
    label: "BRUTAL DARK",
    pref: "dark",
    preview: "bg-slate-900 border-slate-800 text-white",
  },
  {
    id: "sync",
    label: "SYSTEM SYNC",
    pref: "system",
    preview:
      "bg-gradient-to-br from-slate-200 to-slate-400 border-slate-400 dark:from-slate-600 dark:to-slate-800 dark:border-slate-500",
  },
];

function prefToTileId(pref: ThemePreference): "light" | "dark" | "sync" {
  if (pref === "system") return "sync";
  if (pref === "dark") return "dark";
  return "light";
}

export function SettingsAppearanceThemes() {
  const { theme, setTheme } = useTheme();
  const active = prefToTileId(theme);

  return (
    <div>
      <p className="mb-3 font-display text-[11px] font-bold tracking-[0.2em] text-[var(--muted)]">
        VISUAL THEME
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {themes.map((t) => {
          const selected = active === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTheme(t.pref)}
              className={cn(
                "flex flex-col rounded-xl border bg-[var(--surface)] p-3 text-left shadow-sm transition outline-none",
                selected
                  ? "border-2 border-[var(--accent)] ring-2 ring-[var(--accent-soft)]"
                  : "border border-[var(--border)] hover:border-slate-300 dark:hover:border-slate-600",
              )}
            >
              <div
                className={cn(
                  "mb-3 flex h-16 items-center justify-center rounded-lg border text-[10px] font-mono font-medium",
                  t.preview,
                )}
              >
                {t.id === "dark" ? (
                  <span className="text-slate-500 dark:text-slate-400">■■■</span>
                ) : t.id === "sync" ? (
                  <span className="text-slate-700 dark:text-slate-300">◧◨</span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500">□□□</span>
                )}
              </div>
              <span className="font-display text-xs font-bold tracking-wide text-[var(--foreground)]">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SettingsBackgroundSync() {
  const [on, setOn] = useState(true);

  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] pb-5">
      <div>
        <p className="font-display text-sm font-bold tracking-wide text-[var(--foreground)]">
          Background Sync
        </p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-[var(--muted)]">
          Periodically reconcile playlist metadata and watch progress while the app is idle.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => setOn(!on)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full border transition-colors",
          "border-[var(--border)]",
          on ? "bg-[var(--accent)]" : "bg-[var(--progress-track)]",
        )}
      >
        <span
          className={cn(
            "absolute top-1 size-6 rounded-full border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-transform",
            on ? "left-7" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

export function SettingsPurgeAllData() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onPurge = async () => {
    setMessage(null);
    const ok = window.confirm(
      "Delete all your playlists, watch progress, and reset local preferences? This cannot be undone.",
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch("/api/user/purge", { method: "DELETE" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage(body.error ?? "Something went wrong.");
        return;
      }
      setTheme("system");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setMessage("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <p className="font-display text-xs font-bold tracking-[0.12em] text-red-600 dark:text-red-400">
        DANGER ZONE
      </p>
      <p className="mt-2 max-w-lg text-xs leading-relaxed text-[var(--muted)]">
        Permanently remove all playlists and watch progress from your account, and reset
        theme preference stored on this device. This cannot be undone.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onPurge()}
        className="mt-4 w-full rounded-xl bg-red-600 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {busy ? "PURGING…" : "PURGE ALL DATA"}
      </button>
      {message ? (
        <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
