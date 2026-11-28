-- Playce LMS — Phase 0
-- Core content hierarchy (courses -> modules -> lessons) plus the
-- instrumentation table. Safe to re-run: tables and indexes use IF NOT EXISTS
-- and policies are dropped before being recreated.
--
-- Apply this in the Supabase SQL editor or with the Supabase CLI:
--   supabase db push

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.courses (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  title              text not null,
  source_type        text not null default 'manual'
                       check (source_type in ('playlist', 'manual')),
  source_playlist_id text,
  created_at         timestamptz not null default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  order_index integer not null default 0
);

create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules (id) on delete cascade,
  youtube_video_id text not null,
  title            text not null,
  duration_seconds integer,
  order_index      integer not null default 0
);

create table if not exists public.usage_events (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  event_type       text not null,
  youtube_video_id text,
  lesson_id        uuid references public.lessons (id) on delete set null,
  provider         text,
  status           text,
  latency_ms       integer,
  meta             jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists modules_course_id_idx
  on public.modules (course_id);

create index if not exists lessons_module_id_idx
  on public.lessons (module_id);

create index if not exists lessons_youtube_video_id_idx
  on public.lessons (youtube_video_id);

create index if not exists usage_events_user_created_idx
  on public.usage_events (user_id, created_at desc);

create index if not exists usage_events_event_type_idx
  on public.usage_events (event_type);

create index if not exists usage_events_youtube_video_id_idx
  on public.usage_events (youtube_video_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.usage_events enable row level security;

-- Courses: the owner is the row's user_id.
drop policy if exists courses_select_own on public.courses;
create policy courses_select_own on public.courses
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists courses_insert_own on public.courses;
create policy courses_insert_own on public.courses
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists courses_update_own on public.courses;
create policy courses_update_own on public.courses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists courses_delete_own on public.courses;
create policy courses_delete_own on public.courses
  for delete to authenticated
  using (user_id = auth.uid());

-- Modules: ownership is inherited from the parent course.
drop policy if exists modules_select_own on public.modules;
create policy modules_select_own on public.modules
  for select to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists modules_insert_own on public.modules;
create policy modules_insert_own on public.modules
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists modules_update_own on public.modules;
create policy modules_update_own on public.modules
  for update to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists modules_delete_own on public.modules;
create policy modules_delete_own on public.modules
  for delete to authenticated
  using (
    exists (
      select 1
      from public.courses c
      where c.id = modules.course_id
        and c.user_id = auth.uid()
    )
  );

-- Lessons: ownership is inherited from module -> course.
drop policy if exists lessons_select_own on public.lessons;
create policy lessons_select_own on public.lessons
  for select to authenticated
  using (
    exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists lessons_insert_own on public.lessons;
create policy lessons_insert_own on public.lessons
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists lessons_update_own on public.lessons;
create policy lessons_update_own on public.lessons
  for update to authenticated
  using (
    exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists lessons_delete_own on public.lessons;
create policy lessons_delete_own on public.lessons
  for delete to authenticated
  using (
    exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and c.user_id = auth.uid()
    )
  );

-- Usage events: append-only from the client's point of view. Rows are
-- readable and insertable only by their owner; update/delete have no policy,
-- so they are denied. Server routes may use the service role for maintenance.
drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own on public.usage_events
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own on public.usage_events
  for insert to authenticated
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- Supabase's default privileges normally cover these; stating them keeps the
-- migration self-contained and lets the local RLS test run under the same
-- roles. RLS still decides which rows are visible.

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.courses, public.modules, public.lessons
  to anon, authenticated;

grant select, insert, update, delete
  on public.usage_events
  to anon, authenticated;
