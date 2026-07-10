create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  voyd_timezone text not null default 'Europe/Berlin',
  client_timezone text not null,
  full_name text not null,
  work_email text not null,
  phone_or_whatsapp text not null,
  company text not null,
  business_type text not null,
  company_size text not null,
  selected_product text not null,
  meeting_topic text not null,
  preferred_contact_method text not null check (preferred_contact_method in ('Email', 'WhatsApp')),
  additional_message text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled', 'no_show')),
  admin_notes text,
  source_page text,
  referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two active bookings must never share the same starts_at.
create unique index if not exists bookings_active_starts_at_unique
  on public.bookings (starts_at)
  where status in ('new', 'confirmed');

create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_work_email_idx on public.bookings (work_email);

create table if not exists public.blocked_booking_slots (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now()
);

-- A slot can only be blocked once; cancelling a booking releases the slot
-- automatically because cancelled rows are excluded from the active index above,
-- unless the same starts_at is separately present here as a manual block.
create unique index if not exists blocked_booking_slots_starts_at_unique
  on public.blocked_booking_slots (starts_at);

create index if not exists blocked_booking_slots_starts_at_idx on public.blocked_booking_slots (starts_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bookings_set_updated_at on public.bookings;
create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.blocked_booking_slots enable row level security;

-- The API always accesses these tables with the service-role key (bypasses RLS).
-- These policies are a defense-in-depth safety net for any authenticated
-- Supabase session that queries the tables directly.
drop policy if exists "Owner can read bookings" on public.bookings;
create policy "Owner can read bookings"
on public.bookings
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');

drop policy if exists "Owner can update bookings" on public.bookings;
create policy "Owner can update bookings"
on public.bookings
for update
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com')
with check ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');

drop policy if exists "Owner can read blocked slots" on public.blocked_booking_slots;
create policy "Owner can read blocked slots"
on public.blocked_booking_slots
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');

drop policy if exists "Owner can manage blocked slots" on public.blocked_booking_slots;
create policy "Owner can manage blocked slots"
on public.blocked_booking_slots
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com')
with check ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');
