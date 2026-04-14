"use client";

import { useCallback, useEffect, useState } from "react";
import { AddPlaylistModal } from "@/components/add-playlist-modal";
import { PlaylistCardLink } from "@/components/playlist-card";
import { usePlaylists } from "@/hooks/use-playlists";
import { displayNameFromUser } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function greetingLine() {
  const h = new Date().getHours();
  if (h < 12) return "GOOD MORNING";
  if (h < 18) return "GOOD AFTERNOON";
  return "GOOD EVENING";
}

function formatStat(n: number) {
  if (n < 10) return n.toFixed(1);
  return String(Math.round(n));
}

export function DashboardContent() {
  const { cards, stats, isLoading, error, refresh, deletePlaylist } = usePlaylists();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [greet, setGreet] = useState("WELCOME");
  const [addPlaylistOpen, setAddPlaylistOpen] = useState(false);
  const [urlOrId, setUrlOrId] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addMessage, setAddMessage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setGreet(greetingLine());
  }, []);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: { user: u } }) => setUser(u));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const openAddPlaylist = useCallback(() => {
    setAddPlaylistOpen(true);
  }, []);

  const closeAddPlaylist = useCallback(() => {
    setAddPlaylistOpen(false);
    setAddError(null);
    setAddMessage(null);
    if (!mounted) return;
    if (window.location.hash === "#add-playlist") {
      const path = `${window.location.pathname}${window.location.search}`;
      window.history.replaceState(null, "", path);
    }
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const syncFromHash = () => {
      if (window.location.hash === "#add-playlist") {
        setAddPlaylistOpen(true);
      }
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [mounted]);

  const onAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setAddError(null);
      setAddMessage(null);
      const trimmed = urlOrId.trim();
      if (!trimmed) return;
      setAdding(true);
      try {
        const res = await fetch("/api/playlists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urlOrId: trimmed }),
        });
        const body = (await res.json()) as { error?: string; alreadySaved?: boolean };
        if (!res.ok) {
          setAddError(body.error ?? "Could not add playlist");
          return;
        }
        if (body.alreadySaved) {
          setAddMessage("That playlist is already in your library.");
          await refresh();
          return;
        }
        setUrlOrId("");
        await refresh();
        closeAddPlaylist();
      } catch {
        setAddError("Network error");
      } finally {
        setAdding(false);
      }
    },
    [urlOrId, refresh, closeAddPlaylist],
  );

  const onDeletePlaylist = useCallback(
    async (playlistId: string) => {
      const { error: deleteError } = await deletePlaylist(playlistId);
      if (deleteError) {
        setAddError(deleteError.message || "Could not delete playlist");
        return;
      }
      await refresh();
    },
    [deletePlaylist, refresh],
  );

  const name = displayNameFromUser(user);

  return (
    <div className="mx-auto w-full max-w-[1200px] flex-1 px-6 pb-10 pt-8">
      <AddPlaylistModal open={addPlaylistOpen} onClose={closeAddPlaylist}>
        <p className="mb-4 text-sm text-[var(--muted)]">
          Paste a full YouTube playlist URL or its list ID. We will fetch the title
          and save it to your library.
        </p>
        <form onSubmit={onAdd} className="flex flex-col gap-4">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold tracking-wide text-[var(--muted)]">
              Playlist URL or ID
            </span>
            <input
              type="text"
              value={urlOrId}
              onChange={(e) => setUrlOrId(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=…"
              className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-2)] outline-none ring-[var(--accent)] focus:border-transparent focus:ring-2"
              disabled={adding}
            />
          </label>
          {addError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{addError}</p>
          ) : null}
          {addMessage ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">{addMessage}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeAddPlaylist}
              className="h-11 rounded-lg border border-[var(--border)] px-5 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--hover-bg)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={adding || !urlOrId.trim()}
              className="h-11 rounded-lg bg-[var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:opacity-50"
            >
              {adding ? "Adding…" : "Add playlist"}
            </button>
          </div>
        </form>
      </AddPlaylistModal>

      <header className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-[0.06em] text-[var(--foreground)] md:text-4xl">
          {greet}, {name.toUpperCase()}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Pick up where you left off.
        </p>
      </header>

      <section className="mb-12 grid gap-8 sm:grid-cols-3">
        <StatBlock
          label="PLAYLISTS SAVED"
          value={isLoading ? "…" : String(stats.playlistCount)}
        />
        <StatBlock
          label="VIDEOS WATCHED"
          value={isLoading ? "…" : String(stats.videosWatched)}
        />
        <StatBlock
          label="HOURS LEARNED"
          value={isLoading ? "…" : formatStat(stats.hoursLearned)}
        />
      </section>

      <section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-display text-sm font-bold tracking-[0.18em] text-[var(--foreground)]">
            YOUR PLAYLISTS
          </h2>
          <button
            type="button"
            onClick={openAddPlaylist}
            className="h-10 w-full shrink-0 rounded-lg bg-[var(--accent)] px-5 text-xs font-semibold tracking-wide text-white transition hover:bg-blue-600 sm:w-auto sm:px-6"
          >
            + Add playlist
          </button>
        </div>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error.message}</p>
        ) : null}
        {isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading playlists…</p>
        ) : cards.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
            <p className="text-sm text-[var(--muted)]">No playlists yet.</p>
            <button
              type="button"
              onClick={openAddPlaylist}
              className="mt-4 text-sm font-semibold text-[var(--accent)] hover:underline"
            >
              Add your first playlist
            </button>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((p) => (
              <li key={p.id}>
                <PlaylistCardLink playlist={p} onDelete={onDeletePlaylist} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[11px] font-semibold tracking-[0.16em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl font-bold tracking-tight text-[var(--foreground)] md:text-5xl">
        {value}
      </p>
    </div>
  );
}
