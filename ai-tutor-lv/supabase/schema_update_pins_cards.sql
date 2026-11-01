-- Run once in Supabase SQL Editor (after schema_full.sql / schema_learning_features.sql).
-- 1) Chat pinning.
-- 2) Extended flashcard allow-list (the RPC validates card ids server-side).

alter table public.chats
  add column if not exists is_pinned boolean not null default false;

create index if not exists chats_user_pinned_idx
  on public.chats (user_id, is_pinned desc, updated_at desc);

create or replace function public.record_flashcard_review(p_card_id text, p_knew boolean)
returns table (known_count integer, review_count integer, streak integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'not authorized'; end if;
  if p_card_id is null or p_knew is null or p_card_id not in (
    'allegro', 'andante', 'forte', 'piano', 'crescendo',
    'diminuendo', 'staccato', 'legato', 'perfect-fifth', 'dominant-seventh',
    'note-h-b', 'enharmonism', 'tritone', 'thirds', 'd7-inversions',
    'vii7-dim', 'tempo-rubato', 'smorzando', 'darzins-valsis'
  ) then raise exception 'unknown flashcard'; end if;

  insert into public.flashcard_progress (user_id, card_id, known_count, review_count)
  values (current_user_id, p_card_id, case when p_knew then 1 else 0 end, case when p_knew then 0 else 1 end)
  on conflict (user_id, card_id) do update set
    known_count = public.flashcard_progress.known_count + case when p_knew then 1 else 0 end,
    review_count = public.flashcard_progress.review_count + case when p_knew then 0 else 1 end,
    updated_at = now();

  return query
  select f.known_count, f.review_count, public.record_learning_activity(current_user_id)
  from public.flashcard_progress f
  where f.user_id = current_user_id and f.card_id = p_card_id;
end;
$$;

revoke all on function public.record_flashcard_review(text, boolean) from public, anon;
grant execute on function public.record_flashcard_review(text, boolean) to authenticated;
