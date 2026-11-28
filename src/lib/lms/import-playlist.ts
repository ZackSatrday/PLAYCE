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
const IMPORT_LEASE_MS = 5 * 60 * 1000;

function leaseUntil(now = Date.now()) {
  return new Date(now + IMPORT_LEASE_MS).toISOString();
}

function importInProgress() {
  return new PlaylistImportError(
    "An import for this playlist is already in progress. Try again shortly.",
    409,
  );
}

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

function deletePendingCourse(
  supabase: SupabaseClient,
  courseId: string,
  lease: string,
) {
  return supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("import_status", "pending")
    .eq("import_lease_expires_at", lease)
    .gt("import_lease_expires_at", new Date().toISOString());
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
 * course that a retry can replace once its lease expires.
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
    const now = Date.now();
    const recoveryLease = leaseUntil(now);
    // Taking over an expired row always moves its lease forward. The expiry
    // value therefore also identifies the owner of this specific course row.
    const { data: claimed, error: claimError } = await supabase
      .from("courses")
      .update({ import_lease_expires_at: recoveryLease })
      .eq("id", existing.id)
      .eq("import_status", "pending")
      .lte("import_lease_expires_at", new Date(now).toISOString())
      .select("id")
      .maybeSingle();

    if (claimError) {
      throw new PlaylistImportError(
        "Could not claim an incomplete import. Try again.",
        500,
      );
    }
    if (!claimed) {
      throw importInProgress();
    }

    const { data: deleted, error: cleanupError } = await deletePendingCourse(
      supabase,
      existing.id,
      recoveryLease,
    ).select("id").maybeSingle();

    if (cleanupError) {
      throw new PlaylistImportError(
        "Could not clean up an incomplete import. Try again.",
        500,
      );
    }
    if (!deleted) {
      throw importInProgress();
    }
  }

  const lease = leaseUntil();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .insert({
      user_id: userId,
      ...plan.course,
      import_status: "pending",
      import_lease_expires_at: lease,
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
        throw importInProgress();
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
    await deletePendingCourse(supabase, course.id, lease);
    throw new PlaylistImportError(
      moduleError?.message ?? "Could not create module",
      500,
    );
  }

  try {
    await insertLessons(supabase, courseModule.id, plan);
  } catch (error) {
    await deletePendingCourse(supabase, course.id, lease);
    throw error;
  }

  // Only the current lease holder can finalize the completed hierarchy.
  const { data: finalized, error: finalizeError } = await supabase
    .from("courses")
    .update({ import_status: "ready" })
    .eq("id", course.id)
    .eq("import_status", "pending")
    .eq("import_lease_expires_at", lease)
    .gt("import_lease_expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (finalizeError || !finalized) {
    await deletePendingCourse(supabase, course.id, lease);
    if (finalizeError) {
      throw new PlaylistImportError(finalizeError.message, 500);
    }
    throw importInProgress();
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
