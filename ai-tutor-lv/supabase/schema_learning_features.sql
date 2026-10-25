-- Run after schema_full.sql to enable quizzes, flashcard progress, the learning path, and daily streaks.

create or replace function public.record_learning_activity(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Europe/Riga')::date;
  previous_day date;
  previous_streak integer;
  next_streak integer;
begin
  insert into public.profiles (id, display_name)
  values (p_user_id, 'Skolēns')
  on conflict (id) do nothing;

  select p.streak, (p.last_active_at at time zone 'Europe/Riga')::date
  into previous_streak, previous_day
  from public.profiles p
  where p.id = p_user_id
  for update;

  if previous_day = today then
    next_streak := previous_streak;
  elsif previous_day = today - 1 then
    next_streak := previous_streak + 1;
  else
    next_streak := 1;
  end if;

  update public.profiles
  set streak = next_streak, last_active_at = now()
  where id = p_user_id;

  return next_streak;
end;
$$;

revoke all on function public.record_learning_activity(uuid) from public, anon, authenticated;

create or replace function public.record_activity_for_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.record_learning_activity(new.user_id);
  return new;
end;
$$;

revoke all on function public.record_activity_for_xp() from public, anon, authenticated;

drop trigger if exists record_learning_activity_for_xp on public.xp_transactions;
create trigger record_learning_activity_for_xp
  after insert on public.xp_transactions
  for each row execute procedure public.record_activity_for_xp();

create table if not exists public.quick_quiz_questions (
  id text primary key,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) = 4),
  correct_answer smallint not null check (correct_answer between 0 and 3),
  explanation text not null,
  active boolean not null default true,
  check (correct_answer < jsonb_array_length(options))
);

insert into public.quick_quiz_questions (id, question, options, correct_answer, explanation) values
  ('interval-c-g', 'Kāds intervāls veidojas starp notīm Do (C) un Sol (G)?', '["Lielā terca", "Tīrā kvinta", "Tīrā kvarta", "Oktāva"]', 1, 'Do–Re–Mi–Fa–Sol aptver piecas skaņkārtas pakāpes, tāpēc tas ir tīras kvintas intervāls.'),
  ('half-note', 'Cik ceturtdaļnošu ilgst pusnote?', '["1", "2", "3", "4"]', 1, 'Pusnote ilgst divas ceturtdaļnotis.'),
  ('quarter-beat', 'Cik astotdaļnošu ietilpst vienā ceturtdaļnotī?', '["1", "2", "3", "4"]', 1, 'Viena ceturtdaļnote dalās divās astotdaļnotīs.'),
  ('allegro', 'Ko mūzikā nozīmē apzīmējums Allegro?', '["Lēni un mierīgi", "Ātri un dzīvīgi", "Klusā skaļumā", "Pakāpeniski skaļāk"]', 1, 'Allegro norāda uz ātru un dzīvīgu tempu.'),
  ('forte', 'Ko nozīmē dinamiskais apzīmējums forte (f)?', '["Kluss", "Vidēji skaļš", "Skaļi", "Ļoti lēni"]', 2, 'Forte nozīmē skaļi.'),
  ('crescendo', 'Ko nozīmē crescendo?', '["Pakāpeniski skaļāk", "Pakāpeniski klusāk", "Atskaņot īsi", "Atskaņot saistīti"]', 0, 'Crescendo nozīmē pakāpenisku skaļuma palielināšanu.'),
  ('time-signature', 'Ko 4/4 taktsmērā norāda augšējais skaitlis?', '["Taktī ir četras ceturtdaļdaļas", "Taktī ir četras taktis", "Viena ceturtdaļnote ilgst četras sekundes", "Jāspēlē četras reizes ātrāk"]', 0, 'Augšējais skaitlis norāda skaitāmo vienību skaitu taktī; 4/4 taktsmērā tās ir četras.'),
  ('staccato', 'Kā jāatskaņo notis ar apzīmējumu staccato?', '["Īsi un atdalīti", "Ļoti skaļi", "Pakāpeniski lēnāk", "Saistīti un plūstoši"]', 0, 'Staccato nozīmē atskaņot skaņas īsi un atdalīti.'),
  ('d7-notes', 'Kuri toņi veido C mažora dominantes septakordu G7?', '["G–B–D–F", "C–E–G–B", "F–A–C–E", "D–F–A–C"]', 0, 'G7 sastāv no G, B, D un F — C mažora V pakāpes septakorda.'),
  ('andante', 'Ko nozīmē tempa apzīmējums Andante?', '["Ļoti ātri", "Rāmi, soļojošā tempā", "Pakāpeniski klusāk", "Ar asu uzsvaru"]', 1, 'Andante apzīmē mierīgu, soļojošu tempu.'),
  ('major-triad', 'Kuri intervāli no pamatskaņas veido mažora trijskani?', '["Liela terca un tīra kvinta", "Maza terca un tīra kvinta", "Divas tīras kvartas", "Tritons un maza terca"]', 0, 'Mažora trijskanī no pamatskaņas ir lielā terca un tīrā kvinta.'),
  ('legato', 'Ko nozīmē legato?', '["Skaņas spēlēt īsi un atdalīti", "Skaņas savienot plūstoši", "Spēlēt arvien skaļāk", "Atkārtot vienu skaņu"]', 1, 'Legato nozīmē savienot skaņas plūstoši, bez pārtraukumiem.')
on conflict (id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_answer = excluded.correct_answer,
  explanation = excluded.explanation,
  active = true;

create table if not exists public.quick_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_set jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  score smallint
);

create index if not exists quick_quiz_attempts_user_created_idx
  on public.quick_quiz_attempts (user_id, created_at desc);
create unique index if not exists quick_quiz_attempts_one_open_per_user_idx
  on public.quick_quiz_attempts (user_id)
  where completed_at is null;
alter table public.quick_quiz_attempts enable row level security;
revoke all on public.quick_quiz_questions from anon, authenticated;
revoke all on public.quick_quiz_attempts from anon, authenticated;

create or replace function public.start_quick_quiz()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_attempt public.quick_quiz_attempts%rowtype;
  public_questions jsonb;
begin
  if current_user_id is null then raise exception 'not authorized'; end if;

  delete from public.quick_quiz_attempts
  where user_id = current_user_id and expires_at < now();

  insert into public.quick_quiz_attempts (user_id, question_set)
  select current_user_id, jsonb_agg(jsonb_build_object(
    'id', q.id,
    'question', q.question,
    'options', q.options,
    'correctAnswer', q.correct_answer,
    'explanation', q.explanation
  ))
  from (
    select id, question, options, correct_answer, explanation
    from public.quick_quiz_questions
    where active
    order by random()
    limit 5
  ) as q
  having count(*) = 5
  on conflict (user_id) where completed_at is null do nothing
  returning * into new_attempt;

  if new_attempt.id is null then
    select * into new_attempt
    from public.quick_quiz_attempts
    where user_id = current_user_id and completed_at is null and expires_at >= now()
    order by created_at desc
    limit 1;
  end if;

  if new_attempt.id is null then raise exception 'quiz questions unavailable'; end if;

  select jsonb_agg(jsonb_build_object(
    'id', q->>'id',
    'question', q->>'question',
    'options', q->'options'
  ))
  into public_questions
  from jsonb_array_elements(new_attempt.question_set) as items(q);

  return jsonb_build_object('attemptId', new_attempt.id, 'questions', public_questions);
end;
$$;

create or replace function public.submit_quick_quiz_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_selected_option integer
)
returns table (
  correct boolean,
  explanation text,
  selected_option integer,
  correct_option integer,
  xp_awarded integer,
  total_xp integer,
  streak integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_row public.quick_quiz_attempts%rowtype;
  question jsonb;
  saved_option integer;
  was_answered boolean;
  is_correct boolean;
  awarded_xp integer := 0;
  updated_xp integer;
  updated_streak integer;
begin
  if current_user_id is null then raise exception 'not authorized'; end if;

  select * into attempt_row
  from public.quick_quiz_attempts
  where id = p_attempt_id and user_id = current_user_id
  for update;
  if not found then raise exception 'attempt not found'; end if;
  if attempt_row.expires_at < now() or attempt_row.completed_at is not null then
    raise exception 'attempt expired';
  end if;

  select value into question
  from jsonb_array_elements(attempt_row.question_set)
  where value->>'id' = p_question_id;
  if question is null then raise exception 'question not found'; end if;

  was_answered := attempt_row.answers ? p_question_id;
  if was_answered then
    saved_option := (attempt_row.answers->>p_question_id)::integer;
  else
    if p_selected_option is null or p_selected_option < 0 or p_selected_option >= jsonb_array_length(question->'options') then
      raise exception 'answer selection out of bounds';
    end if;
    saved_option := p_selected_option;
    update public.quick_quiz_attempts
    set answers = answers || jsonb_build_object(p_question_id, saved_option)
    where id = p_attempt_id;
  end if;

  is_correct := saved_option = (question->>'correctAnswer')::integer;
  if not was_answered then
    if is_correct then
      insert into public.xp_transactions (user_id, amount, reason, subject)
      values (current_user_id, 20, 'Pareiza zibens-viktorīnas atbilde', 'Solfedžo');
      update public.profiles
      set xp = xp + 20
      where id = current_user_id;
      awarded_xp := 20;
    else
      updated_streak := public.record_learning_activity(current_user_id);
    end if;
  end if;

  select p.xp, p.streak into updated_xp, updated_streak
  from public.profiles p
  where p.id = current_user_id;

  return query select
    is_correct,
    question->>'explanation',
    saved_option,
    (question->>'correctAnswer')::integer,
    awarded_xp,
    coalesce(updated_xp, 0),
    coalesce(updated_streak, 0);
end;
$$;

create or replace function public.complete_quick_quiz(p_attempt_id uuid)
returns table (score integer, question_count integer, total_xp integer, streak integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  attempt_row public.quick_quiz_attempts%rowtype;
  question jsonb;
  calculated_score integer := 0;
  total_questions integer;
  updated_xp integer;
  updated_streak integer;
begin
  if current_user_id is null then raise exception 'not authorized'; end if;

  select * into attempt_row
  from public.quick_quiz_attempts
  where id = p_attempt_id and user_id = current_user_id
  for update;
  if not found then raise exception 'attempt not found'; end if;

  total_questions := jsonb_array_length(attempt_row.question_set);
  if attempt_row.completed_at is null then
    if attempt_row.expires_at < now() then raise exception 'attempt expired'; end if;
    if jsonb_object_length(attempt_row.answers) <> total_questions then
      raise exception 'all questions must be answered';
    end if;

    for question in select value from jsonb_array_elements(attempt_row.question_set)
    loop
      if (attempt_row.answers->>(question->>'id'))::integer = (question->>'correctAnswer')::integer then
        calculated_score := calculated_score + 1;
      end if;
    end loop;

    update public.quick_quiz_attempts
    set completed_at = now(), score = calculated_score
    where id = p_attempt_id;
  else
    calculated_score := attempt_row.score;
  end if;

  select p.xp, p.streak into updated_xp, updated_streak
  from public.profiles p
  where p.id = current_user_id;

  return query select calculated_score, total_questions, coalesce(updated_xp, 0), coalesce(updated_streak, 0);
end;
$$;

create table if not exists public.flashcard_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  known_count integer not null default 0 check (known_count >= 0),
  review_count integer not null default 0 check (review_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

alter table public.flashcard_progress enable row level security;
drop policy if exists "Users can read their own flashcard progress" on public.flashcard_progress;
create policy "Users can read their own flashcard progress"
  on public.flashcard_progress for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.flashcard_progress to authenticated;
revoke insert, update, delete on public.flashcard_progress from anon, authenticated;

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
    'diminuendo', 'staccato', 'legato', 'perfect-fifth', 'dominant-seventh'
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

create table if not exists public.learning_path_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson_id text not null check (lesson_id in ('rhythm', 'intervals', 'dominant-seventh')),
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.learning_path_progress enable row level security;
drop policy if exists "Users can read their own learning path progress" on public.learning_path_progress;
create policy "Users can read their own learning path progress"
  on public.learning_path_progress for select to authenticated
  using ((select auth.uid()) = user_id);
grant select on public.learning_path_progress to authenticated;
revoke insert, update, delete on public.learning_path_progress from anon, authenticated;

create or replace function public.complete_learning_path_lesson(p_lesson_id text)
returns table (lesson_id text, streak integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  required_lesson text;
  inserted_count integer;
begin
  if current_user_id is null then raise exception 'not authorized'; end if;

  required_lesson := case p_lesson_id
    when 'rhythm' then null
    when 'intervals' then 'rhythm'
    when 'dominant-seventh' then 'intervals'
    else 'invalid'
  end;
  if required_lesson = 'invalid' then raise exception 'unknown learning path lesson'; end if;
  if required_lesson is not null and not exists (
    select 1 from public.learning_path_progress p
    where p.user_id = current_user_id and p.lesson_id = required_lesson
  ) then raise exception 'previous lesson is not complete'; end if;

  insert into public.learning_path_progress (user_id, lesson_id)
  values (current_user_id, p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;
  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    return query select p_lesson_id, public.record_learning_activity(current_user_id);
  else
    return query select p_lesson_id, p.streak
    from public.profiles p
    where p.id = current_user_id;
  end if;
end;
$$;

create or replace function public.get_quick_quiz_achievement_stats()
returns table (completed_quizzes bigint, best_score integer, best_question_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      select count(*)
      from public.quick_quiz_attempts q
      where q.user_id = (select auth.uid()) and q.completed_at is not null
    ),
    coalesce((
      select q.score
      from public.quick_quiz_attempts q
      where q.user_id = (select auth.uid()) and q.completed_at is not null
      order by q.score desc, q.completed_at desc
      limit 1
    ), 0),
    coalesce((
      select jsonb_array_length(q.question_set)
      from public.quick_quiz_attempts q
      where q.user_id = (select auth.uid()) and q.completed_at is not null
      order by q.score desc, q.completed_at desc
      limit 1
    ), 5);
$$;

-- Achievement unlocks are derived and persisted by the authenticated-only RPC below.
create table if not exists public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null check (achievement_id in (
    'first-quiz', 'streak-3', 'streak-7', 'xp-100', 'flashcard-20', 'perfect-quiz'
  )),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

alter table public.user_achievements enable row level security;
drop policy if exists "user_achievements_select_own" on public.user_achievements;
drop policy if exists "user_achievements_insert_own" on public.user_achievements;
drop policy if exists "Users can read their own achievements" on public.user_achievements;
create policy "Users can read their own achievements"
  on public.user_achievements for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.user_achievements from public, anon, authenticated;
grant select on public.user_achievements to authenticated;

create or replace function public.refresh_user_achievements_for(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_xp integer;
  current_streak integer;
  reviewed_cards bigint;
begin
  select coalesce(max(p.xp), 0), coalesce(max(p.streak), 0)
  into current_xp, current_streak
  from public.profiles p
  where p.id = p_user_id;

  insert into public.user_achievements (user_id, achievement_id)
  select p_user_id, a.achievement_id
  from (values
    ('first-quiz', exists (
      select 1 from public.quick_quiz_attempts q
      where q.user_id = p_user_id and q.completed_at is not null
    )),
    ('streak-3', current_streak >= 3),
    ('streak-7', current_streak >= 7),
    ('xp-100', current_xp >= 100),
    ('perfect-quiz', exists (
      select 1 from public.quick_quiz_attempts q
      where q.user_id = p_user_id
        and q.completed_at is not null
        and q.score = 5
        and jsonb_array_length(q.question_set) = 5
    ))
  ) as a(achievement_id, achieved)
  where a.achieved
  on conflict (user_id, achievement_id) do nothing;

  select coalesce(sum(f.known_count + f.review_count), 0)
  into reviewed_cards
  from public.flashcard_progress f
  where f.user_id = p_user_id;

  if reviewed_cards >= 20 then
    insert into public.user_achievements (user_id, achievement_id)
    values (p_user_id, 'flashcard-20')
    on conflict (user_id, achievement_id) do nothing;
  end if;
end;
$$;

create or replace function public.refresh_user_achievements()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'not authorized'; end if;
  perform public.refresh_user_achievements_for(current_user_id);
end;
$$;

create or replace function public.capture_profile_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_user_achievements_for(new.id);
  return new;
end;
$$;

create or replace function public.capture_quiz_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.completed_at is not null and new.completed_at is distinct from old.completed_at then
    perform public.refresh_user_achievements_for(new.user_id);
  end if;
  return new;
end;
$$;

create or replace function public.capture_flashcard_achievements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_user_achievements_for(new.user_id);
  return new;
end;
$$;

revoke all on function public.refresh_user_achievements_for(uuid) from public, anon, authenticated;
revoke all on function public.capture_profile_achievements() from public, anon, authenticated;
revoke all on function public.capture_quiz_achievements() from public, anon, authenticated;
revoke all on function public.capture_flashcard_achievements() from public, anon, authenticated;

drop trigger if exists capture_profile_achievements on public.profiles;
create trigger capture_profile_achievements
  after update of xp, streak on public.profiles
  for each row
  when (old.xp is distinct from new.xp or old.streak is distinct from new.streak)
  execute function public.capture_profile_achievements();

drop trigger if exists capture_quiz_achievements on public.quick_quiz_attempts;
create trigger capture_quiz_achievements
  after update of completed_at on public.quick_quiz_attempts
  for each row
  when (new.completed_at is not null and old.completed_at is distinct from new.completed_at)
  execute function public.capture_quiz_achievements();

drop trigger if exists capture_flashcard_insert_achievements on public.flashcard_progress;
create trigger capture_flashcard_insert_achievements
  after insert on public.flashcard_progress
  for each row
  execute function public.capture_flashcard_achievements();

drop trigger if exists capture_flashcard_update_achievements on public.flashcard_progress;
create trigger capture_flashcard_update_achievements
  after update of known_count, review_count on public.flashcard_progress
  for each row
  execute function public.capture_flashcard_achievements();

revoke all on function public.start_quick_quiz() from public, anon;
revoke all on function public.submit_quick_quiz_answer(uuid, text, integer) from public, anon;
revoke all on function public.complete_quick_quiz(uuid) from public, anon;
revoke all on function public.record_flashcard_review(text, boolean) from public, anon;
revoke all on function public.complete_learning_path_lesson(text) from public, anon;
revoke all on function public.get_quick_quiz_achievement_stats() from public, anon;
revoke all on function public.refresh_user_achievements() from public, anon;
grant execute on function public.start_quick_quiz() to authenticated;
grant execute on function public.submit_quick_quiz_answer(uuid, text, integer) to authenticated;
grant execute on function public.complete_quick_quiz(uuid) to authenticated;
grant execute on function public.record_flashcard_review(text, boolean) to authenticated;
grant execute on function public.complete_learning_path_lesson(text) to authenticated;
grant execute on function public.get_quick_quiz_achievement_stats() to authenticated;
grant execute on function public.refresh_user_achievements() to authenticated;
