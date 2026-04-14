"use client";

import { createClient } from "@/lib/supabase/client";

export async function getVideoProgress(playlistId: string, videoId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("progress")
    .select("timestamp_sec, completed")
    .eq("playlist_id", playlistId)
    .eq("video_id", videoId)
    .maybeSingle();

  if (!data) return null;
  return {
    timestamp_sec: data.timestamp_sec ?? 0,
    completed: Boolean(data.completed),
  };
}

export async function getResumeVideo(playlistId: string) {
  const supabase = createClient();
  const { data } = await supabase
    .from("progress")
    .select("video_id, timestamp_sec")
    .eq("playlist_id", playlistId)
    .eq("completed", false)
    .order("updated_at", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (!row) return null;
  return {
    video_id: row.video_id,
    timestamp_sec: row.timestamp_sec ?? 0,
  };
}

export async function saveProgress(
  playlistId: string,
  videoId: string,
  timestampSec: number,
  completed = false,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("progress").upsert(
    {
      user_id: user.id,
      playlist_id: playlistId,
      video_id: videoId,
      timestamp_sec: Math.max(0, Math.floor(timestampSec)),
      completed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,playlist_id,video_id" },
  );
}
