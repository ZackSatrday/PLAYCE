import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaylistView } from "@/app/(app)/playlist/[id]/playlist-view";
import { PlaylistSession } from "@/app/(app)/playlist/[id]/playlist-session";
import { createClient } from "@/lib/supabase/server";
import {
  fetchYoutubePlaylistVideos,
  type YoutubePlaylistVideo,
} from "@/lib/youtube";
import type { Video } from "@/types";

export default async function PlaylistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!playlist) {
    notFound();
  }

  let ytVideos: YoutubePlaylistVideo[] = [];
  try {
    ytVideos = await fetchYoutubePlaylistVideos(playlist.yt_playlist_id);
  } catch {
    ytVideos = [];
  }

  const videos: Video[] = ytVideos.map((v) => ({
    id: v.yt_video_id,
    yt_video_id: v.yt_video_id,
    title: v.title,
    thumbnail: v.thumbnail,
    duration: v.durationLabel,
    position: v.position,
  }));

  return (
    <>
      <PlaylistSession playlistId={id} />
      {!process.env.YOUTUBE_API_KEY && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-center text-xs text-amber-800 dark:text-amber-200">
          Set{" "}
          <code className="rounded bg-black/10 px-1 dark:bg-white/10">
            YOUTUBE_API_KEY
          </code>{" "}
          on the server to load playlist videos.{" "}
          <Link href="/dashboard" className="font-semibold underline">
            Dashboard
          </Link>
        </div>
      )}
      <PlaylistView playlist={playlist} videos={videos} />
    </>
  );
}
