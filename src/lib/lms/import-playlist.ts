import type { SupabaseClient } from "@supabase/supabase-js";
import {
  extractYoutubePlaylistId,
  fetchYoutubePlaylistMeta,
  fetchYoutubePlaylistVideos,
} from "@/lib/youtube";
import {
  buildPlaylistImportPlan,
  type PlaylistImportPlan,
  type PlaylistMetaInput,
  type PlaylistVideoInput,
} from "@/lib/lms/import-plan";

const LESSON_INSERT_CHUNK_SIZE = 500;

export type PlaylistImportDeps = {
  fetchMeta: (playlistId: string) => Promise<PlaylistMetaInput>;
  fetchVideos: (playlistId: string) => Promise<PlaylistVideoInput[]>;
};

const defaultDeps: PlaylistImportDeps = {
  fetchMeta: fetchYoutubePlaylistMeta,
  fetchVideos: fetchYoutubePlaylistVideos,
};

export class PlaylistImportError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "PlaylistImportError";
    this.status = status;
  }
}

export type ImportPlaylistResult = {
  courseId: string;
  alreadyImported: boolean;
  lessonCount: number | null;
};

async function findCourseForPlaylist(
  supabase: SupabaseClient,
  userId: string,
  ytPlaylistId: string,
) {
  const { data, error } = await supabase
    .from("courses")
    .select("id")
    .eq("user_id", userId)
    .eq("source_playlist_id", ytPlaylistId)
    .maybeSingle();

  if (error) {
    throw new PlaylistImportError(error.message, 500);
  }

  return data as { id: string } | null;
}

async function deleteCourse(
  supabase: SupabaseClient,
  courseId: string,
): Promise<void> {
  await supabase.from("courses").delete().eq("id", courseId);
}

async function insertLessons(
  supabase: SupabaseClient,
  moduleId: string,
  plan: PlaylistImportPlan,
): Promise<void> {
  for (let i = 0; i < plan.lessons.length; i += LESSON_INSERT_CHUNK_SIZE) {
    const rows = plan.lessons
      .slice(i, i + LESSON_INSERT_CHUNK_SIZE)
      .map((lesson) => ({ module_id: moduleId, ...lesson }));

    const { error } = await supabase.from("lessons").insert(rows);
    if (error) {
      throw new PlaylistImportError(error.message, 500);
    }
  }
}

/**
 * Fetches a YouTube playlist and persists it as one course, one module, and
 * its ordered lessons for the signed-in user.
 *
 * Idempotent: a second import of the same playlist returns the existing course.
 */
export async function importPlaylistForUser(
  supabase: SupabaseClient,
  userId: string,
  rawInput: string,
  deps: PlaylistImportDeps = defaultDeps,
): Promise<ImportPlaylistResult> {
  const playlistId = extractYoutubePlaylistId(rawInput);
  if (!playlistId) {
    throw new PlaylistImportError(
      "Could not read a YouTube playlist ID from that input.",
      400,
    );
  }

  let meta;
  let videos;
  try {
    meta = await deps.fetchMeta(playlistId);
    videos = await deps.fetchVideos(playlistId);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "YouTube request failed";
    throw new PlaylistImportError(message, 502);
  }

  const plan = buildPlaylistImportPlan(meta, videos);

  const existing = await findCourseForPlaylist(
    supabase,
    userId,
    meta.yt_playlist_id,
  );
  if (existing) {
    return {
      courseId: existing.id,
      alreadyImported: true,
      lessonCount: null,
    };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({ user_id: userId, ...plan.course })
    .select("id")
    .single();

  if (courseError || !course) {
    // A concurrent import can win the unique index race. Treat that as an
    // already-imported playlist instead of surfacing a 500.
    if (courseError?.code === "23505") {
      const raced = await findCourseForPlaylist(
        supabase,
        userId,
        meta.yt_playlist_id,
      );
      if (raced) {
        return {
          courseId: raced.id,
          alreadyImported: true,
          lessonCount: null,
        };
      }
    }

    throw new PlaylistImportError(
      courseError?.message ?? "Could not create course",
      500,
    );
  }

  const { data: courseModule, error: moduleError } = await supabase
    .from("modules")
    .insert({ course_id: course.id, ...plan.module })
    .select("id")
    .single();

  if (moduleError || !courseModule) {
    await deleteCourse(supabase, course.id);
    throw new PlaylistImportError(
      moduleError?.message ?? "Could not create module",
      500,
    );
  }

  try {
    await insertLessons(supabase, courseModule.id, plan);
  } catch (error) {
    await deleteCourse(supabase, course.id);
    throw error;
  }

  // Instrumentation must never make a successful import fail.
  await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: "playlist_imported",
    meta: {
      lesson_count: plan.lessons.length,
      course_id: course.id,
    },
  });

  return {
    courseId: course.id,
    alreadyImported: false,
    lessonCount: plan.lessons.length,
  };
}
