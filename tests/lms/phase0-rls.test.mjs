import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "../helpers/lms-db.mjs";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

let ctx;
let ids;

before(async () => {
  ctx = await createTestDb();
  const { db } = ctx;

  await db.query("insert into auth.users (id) values ($1), ($2)", [
    USER_A,
    USER_B,
  ]);

  const courseA = (
    await db.query(
      "insert into public.courses (user_id, title) values ($1, 'A course') returning id",
      [USER_A],
    )
  ).rows[0].id;
  const courseB = (
    await db.query(
      "insert into public.courses (user_id, title) values ($1, 'B course') returning id",
      [USER_B],
    )
  ).rows[0].id;

  const moduleA = (
    await db.query(
      "insert into public.modules (course_id, title, order_index) values ($1, 'A module', 0) returning id",
      [courseA],
    )
  ).rows[0].id;
  const moduleB = (
    await db.query(
      "insert into public.modules (course_id, title, order_index) values ($1, 'B module', 0) returning id",
      [courseB],
    )
  ).rows[0].id;

  const lessonA = (
    await db.query(
      "insert into public.lessons (module_id, youtube_video_id, title, order_index) values ($1, 'vid-a', 'A lesson', 0) returning id",
      [moduleA],
    )
  ).rows[0].id;
  const lessonB = (
    await db.query(
      "insert into public.lessons (module_id, youtube_video_id, title, order_index) values ($1, 'vid-b', 'B lesson', 0) returning id",
      [moduleB],
    )
  ).rows[0].id;

  await db.query(
    "insert into public.usage_events (user_id, event_type, meta) values ($1, 'seed_a', '{}'::jsonb), ($2, 'seed_b', '{}'::jsonb)",
    [USER_A, USER_B],
  );

  ids = { courseA, courseB, moduleA, moduleB, lessonA, lessonB };
});

after(async () => {
  if (ctx) await ctx.close();
});

test("courses: a user sees only their own courses", async () => {
  const result = await ctx.asUser(USER_A, (db) =>
    db.query("select id, user_id, title from public.courses order by title"),
  );

  assert.deepEqual(
    result.rows.map((row) => row.title),
    ["A course"],
  );
});

test("courses: a user cannot insert a course owned by another user", async () => {
  await assert.rejects(
    () =>
      ctx.asUser(USER_A, (db) =>
        db.query(
          "insert into public.courses (user_id, title) values ($1, 'smuggled')",
          [USER_B],
        ),
      ),
    /row-level security/i,
  );
});

test("courses: a user cannot update or delete another user's course", async () => {
  const updated = await ctx.asUser(USER_A, (db) =>
    db.query("update public.courses set title = 'hijacked' where id = $1 returning id", [
      ids.courseB,
    ]),
  );
  assert.equal(updated.rows.length, 0);

  const deleted = await ctx.asUser(USER_A, (db) =>
    db.query("delete from public.courses where id = $1 returning id", [
      ids.courseB,
    ]),
  );
  assert.equal(deleted.rows.length, 0);
});

test("modules: access is scoped through the parent course", async () => {
  const visible = await ctx.asUser(USER_A, (db) =>
    db.query("select id, title from public.modules order by title"),
  );
  assert.deepEqual(
    visible.rows.map((row) => row.title),
    ["A module"],
  );

  await assert.rejects(
    () =>
      ctx.asUser(USER_A, (db) =>
        db.query(
          "insert into public.modules (course_id, title) values ($1, 'smuggled')",
          [ids.courseB],
        ),
      ),
    /row-level security/i,
  );

  const updated = await ctx.asUser(USER_A, (db) =>
    db.query("update public.modules set title = 'hijacked' where id = $1 returning id", [
      ids.moduleB,
    ]),
  );
  assert.equal(updated.rows.length, 0);

  const deleted = await ctx.asUser(USER_A, (db) =>
    db.query("delete from public.modules where id = $1 returning id", [
      ids.moduleB,
    ]),
  );
  assert.equal(deleted.rows.length, 0);
});

test("lessons: access is scoped through the parent module's course", async () => {
  const visible = await ctx.asUser(USER_A, (db) =>
    db.query("select id, title from public.lessons order by title"),
  );
  assert.deepEqual(
    visible.rows.map((row) => row.title),
    ["A lesson"],
  );

  await assert.rejects(
    () =>
      ctx.asUser(USER_A, (db) =>
        db.query(
          "insert into public.lessons (module_id, youtube_video_id, title) values ($1, 'smuggled', 'smuggled')",
          [ids.moduleB],
        ),
      ),
    /row-level security/i,
  );

  const updated = await ctx.asUser(USER_A, (db) =>
    db.query("update public.lessons set title = 'hijacked' where id = $1 returning id", [
      ids.lessonB,
    ]),
  );
  assert.equal(updated.rows.length, 0);

  const deleted = await ctx.asUser(USER_A, (db) =>
    db.query("delete from public.lessons where id = $1 returning id", [
      ids.lessonB,
    ]),
  );
  assert.equal(deleted.rows.length, 0);
});

test("usage_events: a user can insert and read only their own events", async () => {
  const inserted = await ctx.asUser(USER_A, (db) =>
    db.query(
      "insert into public.usage_events (user_id, event_type, meta) values ($1, 'playlist_imported', '{\"lesson_count\":3}'::jsonb) returning id",
      [USER_A],
    ),
  );
  assert.equal(inserted.rows.length, 1);

  await assert.rejects(
    () =>
      ctx.asUser(USER_A, (db) =>
        db.query(
          "insert into public.usage_events (user_id, event_type) values ($1, 'smuggled')",
          [USER_B],
        ),
      ),
    /row-level security/i,
  );

  const visible = await ctx.asUser(USER_A, (db) =>
    db.query("select user_id, event_type from public.usage_events order by event_type"),
  );
  assert.ok(visible.rows.length > 0);
  assert.ok(visible.rows.every((row) => row.user_id === USER_A));

  const updated = await ctx.asUser(USER_A, (db) =>
    db.query("update public.usage_events set status = 'tampered' returning id"),
  );
  assert.equal(updated.rows.length, 0);

  const deleted = await ctx.asUser(USER_A, (db) =>
    db.query("delete from public.usage_events returning id"),
  );
  assert.equal(deleted.rows.length, 0);
});

test("anonymous users cannot read or write LMS data", async () => {
  const courses = await ctx.asAnon((db) =>
    db.query("select id from public.courses"),
  );
  assert.equal(courses.rows.length, 0);

  await assert.rejects(
    () =>
      ctx.asAnon((db) =>
        db.query(
          "insert into public.courses (user_id, title) values ($1, 'anon')",
          [USER_A],
        ),
      ),
    /row-level security/i,
  );
});

test("deleting a course cascades to its modules and lessons", async () => {
  const { db } = ctx;

  const course = (
    await db.query(
      "insert into public.courses (user_id, title) values ($1, 'cascade') returning id",
      [USER_A],
    )
  ).rows[0].id;
  const mod = (
    await db.query(
      "insert into public.modules (course_id, title) values ($1, 'cascade module') returning id",
      [course],
    )
  ).rows[0].id;
  const lesson = (
    await db.query(
      "insert into public.lessons (module_id, youtube_video_id, title) values ($1, 'cascade-vid', 'cascade lesson') returning id",
      [mod],
    )
  ).rows[0].id;

  await db.query("delete from public.courses where id = $1", [course]);

  const modules = await db.query(
    "select id from public.modules where id = $1",
    [mod],
  );
  const lessons = await db.query(
    "select id from public.lessons where id = $1",
    [lesson],
  );
  assert.equal(modules.rows.length, 0);
  assert.equal(lessons.rows.length, 0);
});
