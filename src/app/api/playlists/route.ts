import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractYoutubePlaylistId,
  fetchYoutubePlaylistMeta,
} from "@/lib/youtube";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { urlOrId?: string };
  try {
    body = (await request.json()) as { urlOrId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.urlOrId?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Missing urlOrId" }, { status: 400 });
  }

  const playlistId = extractYoutubePlaylistId(raw);
  if (!playlistId) {
    return NextResponse.json(
      { error: "Could not read a YouTube playlist ID from that input." },
      { status: 400 },
    );
  }

  let meta;
  try {
    meta = await fetchYoutubePlaylistMeta(playlistId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "YouTube request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const { data: existing } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_id", user.id)
    .eq("yt_playlist_id", meta.yt_playlist_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ playlist: existing, alreadySaved: true });
  }

  const { data: inserted, error } = await supabase
    .from("playlists")
    .insert({
      user_id: user.id,
      yt_playlist_id: meta.yt_playlist_id,
      title: meta.title,
      creator: meta.creator,
      thumbnail: meta.thumbnail,
      total_videos: meta.total_videos,
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playlist: inserted, alreadySaved: false });
}
