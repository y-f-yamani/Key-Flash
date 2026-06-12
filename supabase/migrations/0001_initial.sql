-- 0001_initial.sql — user-data schema (the shortcut catalog ships as code; ADR-0002).
-- Conventions: snake_case, timestamptz, RLS default-deny on every table.

create extension if not exists citext;

-- ───────────────────────────── identity ─────────────────────────────

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     citext unique not null check (length(username) between 3 and 24),
  display_name text not null default '',
  locale       text not null default 'en' check (locale in ('en', 'ar')),
  country      text,
  created_at   timestamptz not null default now()
);

create table user_stats (
  user_id          uuid primary key references profiles (id) on delete cascade,
  total_xp         bigint not null default 0 check (total_xp >= 0),
  level            int not null default 1 check (level >= 1),
  current_streak   int not null default 0,
  longest_streak   int not null default 0,
  last_active_date date,
  timezone         text not null default 'UTC',
  updated_at       timestamptz not null default now()
);

-- ───────────────────────────── learning ─────────────────────────────

-- Append-only XP ledger; user_stats is a projection of this table.
create table xp_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references profiles (id) on delete cascade,
  amount     int not null check (amount > 0),
  source     text not null,
  source_id  text,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on xp_events (user_id, created_at desc);

-- SRS + aggregate performance per (user, shortcut). shortcut_id references
-- the code-shipped catalog (e.g. 'win11.win-e'); ids are stable forever.
create table card_states (
  user_id       uuid not null references profiles (id) on delete cascade,
  shortcut_id   text not null,
  ease          real not null default 2.5 check (ease >= 1.3),
  interval_days real not null default 0,
  due_at        timestamptz not null default now(),
  reps          int not null default 0,
  lapses        int not null default 0,
  attempts      int not null default 0,
  correct       int not null default 0,
  best_ms       int,
  avg_ms        int,
  updated_at    timestamptz not null default now(),
  primary key (user_id, shortcut_id)
);
create index card_states_due_idx on card_states (user_id, due_at);

create table practice_sessions (
  id          uuid primary key,
  user_id     uuid not null references profiles (id) on delete cascade,
  domain_slug text not null,
  kind        text not null check (kind in ('lesson', 'review', 'flashcards')),
  drills      int not null,
  correct     int not null,
  xp_earned   int not null default 0,
  duration_ms int not null,
  started_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index practice_sessions_user_idx on practice_sessions (user_id, created_at desc);

-- One row per active day; streak source of truth (user-timezone dates).
create table daily_activity (
  user_id       uuid not null references profiles (id) on delete cascade,
  activity_date date not null,
  xp_earned     int not null default 0,
  goal_xp       int not null default 50,
  goal_met      boolean not null default false,
  primary key (user_id, activity_date)
);

create table user_achievements (
  user_id          uuid not null references profiles (id) on delete cascade,
  achievement_code text not null,
  unlocked_at      timestamptz not null default now(),
  primary key (user_id, achievement_code)
);

-- ──────────────────────────── competition ───────────────────────────

-- Immutable once inserted (no UPDATE policy). Server re-scores the timeline
-- before insert; quarantined runs are excluded from leaderboards.
create table arena_runs (
  id              uuid primary key,
  user_id         uuid not null references profiles (id) on delete cascade,
  domain_slug     text not null,
  mode            text not null check (mode in
                    ('sprint', 'time-attack', 'survival', 'boss-rush', 'combo-rush', 'reaction')),
  score           int not null check (score >= 0),
  accuracy        real not null check (accuracy between 0 and 1),
  avg_reaction_ms int not null,
  consistency     real not null check (consistency between 0 and 1),
  max_combo       int not null default 0,
  duration_ms     int not null,
  timeline        jsonb not null,
  client_version  text not null default '',
  quarantined     boolean not null default false,
  created_at      timestamptz not null default now()
);
create index arena_runs_board_idx on arena_runs (domain_slug, mode, score desc)
  where not quarantined;
create index arena_runs_user_idx on arena_runs (user_id, mode, created_at desc);

create table ratings (
  user_id     uuid not null references profiles (id) on delete cascade,
  domain_slug text not null,
  rating      real not null default 1500,
  rd          real not null default 350,
  volatility  real not null default 0.06,
  tier        text not null default 'bronze' check (tier in
                ('bronze','silver','gold','platinum','diamond','master','grandmaster','legend')),
  season      int not null default 1,
  updated_at  timestamptz not null default now(),
  primary key (user_id, domain_slug)
);
create index ratings_ladder_idx on ratings (domain_slug, rating desc);

create table matches (
  id          uuid primary key,
  domain_slug text not null,
  mode        text not null default 'duel',
  seed        bigint not null,
  status      text not null default 'pending' check (status in
                ('pending', 'active', 'finished', 'abandoned')),
  started_at  timestamptz,
  finished_at timestamptz,
  created_at  timestamptz not null default now()
);

create table match_players (
  match_id      uuid not null references matches (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  score         int not null default 0,
  accuracy      real not null default 0,
  placement     int,
  rating_before real,
  rating_after  real,
  primary key (match_id, user_id)
);

-- ───────────────────────────── platform ─────────────────────────────

create table subscriptions (
  user_id                uuid primary key references profiles (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan                   text not null default 'free' check (plan in ('free', 'monthly', 'yearly')),
  status                 text not null default 'active',
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);

create table feature_flags (
  key      text primary key,
  enabled  boolean not null default false,
  audience jsonb not null default '{}'::jsonb
);

create table analytics_events (
  id         bigint generated always as identity primary key,
  user_id    uuid references profiles (id) on delete set null,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index analytics_events_time_idx on analytics_events (created_at);

-- ──────────────────────────── functions ─────────────────────────────

-- Awards XP atomically: ledger insert + stats projection update.
-- Called by route handlers (service role) after server-side validation.
create or replace function award_xp(
  p_user_id uuid, p_amount int, p_source text, p_source_id text default null
) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  v_event_id bigint;
begin
  insert into xp_events (user_id, amount, source, source_id)
  values (p_user_id, p_amount, p_source, p_source_id)
  returning id into v_event_id;

  update user_stats
  set total_xp = total_xp + p_amount,
      level = 1 + floor(power(greatest(total_xp + p_amount, 0) / 100.0, 1.0 / 1.4))::int,
      updated_at = now()
  where user_id = p_user_id;

  return v_event_id;
end;
$$;

-- Auto-provision profile + stats on signup.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, username)
  values (new.id, 'user_' || substr(replace(new.id::text, '-', ''), 1, 12));
  insert into user_stats (user_id) values (new.id);
  insert into subscriptions (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─────────────────────────────── RLS ────────────────────────────────

alter table profiles          enable row level security;
alter table user_stats        enable row level security;
alter table xp_events         enable row level security;
alter table card_states       enable row level security;
alter table practice_sessions enable row level security;
alter table daily_activity    enable row level security;
alter table user_achievements enable row level security;
alter table arena_runs        enable row level security;
alter table ratings           enable row level security;
alter table matches           enable row level security;
alter table match_players     enable row level security;
alter table subscriptions     enable row level security;
alter table feature_flags     enable row level security;
alter table analytics_events  enable row level security;

-- Profiles are public (leaderboards need names); everything else is own-data.
create policy "profiles are viewable by everyone"
  on profiles for select using (true);
create policy "users update own profile"
  on profiles for update using (auth.uid() = id);

create policy "own stats"        on user_stats        for select using (auth.uid() = user_id);
create policy "own xp"           on xp_events         for select using (auth.uid() = user_id);
create policy "own cards"        on card_states       for select using (auth.uid() = user_id);
create policy "upsert own cards" on card_states       for insert with check (auth.uid() = user_id);
create policy "update own cards" on card_states       for update using (auth.uid() = user_id);
create policy "own sessions"     on practice_sessions for select using (auth.uid() = user_id);
create policy "own activity"     on daily_activity    for select using (auth.uid() = user_id);
create policy "own achievements" on user_achievements for select using (auth.uid() = user_id);
create policy "own runs"         on arena_runs        for select using (auth.uid() = user_id);
create policy "own rating"       on ratings           for select using (auth.uid() = user_id);
create policy "own subscription" on subscriptions     for select using (auth.uid() = user_id);
create policy "flags are public" on feature_flags     for select using (true);
-- Scored writes (runs, XP, matches) go through route handlers with the
-- service role after validation — no client INSERT policies for them.

-- Public leaderboard access without exposing private columns.
create or replace function leaderboard(
  p_domain text, p_mode text, p_limit int default 50, p_offset int default 0
) returns table (username citext, display_name text, score int, accuracy real, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select p.username, p.display_name, r.score, r.accuracy, r.created_at
  from arena_runs r
  join profiles p on p.id = r.user_id
  where r.domain_slug = p_domain and r.mode = p_mode and not r.quarantined
  order by r.score desc, r.created_at asc
  limit least(p_limit, 100) offset p_offset;
$$;
