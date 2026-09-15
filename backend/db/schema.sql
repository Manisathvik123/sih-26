-- PRAHARI Supabase schema (single source of truth).
-- Run this in the Supabase SQL editor.

create table if not exists personnel (
  id text primary key,
  name text,
  department text,
  overtime_hours int,
  blood_pressure text,
  pulse_rate int
);

create table if not exists wellness_checkins (
  id uuid default gen_random_uuid() primary key,
  personnel_id text references personnel(id),
  stress_level int,
  sleep_quality int,
  mood int,
  energy int,
  fatigue int,
  note text,
  created_at timestamp default now()
);

create table if not exists stress_analysis (
  id uuid default gen_random_uuid() primary key,
  checkin_id uuid references wellness_checkins(id),
  risk_score int,
  risk_level text,
  factor_breakdown jsonb,
  ai_explanation jsonb,
  created_at timestamp default now()
);

create table if not exists recommendations (
  id uuid default gen_random_uuid() primary key,
  analysis_id uuid references stress_analysis(id),
  summary text,
  actions jsonb,
  priority text,
  created_at timestamp default now()
);

-- Prototype has no auth: enable RLS but grant full access to the anon role
-- via permissive policies. (Do NOT disable RLS — keep it on for best practice.)
alter table personnel enable row level security;
alter table wellness_checkins enable row level security;
alter table stress_analysis enable row level security;
alter table recommendations enable row level security;

create policy "personnel_anon"      on personnel          for all using (true) with check (true);
create policy "checkins_anon"       on wellness_checkins  for all using (true) with check (true);
create policy "analysis_anon"       on stress_analysis    for all using (true) with check (true);
create policy "recommendations_anon" on recommendations  for all using (true) with check (true);