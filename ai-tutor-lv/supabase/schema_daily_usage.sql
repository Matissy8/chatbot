-- Daily AI usage reservations used by /api/chat and /api/audio-quiz (server side, service role only).
-- Run after schema_full.sql. Safe to re-run: it also upgrades the older per-day counter table in place.

create table if not exists public.daily_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- Upgrade the older (user_id, usage_date) counter table; its existing rows count as confirmed usage.
alter table public.daily_usage add column if not exists id uuid default gen_random_uuid();
update public.daily_usage set id = gen_random_uuid() where id is null;
alter table public.daily_usage alter column id set not null;
alter table public.daily_usage add column if not exists status text not null default 'confirmed';
alter table public.daily_usage add column if not exists created_at timestamptz not null default now();
alter table public.daily_usage alter column status set default 'pending';

do $$
declare
  pk_name text;
  pk_columns text;
begin
  select c.conname, string_agg(a.attname, ',' order by a.attname)
  into pk_name, pk_columns
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
  where c.conrelid = 'public.daily_usage'::regclass and c.contype = 'p'
  group by c.conname;

  if pk_name is not null and pk_columns <> 'id' then
    execute format('alter table public.daily_usage drop constraint %I', pk_name);
  end if;
  if pk_name is null or pk_columns <> 'id' then
    alter table public.daily_usage add primary key (id);
  end if;
end $$;

alter table public.daily_usage drop constraint if exists daily_usage_status_check;
alter table public.daily_usage
  add constraint daily_usage_status_check check (status in ('pending', 'confirmed', 'cancelled'));

create index if not exists daily_usage_user_date_status_idx
  on public.daily_usage (user_id, usage_date, status);

alter table public.daily_usage enable row level security;

drop policy if exists "Users can read their own usage" on public.daily_usage;
create policy "Users can read their own usage"
  on public.daily_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Rows change only through the reservation functions below, never by direct client writes.
revoke all on public.daily_usage from anon, authenticated;
grant select on public.daily_usage to authenticated;

-- Reserves one question for today (Latvian date). Returns the reservation id, or null when the limit is reached.
-- Pending reservations older than five minutes are treated as abandoned, matching lib/daily-usage.ts.
create or replace function public.try_reserve_daily_usage(p_user_id uuid, p_max_limit integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  usage_day date := (now() at time zone 'Europe/Riga')::date;
  used_count integer;
  reservation uuid;
begin
  if p_user_id is null or p_max_limit is null or p_max_limit < 1 then
    raise exception 'invalid usage reservation request';
  end if;

  -- Serialises one user's concurrent requests so the limit cannot be exceeded.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select count(*) into used_count
  from public.daily_usage du
  where du.user_id = p_user_id
    and du.usage_date = usage_day
    and (
      du.status = 'confirmed'
      or (du.status = 'pending' and du.created_at >= now() - interval '5 minutes')
    );

  if used_count >= p_max_limit then
    return null;
  end if;

  insert into public.daily_usage (user_id, usage_date, status)
  values (p_user_id, usage_day, 'pending')
  returning id into reservation;

  return reservation;
end;
$$;

create or replace function public.confirm_daily_usage(p_reservation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
begin
  update public.daily_usage
  set status = 'confirmed'
  where id = p_reservation_id and status = 'pending';
  get diagnostics updated_count = row_count;
  return updated_count = 1;
end;
$$;

create or replace function public.cancel_daily_usage(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.daily_usage
  set status = 'cancelled'
  where id = p_reservation_id and status = 'pending';
end;
$$;

revoke all on function public.try_reserve_daily_usage(uuid, integer) from public, anon, authenticated;
revoke all on function public.confirm_daily_usage(uuid) from public, anon, authenticated;
revoke all on function public.cancel_daily_usage(uuid) from public, anon, authenticated;
grant execute on function public.try_reserve_daily_usage(uuid, integer) to service_role;
grant execute on function public.confirm_daily_usage(uuid) to service_role;
grant execute on function public.cancel_daily_usage(uuid) to service_role;
