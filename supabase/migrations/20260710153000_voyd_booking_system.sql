create extension if not exists pgcrypto;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  voyd_timezone text not null default 'Europe/Berlin',
  visitor_timezone text not null,
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
  source_page text,
  referrer text,
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists bookings_active_starts_at_unique
  on public.bookings (starts_at)
  where status in ('new', 'confirmed');

create index if not exists bookings_starts_at_idx on public.bookings (starts_at);
create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_work_email_idx on public.bookings (work_email);

create table if not exists public.booking_availability_blocks (
  id uuid primary key default gen_random_uuid(),
  block_type text not null check (block_type in ('date', 'slot')),
  block_date date not null,
  slot_time text check (slot_time in ('10:00', '22:00')),
  reason text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_blocks_slot_required check (
    (block_type = 'date' and slot_time is null)
    or
    (block_type = 'slot' and slot_time is not null)
  )
);

create unique index if not exists booking_blocks_date_unique
  on public.booking_availability_blocks (block_date)
  where block_type = 'date';

create unique index if not exists booking_blocks_slot_unique
  on public.booking_availability_blocks (block_date, slot_time)
  where block_type = 'slot';

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

drop trigger if exists booking_blocks_set_updated_at on public.booking_availability_blocks;
create trigger booking_blocks_set_updated_at
before update on public.booking_availability_blocks
for each row execute function public.set_updated_at();

alter table public.bookings enable row level security;
alter table public.booking_availability_blocks enable row level security;

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

drop policy if exists "Owner can read availability blocks" on public.booking_availability_blocks;
create policy "Owner can read availability blocks"
on public.booking_availability_blocks
for select
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');

drop policy if exists "Owner can manage availability blocks" on public.booking_availability_blocks;
create policy "Owner can manage availability blocks"
on public.booking_availability_blocks
for all
to authenticated
using ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com')
with check ((auth.jwt() ->> 'email') = 'voyd.contact1@gmail.com');
