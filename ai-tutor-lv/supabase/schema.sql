create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  role text not null default 'independent'
    check (role in ('school_student', 'music_student', 'music_high_school', 'teacher', 'independent')),
  grade_level smallint check (grade_level between 1 and 12),
  language text not null default 'lv' check (language in ('lv', 'en')),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_active_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select on public.profiles to authenticated;
grant insert (id, display_name, role, grade_level, language, onboarding_completed_at)
  on public.profiles to authenticated;
grant update (display_name, role, grade_level, language, onboarding_completed_at, updated_at)
  on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), nullif(split_part(new.email, '@', 1), ''), 'Skolēns')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();