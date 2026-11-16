-- Private bug reports and screenshot storage for Maestro Junior.

create table if not exists public.bug_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null check (char_length(description) between 1 and 2000),
  screenshot_path text,
  page_url text not null check (char_length(page_url) between 1 and 2048),
  created_at timestamptz not null default now()
);

alter table public.bug_reports enable row level security;

drop policy if exists "Users can create their own bug reports" on public.bug_reports;
create policy "Users can create their own bug reports"
  on public.bug_reports for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own bug reports" on public.bug_reports;
create policy "Users can read their own bug reports"
  on public.bug_reports for select to authenticated
  using ((select auth.uid()) = user_id);

grant insert, select on public.bug_reports to authenticated;
revoke all on public.bug_reports from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('junior-reports', 'junior-reports', false, 1048576, array['image/jpeg'])
on conflict (id) do update
set public = false,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg'];

drop policy if exists "Users can upload their own Junior screenshots" on storage.objects;
create policy "Users can upload their own Junior screenshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'junior-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read their own Junior screenshots" on storage.objects;
create policy "Users can read their own Junior screenshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'junior-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete their own Junior screenshots" on storage.objects;
create policy "Users can delete their own Junior screenshots"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'junior-reports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
