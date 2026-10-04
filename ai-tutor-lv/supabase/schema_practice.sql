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
