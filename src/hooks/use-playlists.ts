"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildPlaylistCardModel } from "@/lib/playlist-stats";
import { createClient } from "@/lib/supabase/client";
import type { Playlist, PlaylistCardModel, Progress } from "@/types";

export type DashboardStats = {
  playlistCount: number;
  videosWatched: number;
  hoursLearned: number;
};

export function usePlaylists() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [progressRows, setProgressRows] = useState<Progress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPlaylists([]);
        setProgressRows([]);
        return;
      }

      const { data: pl, error: e1 } = await supabase
        .from("playlists")
        .select("*")
        .order("added_at", { ascending: false });

      if (e1) throw e1;

      const list = (pl ?? []) as Playlist[];
      const ids = list.map((p) => p.id);
      let prog: Progress[] = [];
      if (ids.length > 0) {
        const { data: pr, error: e2 } = await supabase
          .from("progress")
          .select("*")
          .in("playlist_id", ids);
        if (e2) throw e2;
        prog = (pr ?? []) as Progress[];
      }

      setPlaylists(list);
      setProgressRows(prog);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Failed to load playlists"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deletePlaylist = useCallback(async (playlistId: string) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("playlists")
      .delete()
      .eq("id", playlistId);
    return { error };
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const byPlaylistId = useMemo(() => {
    const m = new Map<string, Progress[]>();
    for (const r of progressRows) {
      const cur = m.get(r.playlist_id) ?? [];
      cur.push(r);
      m.set(r.playlist_id, cur);
    }
    return m;
  }, [progressRows]);

  const cards: PlaylistCardModel[] = useMemo(
    () =>
      playlists.map((p) =>
        buildPlaylistCardModel(p, byPlaylistId.get(p.id) ?? []),
      ),
    [playlists, byPlaylistId],
  );

  const stats: DashboardStats = useMemo(() => {
    const playlistCount = playlists.length;
    const videosWatched = progressRows.filter((r) => r.completed).length;
    const watchedSeconds = progressRows.reduce(
      (total, row) => total + Math.max(0, row.timestamp_sec ?? 0),
      0,
    );
    const hoursLearned = watchedSeconds / 3600;
    return { playlistCount, videosWatched, hoursLearned };
  }, [playlists, progressRows]);

  return { playlists, cards, stats, isLoading, error, refresh, deletePlaylist };
}
