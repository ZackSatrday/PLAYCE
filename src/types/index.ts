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

export type CourseSourceType = "playlist" | "manual";

export type CourseImportStatus = "pending" | "ready";

export type Course = {
  id: string;
  user_id: string;
  title: string;
  source_type: CourseSourceType;
  source_playlist_id: string | null;
  import_status: CourseImportStatus;
  created_at: string;
};

export type CourseModule = {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
};

export type Lesson = {
  id: string;
  module_id: string;
  youtube_video_id: string;
  title: string;
  duration_seconds: number | null;
  order_index: number;
};

export type UsageEventType =
  | "playlist_imported"
  | "progress_write"
  | "resume_open"
  | "session_end"
  | "cache_hit"
  | "cache_miss"
  | "llm_call"
  | "lesson_completed";

export type UsageEvent = {
  id: string;
  user_id: string;
  event_type: UsageEventType;
  youtube_video_id: string | null;
  lesson_id: string | null;
  provider: string | null;
  status: string | null;
  latency_ms: number | null;
  meta: Record<string, unknown>;
  created_at: string;
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
