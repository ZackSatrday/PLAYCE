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
function createFakeSupabase({ courses = [], failOn = () => false } = {}) {
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
      update(payload) {
        this.op = "update";
        this.payload = payload;
        return this;
      },
      delete() {
        this.op = "delete";
        return this;
      },
      eq(col, value) {
        this.filters.push((row) => row[col] === value);
        return this;
      },
      gt(col, value) {
        this.filters.push((row) => row[col] > value);
        return this;
      },
      lte(col, value) {
        this.filters.push((row) => row[col] <= value);
        return this;
      },
      matches(row) {
        return this.filters.every((filter) => filter(row));
      },
      run() {
        if (failOn(table, this.op)) {
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

        if (this.op === "update") {
          const updated = [];
          for (const row of db[table]) {
            if (this.matches(row)) {
              Object.assign(row, this.payload);
              updated.push(row);
            }
          }
          return { data: updated, error: null };
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

          return { data: removed, error: null };
        }

        return { data: null, error: null };
      },
      maybeSingle() {
        const { data, error } = this.run();
        return Promise.resolve({ data: data?.[0] ?? null, error });
      },
      single() {
        return Promise.resolve(this.run());
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
  assert.equal(course.import_status, "ready");

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

  assert.deepEqual(
    supabase.calls.filter((call) => call.op === "update"),
    [{ table: "courses", op: "update", payload: { import_status: "ready" } }],
  );

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
        import_status: "ready",
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
    failOn: (table, op) => table === "lessons" && op === "insert",
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

test("a retry returns 409 while the lease is active and replaces the course after expiry", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
  let failing = true;
  const supabase = createFakeSupabase({
    failOn: (table, op) =>
      failing &&
      ((table === "lessons" && op === "insert") ||
        (table === "courses" && op === "delete")),
  });

  // First attempt: lessons fail and cleanup also fails, leaving a `pending`
  // course behind. It must not be reported as already imported.
  await assert.rejects(
    () => importPlaylistForUser(supabase, USER_A, PLAYLIST_URL, deps),
    (error) => error instanceof PlaylistImportError,
  );
  assert.equal(supabase.db.courses.length, 1);
  assert.equal(supabase.db.courses[0].import_status, "pending");

  failing = false;
  const original = supabase.db.courses[0];
  await assert.rejects(
    () => importPlaylistForUser(supabase, USER_A, PLAYLIST_URL, deps),
    (error) => error instanceof PlaylistImportError && error.status === 409,
  );
  assert.equal(supabase.db.courses[0], original);
  assert.equal(supabase.db.modules[0].course_id, original.id);

  t.mock.timers.setTime(Date.parse(original.import_lease_expires_at));
  const result = await importPlaylistForUser(
    supabase,
    USER_A,
    PLAYLIST_URL,
    deps,
  );

  assert.equal(result.alreadyImported, false);
  assert.notEqual(result.courseId, original.id);
  assert.equal(supabase.db.courses.length, 1);
  assert.equal(supabase.db.courses[0].import_status, "ready");
  assert.equal(supabase.db.modules.length, 1);
  assert.equal(supabase.db.lessons.length, 2);
  assert.equal(supabase.db.usage_events.length, 1);
});

test("an importer cannot finalize or clean up after losing its lease", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-01-01T00:00:00Z") });
  let replacementLease;
  const supabase = createFakeSupabase({
    failOn: (table, op) => {
      if (table === "lessons" && op === "insert") {
        const [course] = supabase.db.courses;
        const expiresAt = Date.parse(course.import_lease_expires_at);
        t.mock.timers.setTime(expiresAt);
        replacementLease = new Date(expiresAt + 60_000).toISOString();
        course.import_lease_expires_at = replacementLease;
      }
      return false;
    },
  });

  await assert.rejects(
    () => importPlaylistForUser(supabase, USER_A, PLAYLIST_URL, deps),
    (error) => error instanceof PlaylistImportError && error.status === 409,
  );
  assert.equal(supabase.db.courses.length, 1);
  assert.equal(supabase.db.courses[0].import_status, "pending");
  assert.equal(supabase.db.courses[0].import_lease_expires_at, replacementLease);
  assert.equal(supabase.db.usage_events.length, 0);
});

test("lookup and module insert errors are reported by the importer", async () => {
  for (const [table, op] of [["courses", "select"], ["modules", "insert"]]) {
    const supabase = createFakeSupabase({
      failOn: (candidateTable, candidateOp) => candidateTable === table && candidateOp === op,
    });
    await assert.rejects(
      () => importPlaylistForUser(supabase, USER_A, PLAYLIST_URL, deps),
      { message: `simulated ${table} ${op} failure`, status: 500 },
    );
    assert.equal(supabase.db.courses.length, 0);
  }
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
