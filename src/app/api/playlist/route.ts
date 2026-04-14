import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  fetchYoutubePlaylistVideos,
  type YoutubePlaylistVideo,
} from "@/lib/youtube";
import type { Video } from "@/types";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { data: playlist } = await supabase
    .from("playlists")
    .select("id, yt_playlist_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!playlist) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let ytVideos: YoutubePlaylistVideo[] = [];
  try {
    ytVideos = await fetchYoutubePlaylistVideos(playlist.yt_playlist_id);
  } catch {
    ytVideos = [];
  }

  const items: Video[] = ytVideos.map((v) => ({
    id: v.yt_video_id,
    yt_video_id: v.yt_video_id,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.durationLabel,
    position: v.position,
  }));

  return NextResponse.json({ items });
}
