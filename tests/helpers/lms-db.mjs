import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";

const MIGRATIONS_DIR = new URL("../../supabase/migrations/", import.meta.url);

/**
 * Boots an in-memory Postgres with the small parts of Supabase that the LMS
 * migrations depend on: the `auth` schema, `auth.users`, and `auth.uid()`.
 *
 * Tests run as the `authenticated` / `anon` roles so RLS applies the same way
 * it does in Supabase (the migration owner bypasses RLS).
 */
export async function createTestDb() {
  const db = new PGlite();

  await db.exec(`
    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;

    do $$
    begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
    end
    $$;
  `);

  // The save-progress route still writes to the legacy `progress` table. It is
  // created here (not by an LMS migration) so the completion-preserving trigger
  // in 0004 can be exercised in tests.
  await db.exec(`
    create table if not exists public.progress (
      id            uuid primary key default gen_random_uuid(),
      user_id       uuid not null,
      playlist_id   uuid not null,
      video_id      text not null,
      timestamp_sec integer not null default 0,
      completed     boolean not null default false,
      updated_at    timestamptz not null default now(),
      unique (user_id, playlist_id, video_id)
    );
  `);

  const migrations = (await readdir(MIGRATIONS_DIR))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrations) {
    const sql = await readFile(new URL(file, MIGRATIONS_DIR), "utf8");
    await db.exec(sql);
  }

  return {
    db,

    async asUser(userId, fn) {
      await db.exec("set role authenticated");
      await db.query(
        "select set_config('request.jwt.claim.sub', $1, false)",
        [userId],
      );
      try {
        return await fn(db);
      } finally {
        await db.exec("reset role");
      }
    },

    async asAnon(fn) {
      await db.exec("set role anon");
      await db.query("select set_config('request.jwt.claim.sub', '', false)");
      try {
        return await fn(db);
      } finally {
        await db.exec("reset role");
      }
    },

    async close() {
      await db.close();
    },
  };
}
