-- Playce LMS — save-progress follow-up
-- The save-progress route upserts a completion flag from the client. A stale
-- read must never downgrade a stored `true` to `false`, so the database keeps
-- the flag monotonic for this table. Timestamp updates are unaffected.
--
-- The legacy `progress` table is not created by these migrations, so the whole
-- block is skipped on a project that does not have it.

do $do$
begin
  if to_regclass('public.progress') is null then
    return;
  end if;

  create or replace function public.preserve_progress_completed()
  returns trigger
  language plpgsql
  as $fn$
  begin
    if tg_op = 'UPDATE' and old.completed and not new.completed then
      new.completed := true;
    end if;
    return new;
  end;
  $fn$;

  drop trigger if exists progress_preserve_completed on public.progress;

  create trigger progress_preserve_completed
    before insert or update on public.progress
    for each row execute function public.preserve_progress_completed();
end
$do$;
