"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Player } from "@/components/player";
import { usePlayer } from "@/context/player-context";
import { VideoSidebar } from "@/components/video-sidebar";
import type { VideoProgressHint } from "@/components/video-sidebar";
import { createClient } from "@/lib/supabase/client";
import {
  getResumeVideo,
  getVideoProgress,
  saveProgress,
} from "@/hooks/use-progress";
import type { Playlist, Progress, Video } from "@/types";

type PlaylistViewProps = {
  playlist: Playlist;
  videos: Video[];
};

export function PlaylistView({ playlist, videos }: PlaylistViewProps) {
  const { setActiveVideoId } = usePlayer();
  const [items, setItems] = useState<Video[]>(videos);
  const [activeYtId, setActiveYtId] = useState(
    () => videos[0]?.yt_video_id ?? "",
  );
  const resumeTimestampRef = useRef<number>(0);
  const [watchedVideoIds, setWatchedVideoIds] = useState<string[]>([]);
  const [progressByVideoId, setProgressByVideoId] = useState<
    Record<string, VideoProgressHint | undefined>
  >({});

  const loadProgress = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("progress")
      .select("video_id, completed")
      .eq("playlist_id", playlist.id);

    const next: Record<string, VideoProgressHint> = {};
    for (const row of (data ?? []) as Pick<
      Progress,
      "video_id" | "completed"
    >[]) {
      next[row.video_id] = {
        completed: Boolean(row.completed),
      };
    }
    startTransition(() => {
      setProgressByVideoId(next);
    });
  }, [playlist.id]);

  useEffect(() => {
    let cancelled = false;
    const id = playlist.id;
    void (async () => {
      try {
        const res = await fetch(`/api/playlist?id=${encodeURIComponent(id)}`);
        const body = (await res.json()) as { items?: Video[] };
        if (cancelled) return;
        const fetchedItems = body.items ?? [];
        setItems(fetchedItems);

        const resume = await getResumeVideo(id);
        if (cancelled) return;
        if (resume) {
          const match = fetchedItems.find(
            (video) => video.yt_video_id === resume.video_id,
          );
          if (match) {
            setActiveYtId(match.yt_video_id);
            resumeTimestampRef.current = resume.timestamp_sec ?? 0;
            return;
          }
        }
        setActiveYtId(fetchedItems[0]?.yt_video_id ?? "");
        resumeTimestampRef.current = 0;
      } catch {
        if (cancelled) return;
        setItems(videos);
        setActiveYtId(videos[0]?.yt_video_id ?? "");
        resumeTimestampRef.current = 0;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playlist.id, videos]);

  useEffect(() => {
    void loadProgress();
  }, [loadProgress]);

  useEffect(() => {
    setActiveVideoId(activeYtId.length > 0 ? activeYtId : null);
  }, [activeYtId, setActiveVideoId]);

  useEffect(() => {
    if (
      activeYtId &&
      !items.some((v) => v.yt_video_id === activeYtId) &&
      items[0]
    ) {
      setActiveYtId(items[0].yt_video_id);
    }
  }, [items, activeYtId]);

  const handleVideoSelect = useCallback(
    async (ytVideoId: string) => {
      const progress = await getVideoProgress(playlist.id, ytVideoId);
      if (
        progress &&
        progress.completed === false &&
        progress.timestamp_sec > 0
      ) {
        resumeTimestampRef.current = progress.timestamp_sec;
      } else {
        resumeTimestampRef.current = 0;
      }

      if (!progress) {
        void saveProgress(playlist.id, ytVideoId, 0);
      }

      setActiveYtId(ytVideoId);
    },
    [playlist.id],
  );

  const handleVideoWatched = useCallback((videoId: string) => {
    setWatchedVideoIds((prev) =>
      prev.includes(videoId) ? prev : [...prev, videoId],
    );
    void loadProgress();
  }, [loadProgress]);

  const mergedProgressByVideoId = useMemo(() => {
    const merged: Record<string, VideoProgressHint | undefined> = {
      ...progressByVideoId,
    };
    for (const videoId of watchedVideoIds) {
      merged[videoId] = { completed: true };
    }
    return merged;
  }, [progressByVideoId, watchedVideoIds]);

  const active = items.find((v) => v.yt_video_id === activeYtId);

  if (items.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-12 text-center">
        <p className="text-[var(--foreground)]">This playlist has no videos.</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-semibold text-[var(--accent)] hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!activeYtId) {
    return (
      <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 py-8">
        <p className="text-sm text-[var(--muted)]">Loading playlist…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-6 px-6 py-8 lg:flex-row">
      <div className="min-w-0 flex-1 space-y-4">
        <header>
          <h1 className="font-display text-xl font-bold tracking-wide text-[var(--foreground)]">
            {playlist.title}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {playlist.creator ?? "YouTube"} · {playlist.total_videos} videos
          </p>
        </header>
        <Player
          playlistDbId={playlist.id}
          ytVideoId={activeYtId}
          title={active?.title ?? ""}
          onVideoCompleted={loadProgress}
          resumeTimestampRef={resumeTimestampRef}
          onVideoWatched={handleVideoWatched}
        />
      </div>
      <aside className="w-full shrink-0 lg:max-w-sm">
        <VideoSidebar
          playlistLabel={playlist.title}
          videos={items}
          activeYtId={activeYtId}
          onSelect={handleVideoSelect}
          progressByVideoId={mergedProgressByVideoId}
        />
      </aside>
    </div>
  );
}
