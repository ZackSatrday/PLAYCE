# Supabase migrations

Apply migrations in order from the Supabase SQL editor, or with the Supabase
CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

| Migration | What it adds |
| --- | --- |
| `0001_lms_core.sql` | `courses`, `modules`, `lessons`, `usage_events`, indexes, RLS policies, and grants |
| `0002_course_playlist_unique.sql` | One course per `(user_id, source_playlist_id)`; manual courses unaffected |
| `0003_course_import_status.sql` | `courses.import_status` (`pending` / `ready`) so interrupted imports are never treated as complete |
| `0004_progress_preserve_completed.sql` | Trigger on legacy `progress` that keeps `completed = true` from being cleared (skipped if the table is absent) |
| `0005_course_import_lease.sql` | Adds an expiry to claim and recover pending playlist imports |
| `0006_progress_preserve_completed_null.sql` | Updates the legacy progress trigger to preserve completion on writes of `NULL` |

`0001_lms_core.sql` is safe to re-run: it uses `IF NOT EXISTS` for tables and
indexes and drops each policy before recreating it.

## Local verification

The RLS policies are exercised without a live Supabase project by
`tests/lms/phase0-rls.test.mjs`. It boots an in-memory Postgres (PGlite),
recreates the small parts of Supabase the migration needs (`auth.users` and
`auth.uid()`), applies the migration, and runs queries as two different
`authenticated` users plus `anon`:

```bash
npm test
```
