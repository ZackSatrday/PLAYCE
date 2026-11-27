/**
 * Pure mapping from a YouTube playlist response to the LMS row shapes.
 *
 * Keeping this separate from the network and database calls lets the ordering
 * rules be tested without a Supabase project or a YouTube API key.
 */

export type PlaylistMetaInput = {
  yt_playlist_id: string;
  title: string;
};

export type PlaylistVideoInput = {
  yt_video_id: string;
  title: string;
  durationSeconds?: number;
};

export type PlaylistImportLesson = {
  youtube_video_id: string;
  title: string;
  duration_seconds: number;
  order_index: number;
};

export type PlaylistImportPlan = {
  course: {
    title: string;
    source_type: "playlist";
    source_playlist_id: string;
  };
  module: {
    title: string;
    order_index: number;
  };
  lessons: PlaylistImportLesson[];
};

export function buildPlaylistImportPlan(
  meta: PlaylistMetaInput,
  videos: PlaylistVideoInput[],
): PlaylistImportPlan {
  return {
    course: {
      title: meta.title,
      source_type: "playlist",
      source_playlist_id: meta.yt_playlist_id,
    },
    module: {
      title: "Videos",
      order_index: 0,
    },
    lessons: videos.map((video, index) => ({
      youtube_video_id: video.yt_video_id,
      title: video.title,
      duration_seconds: video.durationSeconds ?? 0,
      order_index: index,
    })),
  };
}
