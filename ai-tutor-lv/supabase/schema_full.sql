-- Complete Supabase schema. Run this file once in the Supabase SQL Editor.
-- It combines schema.sql, schema_chat_xp.sql, schema_practice.sql, and schema_plans.sql in dependency order.


-- ===== schema.sql =====
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  role text not null default 'independent'
    check (role in ('school_student', 'music_student', 'music_high_school', 'teacher', 'independent')),
  grade_level smallint check (grade_level between 1 and 12),
  language text not null default 'lv' check (language in ('lv', 'en', 'ru')),
  xp integer not null default 0 check (xp >= 0),
  streak integer not null default 0 check (streak >= 0),
  last_active_at timestamptz,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists grade_level smallint check (grade_level between 1 and 12);
alter table public.profiles add column if not exists last_active_at timestamptz;
alter table public.profiles add column if not exists onboarding_completed_at timestamptz;
alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('lv', 'en', 'ru'));

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
grant insert (id, email, display_name, role, grade_level, language, onboarding_completed_at)
  on public.profiles to authenticated;
grant update (email, display_name, role, grade_level, language, onboarding_completed_at, updated_at)
  on public.profiles to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Skolēns'
    )
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

-- ===== schema_chat_xp.sql =====
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

-- Bring existing installations created by older versions up to the current chat schema.
alter table public.chats add column if not exists subject text not null default 'General';
alter table public.chats add column if not exists updated_at timestamptz not null default now();

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


-- ===== schema_practice.sql =====
-- Run after schema.sql and schema_chat_xp.sql in the Supabase SQL Editor.
-- Questions and answer keys remain server-side. Clients cannot insert attempts or grant XP.

create table if not exists public.practice_question_bank (
  id text primary key,
  subject text not null check (subject in ('harmony', 'solfeggio', 'math', 'physics')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 8),
  correct_answer smallint not null check (correct_answer between 0 and 7),
  explanation text not null,
  active boolean not null default true,
  check (correct_answer < jsonb_array_length(options))
);

insert into public.practice_question_bank (id, subject, difficulty, question, options, correct_answer, explanation) values
('h-e-1','harmony','easy','C mažorā uz kuras pakāpes veido tonikas trijskani?','["I","IV","V","VII"]',0,'Tonika ir skaņkārtas I pakāpe; C mažorā tas ir C–E–G.'),
('h-e-2','harmony','easy','C mažorā kuri toņi veido C mažora trijskani?','["C–E–G","C–D–G","D–F–A","G–B–D"]',0,'C mažora trijskanis veidots no pamatskaņas C, lielās tercas E un tīrās kvintas G.'),
('h-m-1','harmony','medium','Kuri pakāpes toņi veido dominantes septakordu (D7)?','["V, VII, II, IV","I, III, V, VII","IV, VI, I, III","II, IV, VI, I"]',0,'D7 būvē uz V pakāpes, pievienojot akorda toņus pa tercām: V–VII–II–IV.'),
('h-m-2','harmony','medium','Kā C mažorā parasti atrisinās D7 septīma (F)?','["Uz G","Uz E, par pakāpi lejup","Uz C, lēcienā","Paliek F"]',1,'Septīma F atrisinās lejup uz E — tonikas tercu.'),
('h-h-1','harmony','hard','Kā C mažorā atrisinās vadošais tonis B, kad D7 pāriet uz toniku?','["Uz C, augšup par pustoni","Uz A, lejup par toni","Uz G, lejup par sekstu","Paliek B"]',0,'Vadošais tonis B virzās augšup par pustoni uz toniku C.'),
('h-h-2','harmony','hard','Kāda ir D7 funkcija C mažorā?','["Dominantes funkcija","Subdominantes funkcija","Tonikas funkcija","Vadošā akorda funkcija"]',0,'D7 ir dominantes septakords un rada virzību uz toniku.'),
('s-e-1','solfeggio','easy','C mažorā kā sauc skaņu vienu pakāpi virs tonikas?','["Re","Fa","Sol","Si"]',0,'C mažora otrā pakāpe ir D jeb Re.'),
('s-e-2','solfeggio','easy','Cik ceturtdaļnošu ilgst pusnote?','["1","2","3","4"]',1,'Pusnote ilgst divas ceturtdaļnotis.'),
('s-m-1','solfeggio','medium','Kāds intervāls ir starp C un G?','["Tīra kvinta","Liela terca","Tīra kvarta","Maza seksta"]',0,'C–G ir tīras kvintas intervāls.'),
('s-m-2','solfeggio','medium','Cik astotdaļnošu ietilpst vienā ceturtdaļnotī?','["2","3","4","8"]',0,'Viena ceturtdaļnote dalās divās astotdaļnotīs.'),
('s-h-1','solfeggio','hard','Kāds intervāls veidojas no F līdz B?','["Tritons (paplašināta kvarta)","Tīra kvinta","Maza seksta","Tīra kvarta"]',0,'F–B ir trīs veseli toņi: tritons jeb paplašināta kvarta.'),
('s-h-2','solfeggio','hard','Kāds ir punktētas ceturtdaļnotes ilgums ceturtdaļnošu vienībās?','["1,5","2","2,5","3"]',0,'Punkts pagarina noti par pusi no pamatilguma: 1 + 0,5 = 1,5.'),
('m-e-1','math','easy','Atrisini vienādojumu 3x + 2 = 11.','["x = 3","x = 4","x = 5","x = 9"]',0,'Atņem 2: 3x=9. Dala ar 3: x=3.'),
('m-e-2','math','easy','Cik ir 15% no 200?','["15","20","30","40"]',2,'15% = 0,15 un 0,15 × 200 = 30.'),
('m-m-1','math','medium','Funkcijai f(x)=x²−4x+4 kāda ir parabolas virsotnes x koordināta?','["x = 2","x = −2","x = 4","x = 0"]',0,'Virsotnes x koordināta ir −b/(2a)=4/2=2.'),
('m-m-2','math','medium','Vienkāršo daļu 18/24.','["3/4","2/3","4/5","9/10"]',0,'Skaitītāju un saucēju dala ar 6: 18/24 = 3/4.'),
('m-h-1','math','hard','Atrisini x² − 5x + 6 = 0.','["x = 2 vai x = 3","x = −2 vai x = −3","x = 1 vai x = 6","x = 0 vai x = 5"]',0,'Sadalām reizinātājos: (x−2)(x−3)=0, tātad x=2 vai x=3.'),
('m-h-2','math','hard','Ja 2ˣ = 32, kāda ir x vērtība?','["4","5","6","16"]',1,'32 = 2⁵, tāpēc x=5.'),
('p-e-1','physics','easy','Kāda ir ātruma SI mērvienība?','["m/s","kg","N","J"]',0,'Ātrumu SI sistēmā mēra metros sekundē (m/s).'),
('p-e-2','physics','easy','Kāds spēks pievelk priekšmetus Zemes virsmai?','["Gravitācijas spēks","Berzes spēks","Magnētiskais spēks","Elastības spēks"]',0,'Zemes gravitācijas lauks pievelk ķermeņus Zemes centra virzienā.'),
('p-m-1','physics','medium','Ķermenis 3 sekundēs veic 12 metrus. Kāds ir tā vidējais ātrums?','["4 m/s","9 m/s","15 m/s","36 m/s"]',0,'Vidējais ātrums v=s/t=12/3=4 m/s.'),
('p-m-2','physics','medium','Kāds spēks darbojas uz 2 kg masu, ja paātrinājums ir 3 m/s²?','["6 N","1,5 N","5 N","9 N"]',0,'Pēc Ņūtona otrā likuma F=ma=2×3=6 N.'),
('p-h-1','physics','hard','Ātrums pieaug no 5 m/s līdz 17 m/s 4 sekundēs. Kāds ir paātrinājums?','["3 m/s²","4 m/s²","5,5 m/s²","12 m/s²"]',0,'Paātrinājums a=Δv/Δt=(17−5)/4=3 m/s².'),
('p-h-2','physics','hard','Kādu darbu veic 10 N spēks, pārvietojot ķermeni 4 m spēka virzienā?','["40 J","2,5 J","14 J","0,4 J"]',0,'Darbs W=F·s=10×4=40 J.')
on conflict (id) do update set subject=excluded.subject, difficulty=excluded.difficulty, question=excluded.question, options=excluded.options, correct_answer=excluded.correct_answer, explanation=excluded.explanation, active=true;

create table if not exists public.practice_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null check (subject in ('harmony', 'solfeggio', 'math', 'physics')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_set jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  score smallint,
  question_count smallint
);

create index if not exists practice_attempts_user_created_idx on public.practice_attempts (user_id, created_at desc);
alter table public.practice_question_bank enable row level security;
alter table public.practice_attempts enable row level security;
revoke all on public.practice_question_bank from anon, authenticated;
revoke all on public.practice_attempts from anon, authenticated;

create or replace function public.start_practice_attempt(p_subject text, p_difficulty text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  new_attempt public.practice_attempts%rowtype;
  safe_questions jsonb;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'not authorized'; end if;
  if p_subject not in ('harmony', 'solfeggio', 'math', 'physics') or p_difficulty not in ('easy', 'medium', 'hard') then
    raise exception 'invalid practice selection';
  end if;

  insert into public.practice_attempts (user_id, subject, difficulty, question_set)
  select current_user_id, p_subject, p_difficulty,
    jsonb_agg(jsonb_build_object(
      'id', question_set.id,
      'question', question_set.question,
      'options', question_set.options,
      'correctAnswer', question_set.correct_answer,
      'explanation', question_set.explanation
    ))
  from (
    select id, question, options, correct_answer, explanation
    from public.practice_question_bank
    where subject = p_subject and difficulty = p_difficulty and active
    order by random()
    limit 2
  ) as question_set
  having count(*) = 2
  returning * into new_attempt;

  if new_attempt.id is null then raise exception 'question set unavailable'; end if;

  select jsonb_agg(jsonb_build_object(
    'id', question->>'id',
    'question', question->>'question',
    'options', question->'options'
  )) into safe_questions
  from jsonb_array_elements(new_attempt.question_set) as question;

  return jsonb_build_object(
    'attemptId', new_attempt.id,
    'subject', new_attempt.subject,
    'difficulty', new_attempt.difficulty,
    'questions', safe_questions
  );
end;
$$;

create or replace function public.complete_practice_attempt(p_attempt_id uuid)
returns table (awarded boolean, score integer, question_count integer, total_xp integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  attempt_row public.practice_attempts%rowtype;
  question jsonb;
  calculated_score integer := 0;
  total_questions integer;
  selected_index integer;
  updated_total integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'not authorized'; end if;
  select * into attempt_row from public.practice_attempts
  where id = p_attempt_id and user_id = current_user_id
  for update;
  if not found then raise exception 'attempt not found'; end if;

  total_questions := jsonb_array_length(attempt_row.question_set);
  if attempt_row.completed_at is not null then
    select profiles.xp into updated_total from public.profiles where profiles.id = current_user_id;
    return query select false, attempt_row.score::integer, attempt_row.question_count::integer, coalesce(updated_total,0);
    return;
  end if;
  if attempt_row.expires_at < now() then raise exception 'attempt expired'; end if;
  if jsonb_object_length(attempt_row.answers) <> total_questions then raise exception 'all questions must be answered'; end if;

  for question in select value from jsonb_array_elements(attempt_row.question_set)
  loop
    if not (attempt_row.answers ? (question->>'id')) then raise exception 'missing answer'; end if;
    begin
      selected_index := (attempt_row.answers->>(question->>'id'))::integer;
    exception when others then
      raise exception 'invalid answer selection';
    end;
    if selected_index < 0 or selected_index >= jsonb_array_length(question->'options') then
      raise exception 'answer selection out of bounds';
    end if;
    if selected_index = (question->>'correctAnswer')::integer then calculated_score := calculated_score + 1; end if;
  end loop;

  update public.practice_attempts
  set completed_at = now(), score = calculated_score, question_count = total_questions
  where id = p_attempt_id;

  insert into public.profiles (id, display_name) values (current_user_id, 'Skolēns') on conflict (id) do nothing;
  insert into public.xp_transactions (user_id, amount, reason, subject)
  values (current_user_id, 50, 'Pabeigta prakse', attempt_row.subject);
  update public.profiles set xp = xp + 50 where id = current_user_id returning xp into updated_total;

  return query select true, calculated_score, total_questions, updated_total;
end;
$$;

create or replace function public.submit_practice_answer(
  p_attempt_id uuid,
  p_question_id text,
  p_selected_option integer
)
returns table (correct boolean, explanation text, selected_option integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  attempt_row public.practice_attempts%rowtype;
  question jsonb;
  saved_option integer;
begin
  current_user_id := auth.uid();
  if current_user_id is null then raise exception 'not authorized'; end if;

  select * into attempt_row from public.practice_attempts
  where id = p_attempt_id and user_id = current_user_id
  for update;
  if not found then raise exception 'attempt not found'; end if;
  if attempt_row.expires_at < now() or attempt_row.completed_at is not null then raise exception 'attempt expired'; end if;

  select value into question from jsonb_array_elements(attempt_row.question_set)
  where value->>'id' = p_question_id;
  if question is null then raise exception 'question not found'; end if;

  if attempt_row.answers ? p_question_id then
    saved_option := (attempt_row.answers->>p_question_id)::integer;
  else
    if p_selected_option < 0 or p_selected_option >= jsonb_array_length(question->'options') then
      raise exception 'answer selection out of bounds';
    end if;
    saved_option := p_selected_option;
    update public.practice_attempts
    set answers = answers || jsonb_build_object(p_question_id, saved_option)
    where id = p_attempt_id;
  end if;

  return query select
    saved_option = (question->>'correctAnswer')::integer,
    question->>'explanation',
    saved_option;
end;
$$;

revoke all on function public.start_practice_attempt(text, text) from public, anon;
revoke all on function public.complete_practice_attempt(uuid) from public, anon;
revoke all on function public.submit_practice_answer(uuid, text, integer) from public, anon;
grant execute on function public.start_practice_attempt(text, text) to authenticated;
grant execute on function public.complete_practice_attempt(uuid) to authenticated;
grant execute on function public.submit_practice_answer(uuid, text, integer) to authenticated;


-- ===== schema_plans.sql =====
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
