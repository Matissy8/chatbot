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
('h-e-1','harmony','easy','C mažorā uz kuras pakāpes veido tonikas trijskani?','["V","VII","I","IV"]',2,'Tonika ir skaņkārtas I pakāpe; C mažorā tas ir C–E–G.'),
('h-e-2','harmony','easy','C mažorā kuri toņi veido C mažora trijskani?','["D–F–A","C–D–G","G–H–D","C–E–G"]',3,'C mažora trijskanis veidots no pamatskaņas C, lielās tercas E un tīrās kvintas G.'),
('h-m-1','harmony','medium','Kuri pakāpes toņi veido dominantes septakordu (D7)?','["I, III, V, VII","V, VII, II, IV","IV, VI, I, III","II, IV, VI, I"]',1,'D7 būvē uz V pakāpes, pievienojot akorda toņus pa tercām: V–VII–II–IV.'),
('h-m-2','harmony','medium','Kā C mažorā parasti atrisinās D7 septīma (F)?','["Paliek F","Uz G","Uz C, lēcienā","Uz E, par pakāpi lejup"]',3,'Septīma F atrisinās lejup uz E — tonikas tercu.'),
('h-h-1','harmony','hard','Kā C mažorā atrisinās vadošais tonis H, kad D7 pāriet uz toniku?','["Uz G, lejup par sekstu","Paliek H","Uz C, augšup par pustoni","Uz A, lejup par toni"]',2,'Vadošais tonis H virzās augšup par pustoni uz toniku C.'),
('h-h-2','harmony','hard','Kāda ir D7 funkcija C mažorā?','["Tonikas funkcija","Dominantes funkcija","Vadošā akorda funkcija","Subdominantes funkcija"]',1,'D7 ir dominantes septakords un rada virzību uz toniku.'),
('s-e-1','solfeggio','easy','C mažorā kā sauc skaņu vienu pakāpi virs tonikas?','["Sol","Si","Fa","Re"]',3,'C mažora otrā pakāpe ir D jeb Re.'),
('s-e-2','solfeggio','easy','Cik ceturtdaļnošu ilgst pusnote?','["1","2","3","4"]',1,'Pusnote ilgst divas ceturtdaļnotis.'),
('s-m-1','solfeggio','medium','Kāds intervāls ir starp C un G?','["Liela terca","Tīra kvarta","Tīra kvinta","Maza seksta"]',2,'C–G ir tīras kvintas intervāls.'),
('s-m-2','solfeggio','medium','Cik astotdaļnošu ietilpst vienā ceturtdaļnotī?','["2","3","4","8"]',0,'Viena ceturtdaļnote dalās divās astotdaļnotīs.'),
('s-h-1','solfeggio','hard','Kāds intervāls veidojas no F līdz H?','["Tīra kvinta","Maza seksta","Tīra kvarta","Tritons (paplašināta kvarta)"]',3,'F–H ir trīs veseli toņi: tritons jeb paplašināta kvarta.'),
('s-h-2','solfeggio','hard','Kāds ir punktētas ceturtdaļnotes ilgums ceturtdaļnošu vienībās?','["1,5","2","2,5","3"]',0,'Punkts pagarina noti par pusi no pamatilguma: 1 + 0,5 = 1,5.'),
('m-e-1','math','easy','Cik ceturtdaļnošu ir veselā notī?','["2","3","4","8"]',2,'Veselā nota ilgst četras ceturtdaļnotis.'),
('m-e-2','math','easy','Cik astotdaļnošu ir vienā pusnotī?','["2","4","6","8"]',1,'Pusnote ir divas ceturtdaļnotis, bet katra ceturtdaļnote ir divas astotdaļnotis, tātad četras.'),
('m-m-1','math','medium','Cik šešpadsmitdaļnošu ietilpst vienā ceturtdaļnotī?','["2","4","6","8"]',1,'Ceturtdaļnote ir divas astotdaļnotis jeb četras šešpadsmitdaļnotis.'),
('m-m-2','math','medium','Cik ceturtdaļnošu ilgst punktēta pusnote?','["3","4","5","6"]',0,'Pusnote ir 2 ceturtdaļnotis, punkts pieliek pusi: 2 + 1 = 3.'),
('m-h-1','math','hard','Triole ceturtdaļnotes ilgumā: cik ceturtdaļnotes ilgst viena triolas astotdaļnote?','["1/4","1/2","2/3","1/3"]',3,'Triole sadala ceturtdaļnoti trīs vienādās daļās, tātad katra ir 1/3 ceturtdaļnotes.'),
('m-h-2','math','hard','Cik šešpadsmitdaļnošu ilgst punktēta astotdaļnote?','["2","3","4","6"]',1,'Astotdaļnote ir 2 šešpadsmitdaļnotis, punkts pieliek pusi: 2 + 1 = 3.'),
('p-e-1','physics','easy','Kādā mērvienībā mēra skaņas frekvenci?','["Ņūtoni (N)","Herci (Hz)","Metri sekundē (m/s)","Vati (W)"]',1,'Frekvenci mēra hercos (Hz): tie ir svārstību skaits sekundē.'),
('p-e-2','physics','easy','Kas nosaka skaņas augstumu?','["Svārstību amplitūda","Instrumenta krāsa","Svārstību frekvence","Skaņas ilgums"]',2,'Jo lielāka svārstību frekvence, jo augstāka skaņa.'),
('p-m-1','physics','medium','Kāda ir etalona skaņas a1 frekvence?','["220 Hz","440 Hz","880 Hz","261 Hz"]',1,'Etalona skaņa a1 ir 440 Hz.'),
('p-m-2','physics','medium','Kā mainās frekvence, ja skaņu paaugstina par oktāvu?','["Samazinās uz pusi","Nemainās","Dubultojas","Pieaug par 10 Hz"]',2,'Oktāva atbilst frekvenču attiecībai 2 : 1, tātad frekvence dubultojas.'),
('p-h-1','physics','hard','Kāda ir skaņas frekvence, kas par oktāvu augstāka par 440 Hz?','["660 Hz","880 Hz","445 Hz","220 Hz"]',1,'Oktāvu augstāk frekvence dubultojas: 440 × 2 = 880 Hz.'),
('p-h-2','physics','hard','Kā sauc skaņas daļu, kuras frekvence ir veselu skaitļu reizinājums no pamattona frekvences?','["Pauze","Takts","Virstonis","Kadence"]',2,'Šādas daļas sauc par virstoņiem; to sastāvs veido tembru.'),
('h-e-3','harmony','easy','Kāda ir C mažora skaņkārtas V pakāpe?','["F","A","G","H"]',2,'C mažorā pakāpes ir C–D–E–F–G–A–H; piektā ir G.'),
('h-e-4','harmony','easy','Kāds ir C mažora subdominantes trijskanis?','["G–H–D","F–A–C","D–F–A","E–G–H"]',1,'Subdominante veidota uz IV pakāpes: F–A–C.'),
('h-m-3','harmony','medium','Kāds ir C mažora dominantes trijskanis?','["F–A–C","C–E–G","E–G–H","G–H–D"]',3,'Dominante veidota uz V pakāpes: G–H–D.'),
('h-m-4','harmony','medium','Kāda ir pamata kadences secība funkcionālajā harmonijā?','["T–D–S–T","T–S–D–T","S–T–D–S","D–T–S–D"]',1,'Pilnā kadence: tonika – subdominante – dominante – tonika.'),
('h-h-3','harmony','hard','Kuras paralēles ir aizliegtas četrbalsīgā faktūrā starp divām balsīm?','["Paralēlas tercas un sekstas","Paralēlas sekstakordi","Paralēlas kvintas un oktāvas","Visi paralēlie intervāli"]',2,'Klasiskajā četrbalsīgajā faktūrā neatļauj paralēlas tīrās kvintas un oktāvas starp divām balsīm.'),
('h-h-4','harmony','hard','Kā sauc dominantes septakorda apvērsumu ar septīmu basā?','["Terckvartakords","Kvintsekstakords","Sekundakords","Septakords pamatformā"]',2,'D7 trešais apvērsums ar septīmu basā ir sekundakords (D2).'),
('s-e-3','solfeggio','easy','Kā sauc intervālu, kura attālums ir astoņas pakāpes?','["Septīma","Oktāva","Seksta","Kvinta"]',1,'Astoņu pakāpju attālums ir oktāva.'),
('s-e-4','solfeggio','easy','Kurš taktsmērs nozīmē trīs ceturtdaļnotis taktī?','["4/4","2/4","3/4","6/8"]',2,'3/4 — taktī ir trīs ceturtdaļnotis.'),
('s-m-3','solfeggio','medium','Kāds intervāls ir starp C un E?','["Maza terca","Tīra kvarta","Liela terca","Liela seksta"]',2,'C–E ir divi veseli toņi — liela terca.'),
('s-m-4','solfeggio','medium','Cik pustoņu ir tīrā kvintā?','["5","6","8","7"]',3,'Tīra kvinta ir 3,5 toņi jeb 7 pustoņi.'),
('s-h-3','solfeggio','hard','Kāds intervāls ir starp C un A?','["Maza seksta","Liela seksta","Liela septīma","Tīra kvinta"]',1,'C–A ir 4,5 toņi jeb 9 pustoņi — liela seksta.'),
('s-h-4','solfeggio','hard','Cik pustoņu ir mazajā septīmā?','["9","11","10","12"]',2,'Maza septīma ir 10 pustoņi, liela septīma — 11.'),
('m-e-3','math','easy','Cik astotdaļnošu ietilpst 4/4 taktī?','["2","4","6","8"]',3,'4/4 taktī ir četras ceturtdaļnotis, tātad astoņas astotdaļnotis.'),
('m-e-4','math','easy','Cik ceturtdaļnošu ir 6/4 taktī?','["3","4","6","8"]',2,'6/4 taktī ir sešas ceturtdaļnotis.'),
('m-m-3','math','medium','Cik astotdaļnošu ir 3/4 taktī?','["4","6","8","12"]',1,'3/4 taktī ir trīs ceturtdaļnotis jeb sešas astotdaļnotis.'),
('m-m-4','math','medium','Kāds ir 2/2 takts kopējais ilgums ceturtdaļnošu vienībās?','["2","3","4","8"]',2,'2/2 taktī ir divas pusnotis, tas ir četras ceturtdaļnotis.'),
('m-h-3','math','hard','Cik 3/4 taktis aizņem 24 ceturtdaļnotes?','["6","12","8","24"]',2,'24 ÷ 3 = 8 taktis.'),
('m-h-4','math','hard','Kā parasti grupē sešas astotdaļnotes 6/8 taktī?','["2 + 4","4 + 2","1 + 5","3 + 3"]',3,'6/8 takti parasti skaita divās grupās pa trīs astotdaļnotēm.'),
('p-e-3','physics','easy','Kas nosaka skaņas skaļumu?','["Frekvence","Tembrs","Tonalitāte","Amplitūda"]',3,'Jo lielāka svārstību amplitūda, jo skaļāka skaņa.'),
('p-e-4','physics','easy','Kādā vidē skaņa nevar izplatīties?','["Vakuumā","Gaisā","Ūdenī","Metālā"]',0,'Skaņai vajadzīga vide (gaiss, šķidrums vai ciets ķermenis); vakuumā tās nav.'),
('p-m-3','physics','medium','Kas veido instrumenta tembru?','["Tikai skaņas skaļums","Takts izmērs","Tikai pamattona frekvence","Virstoņu sastāvs"]',3,'Tembru nosaka virstoņu sastāvs un to savstarpējais skaļums.'),
('p-m-4','physics','medium','Kāds ir aptuvenais skaņas ātrums gaisā istabas temperatūrā?','["340 m/s","34 m/s","3400 m/s","300 000 km/s"]',0,'Skaņa gaisā izplatās aptuveni 340 metrus sekundē.'),
('p-h-3','physics','hard','Stīga svārstās ar pamattona frekvenci 220 Hz. Kāda ir tās otrā harmoniskā frekvence?','["110 Hz","330 Hz","660 Hz","440 Hz"]',3,'Otrā harmoniskā ir 2 × 220 = 440 Hz, tā ir oktāva virs pamattona.'),
('p-h-4','physics','hard','Kāda frekvenču attiecība atbilst tīrajai kvintai?','["2 : 1","3 : 2","4 : 3","5 : 4"]',1,'Tīrā kvinta atbilst frekvenču attiecībai 3 : 2.')
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

drop function if exists public.complete_practice_attempt(uuid);

create or replace function public.complete_practice_attempt(p_attempt_id uuid)
returns table (awarded boolean, score integer, question_count integer, total_xp integer, xp_awarded integer)
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
  earned_xp integer;
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
    return query select false, attempt_row.score::integer, attempt_row.question_count::integer, coalesce(updated_total,0), 0;
    return;
  end if;
  if attempt_row.expires_at < now() then raise exception 'attempt expired'; end if;
  if (select count(*) from jsonb_object_keys(attempt_row.answers)) <> total_questions then raise exception 'all questions must be answered'; end if;

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

  -- Up to 50 XP, proportional to correct answers; a run with no correct answers earns nothing.
  earned_xp := (calculated_score * 50) / greatest(total_questions, 1);
  insert into public.profiles (id, display_name) values (current_user_id, 'Skolēns') on conflict (id) do nothing;
  if earned_xp > 0 then
    insert into public.xp_transactions (user_id, amount, reason, subject)
    values (current_user_id, earned_xp, 'Pabeigta prakse', attempt_row.subject);
    update public.profiles set xp = xp + earned_xp where id = current_user_id returning xp into updated_total;
  else
    select profiles.xp into updated_total from public.profiles where profiles.id = current_user_id;
  end if;

  return query select true, calculated_score, total_questions, coalesce(updated_total, 0), earned_xp;
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
