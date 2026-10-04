-- Run after schema.sql in the Supabase SQL Editor.
-- Creates private conversation history and transactional XP awarding.

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Jauna saruna',
  subject text not null default 'General',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  subject text not null default 'General',
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles add column if not exists streak integer not null default 0;

create index if not exists chats_user_updated_idx on public.chats (user_id, updated_at desc);
create index if not exists messages_chat_created_idx on public.messages (chat_id, created_at asc);
create index if not exists xp_transactions_user_created_idx on public.xp_transactions (user_id, created_at desc);

alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.xp_transactions enable row level security;

-- Recreate policies safely so this file can be applied more than once.
drop policy if exists "Users can manage their own chats" on public.chats;
create policy "Users can manage their own chats"
  on public.chats for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read their own chat messages" on public.messages;
create policy "Users can read their own chat messages"
  on public.messages for select to authenticated
  using (exists (
    select 1 from public.chats
    where chats.id = messages.chat_id and chats.user_id = (select auth.uid())
  ));

drop policy if exists "Users can add messages to their own chats" on public.messages;
create policy "Users can add messages to their own chats"
  on public.messages for insert to authenticated
  with check (exists (
    select 1 from public.chats
    where chats.id = messages.chat_id and chats.user_id = (select auth.uid())
  ));

drop policy if exists "Users can delete messages in their own chats" on public.messages;
create policy "Users can delete messages in their own chats"
  on public.messages for delete to authenticated
  using (exists (
    select 1 from public.chats
    where chats.id = messages.chat_id and chats.user_id = (select auth.uid())
  ));

drop policy if exists "Users can read their own XP transactions" on public.xp_transactions;
create policy "Users can read their own XP transactions"
  on public.xp_transactions for select to authenticated
  using ((select auth.uid()) = user_id);

-- Clients cannot directly grant themselves XP or write XP history.
revoke all on public.xp_transactions from anon, authenticated;
grant select on public.xp_transactions to authenticated;
revoke insert, update, delete on public.xp_transactions from anon, authenticated;

grant select, insert, update, delete on public.chats to authenticated;
grant select, insert, delete on public.messages to authenticated;

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

-- One atomic operation: append an XP transaction and update the profile total.
-- The amount and reason are server-defined to prevent clients selecting rewards.
create or replace function public.award_chat_xp(p_user_id uuid, p_subject text default 'General')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_total integer;
  safe_subject text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'not authorized';
  end if;

  safe_subject := left(coalesce(nullif(trim(p_subject), ''), 'General'), 80);

  insert into public.profiles (id, display_name)
  values (p_user_id, 'Skolēns')
  on conflict (id) do nothing;

  insert into public.xp_transactions (user_id, amount, reason, subject)
  values (p_user_id, 15, 'Uzdots jautājums AI asistentam', safe_subject);

  update public.profiles
  set xp = xp + 15
  where id = p_user_id
  returning xp into new_total;

  return new_total;
end;
$$;

revoke all on function public.award_chat_xp(uuid, text) from public, anon;
grant execute on function public.award_chat_xp(uuid, text) to authenticated;
