-- Playce LMS — Phase 1 follow-up
-- Marks whether a course's hierarchy finished importing. A course is only
-- treated as "already imported" once its lessons are written.
--
-- Existing courses (manual or completed imports) default to 'ready'.
-- Apply after 0002_course_playlist_unique.sql.

alter table public.courses
  add column if not exists import_status text not null default 'ready'
    check (import_status in ('pending', 'ready'));
