import type { Playlist, PlaylistCardModel, Progress } from "@/types";

export function buildPlaylistCardModel(
  playlist: Playlist,
  rows: Pick<Progress, "video_id" | "completed">[],
): PlaylistCardModel {
  const total = Math.max(playlist.total_videos, 1);
  const watchedCount = rows.filter((r) => r.completed).length;
  const progressPercent = Math.min(
    100,
    Math.round((watchedCount / total) * 100),
  );
  const hasActivity = rows.some((r) => r.completed);
  const status: PlaylistCardModel["status"] = hasActivity
    ? "in_progress"
    : "not_started";

  return {
    id: playlist.id,
    title: playlist.title,
    source: playlist.creator || "YouTube",
    totalVideos: playlist.total_videos,
    watchedCount,
    progressPercent,
    status,
    thumbnail: playlist.thumbnail || null,
  };
}
