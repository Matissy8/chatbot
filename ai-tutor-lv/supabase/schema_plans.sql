-- Subscription plans and the daily free-tier chat limit. Idempotent; run after schema.sql.

alter table public.profiles
  add column if not exists plan text not null default 'free' check (plan in ('free', 'pro'));

-- Clients may read their plan but never choose it; only trusted roles (service role, SQL editor) can change it.
create or replace function public.protect_profile_plan()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.plan := 'free';
    elsif new.plan is distinct from old.plan then
      raise exception 'plan can only be changed by a trusted role' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_plan on public.profiles;
create trigger protect_profiles_plan
  before insert or update on public.profiles
  for each row execute procedure public.protect_profile_plan();

create or replace function public.free_daily_chat_limit()
returns integer
language sql
immutable
set search_path = ''
as $$ select 20 $$;

create table if not exists public.daily_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null,
  chat_questions integer not null default 0 check (chat_questions >= 0),
  primary key (user_id, usage_date)
);

alter table public.daily_usage enable row level security;

drop policy if exists "Users can read their own usage" on public.daily_usage;
create policy "Users can read their own usage"
  on public.daily_usage for select to authenticated
  using ((select auth.uid()) = user_id);

-- Counters change only through consume_chat_credit(), never by direct client writes.
revoke all on public.daily_usage from anon, authenticated;
grant select on public.daily_usage to authenticated;

-- Atomically spends one question. The conditional upsert cannot exceed the limit under concurrent requests.
-- The day rolls over at midnight in Latvia.
create or replace function public.consume_chat_credit()
returns table (is_allowed boolean, user_plan text, questions_used integer, questions_limit integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  daily_limit integer := public.free_daily_chat_limit();
  usage_day date := (now() at time zone 'Europe/Riga')::date;
  current_plan text;
  used_after integer;
begin
  if current_user_id is null then raise exception 'not authorized' using errcode = '42501'; end if;

  select p.plan into current_plan from public.profiles p where p.id = current_user_id;
  current_plan := coalesce(current_plan, 'free');

  if current_plan = 'pro' then
    return query select true, current_plan, 0, null::integer;
    return;
  end if;

  insert into public.daily_usage as du (user_id, usage_date, chat_questions)
  values (current_user_id, usage_day, 1)
  on conflict (user_id, usage_date) do update
    set chat_questions = du.chat_questions + 1
    where du.chat_questions < daily_limit
  returning du.chat_questions into used_after;

  if used_after is null then
    return query select false, current_plan, daily_limit, daily_limit;
  else
    return query select true, current_plan, used_after, daily_limit;
  end if;
end;
$$;

create or replace function public.get_chat_credits()
returns table (user_plan text, questions_used integer, questions_limit integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_plan text;
  used_today integer;
begin
  if current_user_id is null then raise exception 'not authorized' using errcode = '42501'; end if;

  select p.plan into current_plan from public.profiles p where p.id = current_user_id;
  current_plan := coalesce(current_plan, 'free');

  if current_plan = 'pro' then
    return query select current_plan, 0, null::integer;
    return;
  end if;

  select coalesce(sum(du.chat_questions), 0)::integer into used_today
  from public.daily_usage du
  where du.user_id = current_user_id and du.usage_date = (now() at time zone 'Europe/Riga')::date;

  return query select current_plan, used_today, public.free_daily_chat_limit();
end;
$$;

revoke all on function public.free_daily_chat_limit() from public, anon, authenticated;
revoke all on function public.consume_chat_credit() from public, anon;
grant execute on function public.consume_chat_credit() to authenticated;
revoke all on function public.get_chat_credits() from public, anon;
grant execute on function public.get_chat_credits() to authenticated;
