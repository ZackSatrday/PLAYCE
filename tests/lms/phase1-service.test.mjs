import { test } from "node:test";
import assert from "node:assert/strict";
import {
  importPlaylistForUser,
  PlaylistImportError,
} from "@/lib/lms/import-playlist";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAYLIST_URL = "https://www.youtube.com/playlist?list=PL123";

const videos = [
  { yt_video_id: "v2", title: "Second", durationSeconds: 120 },
  { yt_video_id: "v1", title: "First", durationSeconds: 60 },
];

const deps = {
  fetchMeta: async () => ({ yt_playlist_id: "PL123", title: "Algebra" }),
  fetchVideos: async () => videos,
};

/**
 * Minimal stand-in for the Supabase client surface the importer uses. Records
 * every operation so tests can assert the hierarchy that was written.
 */
function createFakeSupabase({ courses = [], failOn = null } = {}) {
  const calls = [];
  const db = {
    courses: [...courses],
    modules: [],
    lessons: [],
    usage_events: [],
  };
  let seq = 0;
  const nextId = (table) => `${table}-${++seq}`;

  function from(table) {
    const builder = {
      table,
      op: "select",
      payload: null,
      filters: [],
      select() {
        return this;
      },
      insert(payload) {
        this.op = "insert";
        this.payload = payload;
        return this;
      },
      delete() {
        this.op = "delete";
        return this;
      },
      eq(col, value) {
        this.filters.push([col, value]);
        return this;
      },
      matches(row) {
        return this.filters.every(([col, value]) => row[col] === value);
      },
      run() {
        if (failOn && failOn.table === table && failOn.op === this.op) {
          return {
            data: null,
            error: { message: `simulated ${table} ${this.op} failure` },
          };
        }

        calls.push({ table, op: this.op, payload: this.payload });

        if (this.op === "insert") {
          const rows = Array.isArray(this.payload)
            ? this.payload
            : [this.payload];
          const inserted = rows.map((row) => ({ id: nextId(table), ...row }));
          db[table].push(...inserted);
          return {
            data: Array.isArray(this.payload) ? inserted : inserted[0],
            error: null,
          };
        }

        if (this.op === "select") {
          return { data: db[table].filter((row) => this.matches(row)), error: null };
        }

        if (this.op === "delete") {
          const removed = db[table].filter((row) => this.matches(row));
          db[table] = db[table].filter((row) => !this.matches(row));

          if (table === "courses") {
            const courseIds = new Set(removed.map((row) => row.id));
            const moduleIds = new Set(
              db.modules
                .filter((row) => courseIds.has(row.course_id))
                .map((row) => row.id),
            );
            db.modules = db.modules.filter((row) => !courseIds.has(row.course_id));
            db.lessons = db.lessons.filter((row) => !moduleIds.has(row.module_id));
          }

          return { data: null, error: null };
        }

        return { data: null, error: null };
      },
      maybeSingle() {
        const { data } = this.run();
        return Promise.resolve({ data: data?.[0] ?? null, error: null });
      },
      single() {
        const { data } = this.run();
        return Promise.resolve({ data, error: null });
      },
      then(onFulfilled, onRejected) {
        return Promise.resolve(this.run()).then(onFulfilled, onRejected);
      },
    };
    return builder;
  }

  return { from, calls, db };
}

test("import creates one course, one module, and ordered lessons", async () => {
  const supabase = createFakeSupabase();

  const result = await importPlaylistForUser(
    supabase,
    USER_A,
    PLAYLIST_URL,
    deps,
  );

  assert.deepEqual(result, {
    courseId: "courses-1",
    alreadyImported: false,
    lessonCount: 2,
  });

  assert.equal(supabase.db.courses.length, 1);
  const [course] = supabase.db.courses;
  assert.equal(course.user_id, USER_A);
  assert.equal(course.title, "Algebra");
  assert.equal(course.source_type, "playlist");
  assert.equal(course.source_playlist_id, "PL123");

  assert.equal(supabase.db.modules.length, 1);
  assert.equal(supabase.db.modules[0].course_id, course.id);
  assert.equal(supabase.db.modules[0].order_index, 0);

  assert.deepEqual(
    supabase.db.lessons.map((lesson) => [
      lesson.youtube_video_id,
      lesson.order_index,
    ]),
    [
      ["v2", 0],
      ["v1", 1],
    ],
  );
  assert.ok(supabase.db.lessons.every((lesson) => lesson.module_id === supabase.db.modules[0].id));

  assert.equal(supabase.db.usage_events.length, 1);
  assert.equal(supabase.db.usage_events[0].event_type, "playlist_imported");
  assert.equal(supabase.db.usage_events[0].meta.lesson_count, 2);
  assert.equal(supabase.db.usage_events[0].meta.course_id, course.id);
});

test("importing the same playlist twice returns the existing course", async () => {
  const supabase = createFakeSupabase({
    courses: [
      {
        id: "course-existing",
        user_id: USER_A,
        source_playlist_id: "PL123",
      },
    ],
  });

  const result = await importPlaylistForUser(
    supabase,
    USER_A,
    PLAYLIST_URL,
    deps,
  );

  assert.deepEqual(result, {
    courseId: "course-existing",
    alreadyImported: true,
    lessonCount: null,
  });
  assert.deepEqual(
    supabase.calls.filter((call) => call.op === "insert"),
    [],
  );
});

test("a failed lesson insert rolls the course back", async () => {
  const supabase = createFakeSupabase({
    failOn: { table: "lessons", op: "insert" },
  });

  await assert.rejects(
    () => importPlaylistForUser(supabase, USER_A, PLAYLIST_URL, deps),
    (error) =>
      error instanceof PlaylistImportError &&
      /simulated lessons insert failure/.test(error.message),
  );

  assert.equal(supabase.db.courses.length, 0);
  assert.equal(supabase.db.modules.length, 0);
  assert.equal(supabase.db.lessons.length, 0);
  assert.equal(supabase.db.usage_events.length, 0);
});

test("input without a playlist id is rejected before any fetch", async () => {
  const supabase = createFakeSupabase();
  let fetched = false;

  await assert.rejects(
    () =>
      importPlaylistForUser(supabase, USER_A, "not a playlist", {
        fetchMeta: async () => {
          fetched = true;
          return { yt_playlist_id: "PL123", title: "Algebra" };
        },
        fetchVideos: async () => {
          fetched = true;
          return [];
        },
      }),
    (error) => error instanceof PlaylistImportError && error.status === 400,
  );

  assert.equal(fetched, false);
  assert.deepEqual(supabase.calls, []);
});
