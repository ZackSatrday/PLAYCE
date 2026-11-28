-- Update the trigger function on projects that already applied 0004.
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
    if tg_op = 'UPDATE' and old.completed is true and new.completed is not true then
      new.completed := true;
    end if;
    return new;
  end;
  $fn$;
end
$do$;
