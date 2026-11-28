# Playce LMS — Implementation Log

This file is the running record of the LMS build described in
`plan.md` and `playce-lms-system-design.md`.

Each phase records:

- what was implemented and where
- the verification command and result
- errors, bugs, and fixes
- decisions made where the plan/design was silent or ambiguous
- what the next phase depends on

## Phase index

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Schema migration + RLS (`courses`, `modules`, `lessons`) + `usage_events` | Complete |
| 1 | Playlist → Course import | Complete |
| 2 | Precise resume (`lesson_progress` checkpoints) | Not started |
| 3 | `video_assets` cache + on-demand summary + `generation_jobs` lock | Not started |
| 4 | Timestamped notes | Not started |
| 5 | Lazy quiz + attempts | Not started |
| 6 | Dashboard (completion %, streaks, time spent) | Not started |
| 7 | Certificates | Not started |
| 8 | Landing page + deploy + README | Not started |

---

## Phase 0 — Schema + RLS + instrumentation

**Status:** complete

### Scope from the plan

- Schema migration for `courses`, `modules`, `lessons`
- Row Level Security so a user can only read/write their own rows
- `usage_events` table for instrumentation
- Done when: a user can only read their own rows, tested with two accounts

### Implementation

| File | Change |
| --- | --- |
| `supabase/migrations/0001_lms_core.sql` | Creates `courses`, `modules`, `lessons`, `usage_events`; adds indexes, RLS policies, and grants. Re-runnable. |
| `tests/helpers/lms-db.mjs` | Boots an in-memory Postgres (PGlite), recreates `auth.users` + `auth.uid()`, creates `anon` / `authenticated` roles, applies the migration. |
| `tests/lms/phase0-rls.test.mjs` | Eight RLS/cascade tests run as two different authenticated users and as `anon`. |
| `src/types/index.ts` | Adds `Course`, `CourseModule`, `Lesson`, `UsageEvent`, and event-type types. |
| `supabase/README.md` | How to apply the migration and run the local RLS tests. |
| `package.json` | Adds `@electric-sql/pglite` (dev) and the `npm test` script. |

**Schema**

- `courses`: `id`, `user_id`, `title`, `source_type` (`playlist` / `manual`), `source_playlist_id`, `created_at`
- `modules`: `id`, `course_id`, `title`, `order_index`
- `lessons`: `id`, `module_id`, `youtube_video_id`, `title`, `duration_seconds`, `order_index`
- `usage_events`: `id`, `user_id`, `event_type`, `youtube_video_id`, `lesson_id`, `provider`, `status`, `latency_ms`, `meta`, `created_at`

**RLS matrix**

| Table | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| `courses` | own rows | own `user_id` only | own rows, `user_id` cannot change to someone else | own rows |
| `modules` | rows whose parent course is owned | parent course must be owned | same | same |
| `lessons` | rows whose module → course is owned | parent module's course must be owned | same | same |
| `usage_events` | own rows | own `user_id` only | denied (no policy) | denied (no policy) |
| `anon` | denied | denied | denied | denied |

Deletes cascade: `auth.users → courses → modules → lessons`; deleting a
lesson sets `usage_events.lesson_id` to `null` so instrumentation survives.

### Verification

```text
npm test
✔ courses: a user sees only their own courses
✔ courses: a user cannot insert a course owned by another user
✔ courses: a user cannot update or delete another user's course
✔ modules: access is scoped through the parent course
✔ lessons: access is scoped through the parent module's course
✔ usage_events: a user can insert and read only their own events
✔ anonymous users cannot read or write LMS data
✔ deleting a course cascades to its modules and lessons
tests 8 | pass 8 | fail 0
```

```text
npm run build
✓ Compiled successfully
✓ Finished TypeScript
✓ Generating static pages (14/14)
```

The RLS tests use PGlite with two simulated Supabase users. The live project was
migrated on 2026-11-27 by running `0001_lms_core.sql` and
`0002_course_playlist_unique.sql` in the Supabase SQL editor; a check against
`information_schema.tables` returned all four tables (`courses`, `modules`,
`lessons`, `usage_events`).

### Errors, bugs, and fixes

1. **`node --test tests` failed with `MODULE_NOT_FOUND`.** Node 24 treats the
   directory argument as a module. Fixed by using an explicit glob:
   `node --test "tests/**/*.test.mjs"`.
2. **First test run failed with `ENOENT` for the migration.** Expected RED
   state: the test was written before the migration existed. After adding
   `0001_lms_core.sql`, all 8 tests passed.
3. **Lint error in the new test:** the local variable `module` triggered
   `@next/next/no-assign-module-variable`. Renamed it to `mod`.
4. **`npm run build` failed on a stale generated file:**
   `.next/dev/types/validator.ts` still referenced the deleted
   `src/app/api/summary/route.js`. Removed `.next` and rebuilt successfully.
   This was pre-existing cache drift, not a Phase 0 change.
5. **`npm install -D @electric-sql/pglite` printed “removed 42 packages” and
   reported 19 vulnerabilities.** `package-lock.json` changed by only 8 lines
   and the production build passes, so the removals were pruned extraneous
   packages. `npm audit fix` was not run because it can change dependency
   versions outside this phase.
6. **`npm run lint` still fails with 9 pre-existing errors and 4 warnings** in
   `playlist-view.tsx`, `mobile-nav.tsx`, `player.tsx`, `youtube-embed.tsx`,
   `player-context.tsx`, and `theme-context.tsx`. None are in the files added
   or changed by Phase 0. They were left untouched to keep the phase scoped.

### Decisions

- **Phase 0 creates only the four tables the plan names.** `profiles`,
  `lesson_progress`, `notes`, `video_assets`, `quizzes`, and `certificates`
  arrive in their own phases.
- **`modules` and `lessons` have no `created_at`.** The system design does not
  list it for those tables; ordering is handled by `order_index`.
- **`order_index` is not unique.** Reordering would otherwise require
  temporary values; ordering is enforced by application logic for now.
- **`usage_events` is append-only for clients.** There is no update/delete
  policy; server-side maintenance can use the service role.
- **RLS policies target `authenticated` only.** `anon` has table grants to
  mirror Supabase defaults, but no policy, so every row is denied.
- **The local test harness is PGlite, not a live Supabase project.** It runs
  real Postgres RLS with two simulated users, which is enough to prove the
  policy logic without a service-role key.

### Next phase

Phase 1 imports a YouTube playlist into one `courses` row plus ordered
`modules` and `lessons`. It depends on:

- the exact table/column names above
- `courses.source_type = 'playlist'` and `source_playlist_id`
- RLS inserts being done as the signed-in user
- the existing `src/lib/youtube.ts` playlist fetcher for video metadata

The next step is to add the import API route and wire the dashboard's
“Add playlist” flow to create the LMS hierarchy.

---

## Phase 1 — Playlist → Course import

**Status:** complete

### Scope from the plan

- Importing a YouTube playlist creates the full hierarchy with order preserved
- Done when: a playlist import produces one `courses` row, one `modules` row,
  and ordered `lessons` rows

### Implementation

| File | Change |
| --- | --- |
| `src/lib/lms/import-plan.ts` | Pure mapper from YouTube playlist metadata/videos to the `courses` / `modules` / `lessons` row shapes. Keeps `order_index` equal to playlist position. |
| `src/lib/lms/import-playlist.ts` | `importPlaylistForUser`: fetches the playlist, creates the course as `pending`, writes the module and lessons, then marks it `ready`. Interrupted imports are replaced on retry, and concurrent imports return 409 instead of a half-built course. |
| `src/lib/lms/import-request.ts` | Runtime validation of the import body: an object with a non-empty string `urlOrId`. |
| `src/app/api/courses/import/route.ts` | `POST /api/courses/import` — auth check, runtime body validation, calls the importer, maps `PlaylistImportError` to 400/409/502/500. |
| `src/lib/youtube.ts` | Adds `durationSeconds` to playlist videos and exports `parseIso8601DurationSeconds`. |
| `src/app/(app)/dashboard/dashboard-content.tsx` | The “Add playlist” flow now also calls `/api/courses/import` after saving the legacy `playlists` row. |
| `src/app/api/user/purge/route.ts` | Also deletes the user's `courses`; cascade removes modules and lessons. |
| `supabase/migrations/0002_course_playlist_unique.sql` | Partial unique index on `(user_id, source_playlist_id)` so one playlist maps to one course per user while manual courses stay unconstrained. |
| `supabase/migrations/0003_course_import_status.sql` | Adds `courses.import_status` (`pending` / `ready`); existing rows default to `ready`. |
| `supabase/migrations/0004_progress_preserve_completed.sql` | Trigger on the legacy `progress` table that keeps `completed = true` from being cleared by a stale write. No-op if the table is absent. |
| `tests/lms/phase1-import.test.mjs` | Covers duration parsing, import ordering, empty playlists, and the per-user uniqueness rule. |
| `tests/lms/phase1-service.test.mjs` | Exercises `importPlaylistForUser` against a fake Supabase client: hierarchy writes, idempotency, rollback, interrupted-import repair, and invalid input. |
| `tests/lms/import-request.test.mjs` | Rejects null/non-object bodies, non-string values, and empty strings; trims valid input. |
| `tests/lms/progress-completed.test.mjs` | Proves the `progress` trigger preserves `completed = true` while still updating `timestamp_sec`. |
| `tests/helpers/alias-loader.mjs` + `register-alias.mjs` | Lets Node tests resolve the app's `@/` import alias and extensionless `.ts` imports. |
| `tests/helpers/lms-db.mjs` | Now applies every `supabase/migrations/*.sql` in sorted order instead of one hard-coded file. |

**Import flow**

1. Parse the playlist ID from the pasted URL or raw ID.
2. Fetch playlist metadata and the ordered video list from YouTube.
3. Build the plan: course title + `source_type = 'playlist'` +
   `source_playlist_id`; one module titled “Videos”; one lesson per video with
   `order_index` = playlist position.
4. Insert the course as the signed-in user with `import_status = 'pending'`
   (RLS enforces ownership).
5. Insert the module, then lessons in chunks of 500.
6. Mark the course `ready`. Only then can a later import return
   `alreadyImported: true`.
7. On failure, delete the course (cascade removes the partial hierarchy). If
   that cleanup also fails, the `pending` row is left behind and the next import
   deletes and replaces it.
8. Insert a `playlist_imported` usage event with `meta.lesson_count` and
   `meta.course_id` (best-effort; instrumentation cannot fail the import).
9. A concurrent import that loses the unique-index race returns
   `alreadyImported: true` if the winner is `ready`, or `409` if it is still
   `pending`.

### Verification

```text
npm test
✔ parseIso8601DurationSeconds converts YouTube durations to seconds
✔ buildPlaylistImportPlan preserves playlist order
✔ buildPlaylistImportPlan handles an empty playlist
✔ a playlist can only be imported once per user
✔ import creates one course, one module, and ordered lessons
✔ importing the same playlist twice returns the existing course
✔ a failed lesson insert rolls the course back
✔ an interrupted import is replaced on the next attempt
✔ input without a playlist id is rejected before any fetch
✔ parseImportUrlOrId accepts a non-empty string and trims it
✔ parseImportUrlOrId rejects null bodies and non-string values
✔ parseImportUrlOrId rejects empty and whitespace-only strings
✔ an upsert with completed=false cannot clear a stored true
✔ an incomplete row stays incomplete and can later be completed
tests 22 | pass 22 | fail 0
```

```text
npm run build
✓ Compiled successfully
✓ Finished TypeScript
Route (app)
├ ƒ /api/courses/import
```

`npx eslint` on every file added or changed by Phase 1 reports no problems.

Live schema: `0001` and `0002` were applied in the Supabase SQL editor on
2026-11-27, and `information_schema.tables` returned `courses`, `modules`,
`lessons`, and `usage_events`. `0003` and `0004` were added during review and
still need to be applied before the next live test.

### Review fixes (post-Phase 1)

1. **Import body validation.** `POST /api/courses/import` parsed JSON with a
   cast and then called `.trim()` on `body.urlOrId`. A `null` body or a
   non-string value threw and returned 500. The route now parses as `unknown`
   and `parseImportUrlOrId` returns 400 for anything that is not an object with
   a non-empty string `urlOrId`; valid strings are still trimmed.
2. **Save-progress lookup error.** The completion lookup ignored its Supabase
   error and could proceed with a stale `completed: false`. It now returns 500
   with the lookup message before the upsert.
3. **Atomic completion preservation.** The handler’s read-then-upsert could
   still race another write and downgrade `true` to `false`. Migration `0004`
   adds a `BEFORE INSERT OR UPDATE` trigger on `progress` that keeps `completed`
   monotonic; timestamp updates and the existing `onConflict` key are unchanged.
4. **Import atomicity.** A failed lesson chunk could leave a course that the
   next import treated as complete. Courses now carry `import_status`:
   `pending` during the import, `ready` only after the hierarchy is written.
   `alreadyImported` is returned only for `ready` courses; a leftover `pending`
   course is deleted and rebuilt on retry, and a concurrent `pending` import
   returns 409 instead of a partial hierarchy.

### Errors, bugs, and fixes

1. **RED state:** the first Phase 1 run failed with `ERR_MODULE_NOT_FOUND` for
   `src/lib/lms/import-plan.ts`. Added the pure mapper, then the migration, and
   the tests passed.
2. **`parseIso8601Duration` became unused** after `youtube.ts` switched to
   seconds. Removed it so lint stayed clean.
3. **Unused `before`/`after` imports** in the new test were flagged by ESLint.
   Trimmed the import.
4. **The legacy player still reads `playlists` / `progress`.** Phase 1 keeps the
   legacy insert and adds the LMS import alongside it rather than breaking the
   player. This dual-write is temporary and is removed when the player moves to
   `lessons` in Phase 2.
5. **Node could not import the service directly:** `src/lib/lms/import-playlist.ts`
   imports through the `@/` alias, which Node does not resolve. Added a small
   test-only module-resolution hook (`tests/helpers/alias-loader.mjs`) instead of
   rewriting application imports to relative paths.
6. **The service test needs no network or database.** The YouTube fetchers are
   injectable (`PlaylistImportDeps`), and the Supabase client is replaced with a
   fake that records operations and mirrors course-delete cascades. This keeps
   the test fast and offline.

### Decisions

- **One module per imported playlist.** The design allows multiple modules, but
  a YouTube playlist has no module structure, so everything lands in a single
  “Videos” module with the original order. Manual modules can be added later.
- **Import is idempotent per user, not global.** Two users may import the same
  playlist; one user cannot import it twice. Enforced by a partial unique index
  plus a pre-check, with the `23505` race handled explicitly.
- **Rollback deletes the course, not individual rows.** Cascade handles the
  children, and the course is the unit the user sees.
- **Lesson insertion is chunked at 500 rows.** Keeps a large playlist within
  PostgREST request limits.
- **Durations are stored in seconds.** `parseIso8601DurationSeconds` also
  accepts the `P1DT2H` form, not just `PT…`.

- **The purge endpoint now clears LMS content too.** The existing “purge all
  data” reset deletes the user's `courses`; cascade removes modules and lessons.
  `usage_events` rows are intentionally retained as instrumentation until the
  account itself is deleted (they cascade from `auth.users`), because clients
  have no delete policy on that table.

### Manual checks

Automated tests cannot cover the live YouTube API, the Supabase project, or the
signed-in UI. After applying both migrations:

1. Sign in and add a public playlist from the dashboard.
2. In Supabase, confirm exactly one `courses` row with
   `source_type = 'playlist'`, one `modules` row, and one `lessons` row per
   video with `order_index` 0…N−1 matching playlist order.
3. Add the same playlist again: expect “already in your library” and no new
   rows.
4. Import the same playlist from a second account: expect a separate course.
5. Add an invalid or private playlist: expect an error and no partial rows.
6. Confirm a `usage_events` row with `event_type = 'playlist_imported'` and
   `meta.lesson_count` equal to the number of videos.
7. Delete one course in Supabase: its modules and lessons disappear.
8. Settings → “Purge all data”: legacy playlists and LMS courses disappear.

### Next phase

Phase 2 replaces the legacy per-video `progress` writes with
`lesson_progress` checkpoints keyed by `lesson_id`. It depends on:

- `lessons.id` being stable from import
- the existing `src/hooks/use-progress.ts` and `src/app/api/save-progress`
  patterns
- the player receiving `lesson_id` (not just `yt_video_id`) for the active
  lesson

The next step is to add the `lesson_progress` migration, the checkpoint upsert
route, and the resume-seek behavior in the player.

