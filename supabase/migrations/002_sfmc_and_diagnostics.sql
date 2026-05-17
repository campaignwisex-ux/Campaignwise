-- ─── Extend profiles ──────────────────────────────────────────────────────────
alter table profiles add column if not exists company_name text;

-- ─── Extend campaign_metrics with SFMC fields ─────────────────────────────────
-- Split bounces into hard/soft, add spam complaints, CTOR, delivery rate
alter table campaign_metrics
  add column if not exists delivered           integer not null default 0,
  add column if not exists hard_bounces        integer not null default 0,
  add column if not exists soft_bounces        integer not null default 0,
  add column if not exists spam_complaints     integer not null default 0,
  add column if not exists ctor                numeric(6,4),
  add column if not exists spam_complaint_rate numeric(6,4),
  add column if not exists delivery_rate       numeric(6,4);

-- ─── Workspaces ───────────────────────────────────────────────────────────────
-- Stores SFMC connection config per Business Unit.
-- client_secret_enc is AES-256 encrypted at the application layer before insert.
create table if not exists workspaces (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null references profiles(id) on delete cascade,
  platform          text not null default 'sfmc',
  subdomain         text not null,
  client_id         text not null,
  client_secret_enc text not null,
  bu_name           text,
  account_id        text,
  is_active         boolean not null default true,
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz,
  unique (user_id, subdomain)
);

-- ─── Benchmarks ───────────────────────────────────────────────────────────────
create table if not exists benchmarks (
  id                 uuid primary key default gen_random_uuid(),
  campaign_id        uuid not null references campaigns(id) on delete cascade unique,
  -- Rolling 90-day account averages for this user
  acct_open_rate     numeric(6,4),
  acct_ctr           numeric(6,4),
  acct_ctor          numeric(6,4),
  acct_bounce_rate   numeric(6,4),
  acct_unsub_rate    numeric(6,4),
  acct_spam_rate     numeric(6,4),
  acct_delivery_rate numeric(6,4),
  -- Industry averages (static / periodically refreshed)
  ind_open_rate      numeric(6,4),
  ind_ctr            numeric(6,4),
  ind_ctor           numeric(6,4),
  ind_bounce_rate    numeric(6,4),
  ind_unsub_rate     numeric(6,4),
  ind_spam_rate      numeric(6,4),
  ind_delivery_rate  numeric(6,4),
  updated_at         timestamptz not null default now()
);

-- ─── Health Scores ────────────────────────────────────────────────────────────
-- One row per campaign. component_scores JSON holds each weighted sub-score.
create table if not exists health_scores (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns(id) on delete cascade unique,
  score            integer not null check (score between 0 and 100),
  previous_score   integer check (previous_score between 0 and 100),
  delta            integer,
  -- Keys: hard_bounce, spam_complaint, open_rate, ctr, unsubscribe, ctor, delivery
  component_scores jsonb not null default '{}',
  grade            text check (grade in ('A','B','C','D','F')),
  calculated_at    timestamptz not null default now()
);

-- ─── Insight Results ──────────────────────────────────────────────────────────
-- Three-layer diagnostic output. One or many rows per campaign.
create table if not exists insight_results (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade,
  layer           integer not null check (layer in (1, 2, 3)),
  -- 1 = Delivery Health  2 = Engagement Quality  3 = Execution Logic
  severity        text not null check (severity in ('critical','warning','info','positive')),
  diagnosis       text not null,
  recommendation  text not null,
  metric_key      text,
  metric_value    numeric,
  benchmark_value numeric,
  created_at      timestamptz not null default now()
);

-- ─── Deliverability Checks ────────────────────────────────────────────────────
create table if not exists deliverability_checks (
  id              uuid primary key default gen_random_uuid(),
  campaign_id     uuid not null references campaigns(id) on delete cascade unique,
  spf             text not null default 'unknown'
                    check (spf in ('pass','fail','softfail','neutral','unknown')),
  dkim            text not null default 'unknown'
                    check (dkim in ('pass','fail','unknown')),
  dmarc           text not null default 'unknown'
                    check (dmarc in ('pass','fail','unknown')),
  sender_score    integer check (sender_score between 0 and 100),
  blocklist_clean boolean not null default true,
  blocklists_hit  text[],
  checked_at      timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists workspaces_user_id_idx          on workspaces (user_id);
create index if not exists health_scores_campaign_id_idx   on health_scores (campaign_id);
create index if not exists insight_results_campaign_idx    on insight_results (campaign_id, layer);
create index if not exists deliverability_campaign_idx     on deliverability_checks (campaign_id);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
create trigger benchmarks_updated_at
  before update on benchmarks
  for each row execute function set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table workspaces            enable row level security;
alter table benchmarks            enable row level security;
alter table health_scores         enable row level security;
alter table insight_results       enable row level security;
alter table deliverability_checks enable row level security;

create policy "workspaces: own rows" on workspaces
  for all using (user_id = auth_user_id());

create policy "benchmarks: own campaigns" on benchmarks
  for all using (
    exists (select 1 from campaigns c
            where c.id = benchmarks.campaign_id and c.user_id = auth_user_id())
  );

create policy "health_scores: own campaigns" on health_scores
  for all using (
    exists (select 1 from campaigns c
            where c.id = health_scores.campaign_id and c.user_id = auth_user_id())
  );

create policy "insight_results: own campaigns" on insight_results
  for all using (
    exists (select 1 from campaigns c
            where c.id = insight_results.campaign_id and c.user_id = auth_user_id())
  );

create policy "deliverability_checks: own campaigns" on deliverability_checks
  for all using (
    exists (select 1 from campaigns c
            where c.id = deliverability_checks.campaign_id and c.user_id = auth_user_id())
  );
