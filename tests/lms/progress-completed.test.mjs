import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDb } from "../helpers/lms-db.mjs";

const USER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PLAYLIST = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

async function upsertProgress(db, { timestamp, completed }) {
  await db.query(
    `insert into public.progress
       (user_id, playlist_id, video_id, timestamp_sec, completed, updated_at)
     values ($1, $2, 'video-1', $3, $4, now())
     on conflict (user_id, playlist_id, video_id) do update set
       timestamp_sec = excluded.timestamp_sec,
       completed = excluded.completed,
       updated_at = excluded.updated_at`,
    [USER, PLAYLIST, timestamp, completed],
  );
}

test("upserts preserve stored completion and still update the timestamp", async () => {
  const ctx = await createTestDb();
  try {
    const { db } = ctx;
    await db.exec("alter table public.progress alter column completed drop not null");
    await upsertProgress(db, { timestamp: 10, completed: true });

    for (const [completed, timestamp] of [[false, 20], [null, 30], [true, 40]]) {
      await upsertProgress(db, { timestamp, completed });

      const row = (
        await db.query(
          "select timestamp_sec, completed from public.progress where video_id = 'video-1'",
        )
      ).rows[0];

      assert.deepEqual(row, { completed: true, timestamp_sec: timestamp });
    }
  } finally {
    await ctx.close();
  }
});

test("an incomplete row stays incomplete and can later be completed", async () => {
  const ctx = await createTestDb();
  try {
    const { db } = ctx;
    await upsertProgress(db, { timestamp: 5, completed: false });
    await upsertProgress(db, { timestamp: 15, completed: false });

    let row = (
      await db.query(
        "select timestamp_sec, completed from public.progress where video_id = 'video-1'",
      )
    ).rows[0];
    assert.equal(row.completed, false);
    assert.equal(row.timestamp_sec, 15);

    await upsertProgress(db, { timestamp: 30, completed: true });
    row = (
      await db.query(
        "select timestamp_sec, completed from public.progress where video_id = 'video-1'",
      )
    ).rows[0];
    assert.equal(row.completed, true);
    assert.equal(row.timestamp_sec, 30);
  } finally {
    await ctx.close();
  }
});
