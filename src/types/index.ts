export type Playlist = {
  id: string;
  user_id: string | null;
  yt_playlist_id: string;
  title: string;
  creator: string | null;
  thumbnail: string | null;
  total_videos: number;
  added_at: string;
};

export type Video = {
  id: string;
  yt_video_id: string;
  title: string;
  thumbnail: string;
  duration: string;
  position: number;
};

export type Progress = {
  id: string;
  user_id: string;
  playlist_id: string;
  video_id: string;
  timestamp_sec: number;
  completed: boolean;
  updated_at: string;
};

/** UI model for dashboard playlist cards */
export type PlaylistCardModel = {
  id: string;
  title: string;
  source: string;
  totalVideos: number;
  watchedCount: number;
  progressPercent: number;
  status: "in_progress" | "not_started";
  thumbnail: string | null;
};
