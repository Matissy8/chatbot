-- Upgrade chat/profile columns for projects created before the current app schema.
-- This migration preserves existing chat history and daily_usage reservation rows.

alter table public.chats
  add column if not exists subject text not null default 'General';

alter table public.chats
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  add column if not exists plan text not null default 'free'
  check (plan in ('free', 'pro'));

create index if not exists chats_user_updated_idx
  on public.chats (user_id, updated_at desc);

create or replace function public.set_chat_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_chats_updated_at on public.chats;
create trigger set_chats_updated_at
  before update on public.chats
  for each row execute procedure public.set_chat_updated_at();
