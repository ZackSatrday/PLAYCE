-- Playce LMS — Phase 1
-- A YouTube playlist maps to exactly one course per user. The partial index
-- also lets manual courses (source_playlist_id is null) coexist freely.
--
-- Apply after 0001_lms_core.sql.

create unique index if not exists courses_user_playlist_unique_idx
  on public.courses (user_id, source_playlist_id)
  where source_playlist_id is not null;
