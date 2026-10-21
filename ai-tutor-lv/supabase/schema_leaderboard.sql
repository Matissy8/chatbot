-- Apply after schema_full.sql and schema_learning_features.sql.
-- Exposes only display names and XP through an authenticated, read-only function.

create or replace function public.get_leaderboard(p_period text default 'allTime')
returns table (
  rank_position bigint,
  display_name text,
  xp integer,
  streak integer,
  is_current_user boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not authorized';
  end if;
  if p_period is null or p_period not in ('week', 'month', 'semester', 'allTime') then
    raise exception 'invalid leaderboard period';
  end if;

  return query
  with profile_xp as (
    select
      profiles.id,
      profiles.display_name,
      profiles.streak,
      profiles.created_at,
      case
        when p_period = 'allTime' then profiles.xp
        else coalesce(sum(xp_transactions.amount), 0)::integer
      end as period_xp
    from public.profiles as profiles
    left join public.xp_transactions as xp_transactions
      on xp_transactions.user_id = profiles.id
      and (
        (p_period = 'week' and xp_transactions.created_at >= date_trunc('week', now()))
        or (p_period = 'month' and xp_transactions.created_at >= date_trunc('month', now()))
        or (
          p_period = 'semester'
          and xp_transactions.created_at >= date_trunc('year', now())
            + make_interval(months => case when extract(month from now()) <= 6 then 0 else 6 end)
        )
      )
    where profiles.onboarding_completed_at is not null
    group by profiles.id
  ),
  ranked as (
    select
      profile_xp.id,
      row_number() over (order by profile_xp.period_xp desc, profile_xp.created_at asc, profile_xp.id) as position,
      coalesce(nullif(profile_xp.display_name, ''), 'Skolēns') as name,
      profile_xp.period_xp as score,
      profile_xp.streak
    from profile_xp
    where profile_xp.period_xp > 0
  )
  select
    ranked.position,
    ranked.name,
    ranked.score,
    ranked.streak,
    ranked.id = current_user_id
  from ranked
  where ranked.position <= 20 or ranked.id = current_user_id
  order by ranked.position;
end;
$$;

revoke all on function public.get_leaderboard(text) from public, anon;
grant execute on function public.get_leaderboard(text) to authenticated;
