import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "../helpers/lms-db.mjs";
import { parseIso8601DurationSeconds } from "../../src/lib/youtube.ts";
import { buildPlaylistImportPlan } from "../../src/lib/lms/import-plan.ts";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("parseIso8601DurationSeconds converts YouTube durations to seconds", () => {
  assert.equal(parseIso8601DurationSeconds("PT1H2M3S"), 3723);
  assert.equal(parseIso8601DurationSeconds("PT5M"), 300);
  assert.equal(parseIso8601DurationSeconds("PT45S"), 45);
  assert.equal(parseIso8601DurationSeconds("PT0S"), 0);
  assert.equal(parseIso8601DurationSeconds("not-a-duration"), 0);
});

test("buildPlaylistImportPlan preserves playlist order", () => {
  const plan = buildPlaylistImportPlan(
    { yt_playlist_id: "PL123", title: "Algebra" },
    [
      { yt_video_id: "v2", title: "Second", durationSeconds: 120 },
      { yt_video_id: "v1", title: "First", durationSeconds: 60 },
    ],
  );

  assert.deepEqual(plan.course, {
    title: "Algebra",
    source_type: "playlist",
    source_playlist_id: "PL123",
  });
  assert.deepEqual(plan.module, { title: "Videos", order_index: 0 });
  assert.deepEqual(plan.lessons, [
    {
      youtube_video_id: "v2",
      title: "Second",
      duration_seconds: 120,
      order_index: 0,
    },
    {
      youtube_video_id: "v1",
      title: "First",
      duration_seconds: 60,
      order_index: 1,
    },
  ]);
});

test("buildPlaylistImportPlan handles an empty playlist", () => {
  const plan = buildPlaylistImportPlan(
    { yt_playlist_id: "PL-empty", title: "Empty" },
    [],
  );

  assert.equal(plan.lessons.length, 0);
  assert.equal(plan.course.source_playlist_id, "PL-empty");
});

test("a playlist can only be imported once per user", async () => {
  const ctx = await createTestDb();
  try {
    const { db } = ctx;
    await db.query("insert into auth.users (id) values ($1), ($2)", [
      USER_A,
      USER_B,
    ]);

    await db.query(
      "insert into public.courses (user_id, title, source_type, source_playlist_id) values ($1, 'A playlist', 'playlist', 'PL-1')",
      [USER_A],
    );

    await assert.rejects(
      () =>
        db.query(
          "insert into public.courses (user_id, title, source_type, source_playlist_id) values ($1, 'A duplicate', 'playlist', 'PL-1')",
          [USER_A],
        ),
      /duplicate key|unique/i,
    );

    await db.query(
      "insert into public.courses (user_id, title, source_type, source_playlist_id) values ($1, 'B playlist', 'playlist', 'PL-1')",
      [USER_B],
    );

    await db.query(
      "insert into public.courses (user_id, title, source_type) values ($1, 'Manual one', 'manual'), ($1, 'Manual two', 'manual')",
      [USER_A],
    );

    const count = await db.query(
      "select count(*)::int as count from public.courses",
    );
    assert.equal(count.rows[0].count, 4);
  } finally {
    await ctx.close();
  }
});
