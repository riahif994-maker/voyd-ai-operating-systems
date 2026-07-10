alter table public.bookings
  add column if not exists owner_notification_status text not null default 'pending',
  add column if not exists client_notification_status text not null default 'pending',
  add column if not exists owner_notification_error text,
  add column if not exists client_notification_error text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_owner_notification_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_owner_notification_status_check
      check (owner_notification_status in ('pending', 'sent', 'failed', 'skipped'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_client_notification_status_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_client_notification_status_check
      check (client_notification_status in ('pending', 'sent', 'failed', 'skipped'));
  end if;
end $$;

create index if not exists bookings_owner_notification_status_idx
  on public.bookings (owner_notification_status);

create index if not exists bookings_client_notification_status_idx
  on public.bookings (client_notification_status);
