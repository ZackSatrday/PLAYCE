-- Rows created before leases were introduced can be reclaimed immediately.
alter table public.courses
  add column if not exists import_lease_expires_at timestamptz not null
  default '-infinity'::timestamptz;
