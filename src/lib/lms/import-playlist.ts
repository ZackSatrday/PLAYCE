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

type PlaylistCourseRow = {
  id: string;
  import_status: "pending" | "ready";
};

async function findCourseForPlaylist(
  supabase: SupabaseClient,
  userId: string,
  ytPlaylistId: string,
) {
  const { data, error } = await supabase
    .from("courses")
    .select("id, import_status")
    .eq("user_id", userId)
    .eq("source_playlist_id", ytPlaylistId)
    .maybeSingle();

  if (error) {
    throw new PlaylistImportError(error.message, 500);
  }

  return data as PlaylistCourseRow | null;
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
 * Idempotent: a second import of the same playlist returns the existing course
 * once its hierarchy is complete. An interrupted import leaves a `pending`
 * course that the next attempt replaces.
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

  if (existing?.import_status === "ready") {
    return {
      courseId: existing.id,
      alreadyImported: true,
      lessonCount: null,
    };
  }

  if (existing) {
    // A previous attempt stopped before finishing. Remove it so the retry
    // starts from a clean hierarchy; the unique index would otherwise block a
    // second course for the same playlist.
    const { error: cleanupError } = await supabase
      .from("courses")
      .delete()
      .eq("id", existing.id);

    if (cleanupError) {
      throw new PlaylistImportError(
        "Could not clean up an incomplete import. Try again.",
        500,
      );
    }
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: userId,
      ...plan.course,
      import_status: "pending",
    })
    .select("id")
    .single();

  if (courseError || !course) {
    // A concurrent import can win the unique index race.
    if (courseError?.code === "23505") {
      const raced = await findCourseForPlaylist(
        supabase,
        userId,
        meta.yt_playlist_id,
      );

      if (raced?.import_status === "ready") {
        return {
          courseId: raced.id,
          alreadyImported: true,
          lessonCount: null,
        };
      }

      if (raced) {
        throw new PlaylistImportError(
          "An import for this playlist is already in progress. Try again shortly.",
          409,
        );
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

  // Only now is the hierarchy complete. If this update fails, the course stays
  // 'pending' and the next import repairs it instead of reporting it as done.
  const { data: finalized, error: finalizeError } = await supabase
    .from("courses")
    .update({ import_status: "ready" })
    .eq("id", course.id)
    .select("id")
    .maybeSingle();

  if (finalizeError || !finalized) {
    await deleteCourse(supabase, course.id);
    throw new PlaylistImportError(
      finalizeError?.message ?? "Could not finalize the course import.",
      500,
    );
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
