-- ─── Extensions ───────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles ─────────────────────────────────────────────────────────────────
-- Mirrors Clerk users. Populated via webhook on user.created.
create table profiles (
  id          text primary key,          -- Clerk user ID (e.g. "user_abc123")
  email       text not null unique,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Connected Platforms ──────────────────────────────────────────────────────
create table connected_platforms (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null references profiles(id) on delete cascade,
  platform      text not null,            -- 'mailchimp' | 'klaviyo' | 'sfmc' | 'sendgrid'
  access_token  text,
  refresh_token text,
  token_expires_at timestamptz,
  metadata      jsonb not null default '{}',  -- platform-specific config (list IDs, etc.)
  connected_at  timestamptz not null default now(),
  unique (user_id, platform)
);

-- ─── Campaigns ────────────────────────────────────────────────────────────────
create table campaigns (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references profiles(id) on delete cascade,
  platform_id  uuid references connected_platforms(id) on delete set null,
  external_id  text,                      -- ID from the email platform
  name         text not null,
  subject      text,
  status       text not null default 'sent'
                 check (status in ('draft', 'scheduled', 'sent', 'cancelled')),
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id, platform_id, external_id)
);

-- ─── Campaign Metrics ─────────────────────────────────────────────────────────
create table campaign_metrics (
  id               uuid primary key default gen_random_uuid(),
  campaign_id      uuid not null references campaigns(id) on delete cascade unique,
  total_sent       integer not null default 0,
  opens            integer not null default 0,
  unique_opens     integer not null default 0,
  clicks           integer not null default 0,
  unique_clicks    integer not null default 0,
  unsubscribes     integer not null default 0,
  bounces          integer not null default 0,
  revenue          numeric(14, 2) not null default 0,
  -- Computed rates (stored for fast querying; recalculate on sync)
  open_rate        numeric(6, 4),         -- e.g. 0.2840 = 28.40%
  ctr              numeric(6, 4),
  bounce_rate      numeric(6, 4),
  unsubscribe_rate numeric(6, 4),
  updated_at       timestamptz not null default now()
);

-- ─── Contacts ─────────────────────────────────────────────────────────────────
create table contacts (
  id             uuid primary key default gen_random_uuid(),
  user_id        text not null references profiles(id) on delete cascade,
  email          text not null,
  status         text not null default 'active'
                   check (status in ('active', 'unsubscribed', 'bounced', 'lapsed')),
  last_opened_at timestamptz,
  last_clicked_at timestamptz,
  created_at     timestamptz not null default now(),
  unique (user_id, email)
);

-- ─── Insights ─────────────────────────────────────────────────────────────────
create table insights (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null references profiles(id) on delete cascade,
  campaign_id  uuid references campaigns(id) on delete cascade,
  type         text not null check (type in ('opportunity', 'warning', 'critical', 'positive')),
  title        text not null,
  description  text,
  impact       text,                      -- human-readable, e.g. "+$3.2k"
  impact_score integer check (impact_score between 0 and 100),
  effort       text check (effort in ('Low', 'Medium', 'High')),
  status       text not null default 'open'
                 check (status in ('open', 'dismissed', 'actioned')),
  created_at   timestamptz not null default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
create index on campaigns (user_id, sent_at desc);
create index on campaign_metrics (campaign_id);
create index on contacts (user_id, status);
create index on insights (user_id, status, created_at desc);

-- ─── Updated-at trigger ───────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

create trigger campaign_metrics_updated_at
  before update on campaign_metrics
  for each row execute function set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
alter table profiles           enable row level security;
alter table connected_platforms enable row level security;
alter table campaigns          enable row level security;
alter table campaign_metrics   enable row level security;
alter table contacts           enable row level security;
alter table insights           enable row level security;

-- Helper: current Clerk user ID stored in JWT claim "sub"
create or replace function auth_user_id() returns text
  language sql stable
  as $$ select nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '') $$;

-- Profiles: users can only read/update their own row
create policy "profiles: own row" on profiles
  for all using (id = auth_user_id());

-- Connected platforms
create policy "platforms: own rows" on connected_platforms
  for all using (user_id = auth_user_id());

-- Campaigns
create policy "campaigns: own rows" on campaigns
  for all using (user_id = auth_user_id());

-- Campaign metrics (access via campaign ownership)
create policy "metrics: own campaigns" on campaign_metrics
  for all using (
    exists (
      select 1 from campaigns c
      where c.id = campaign_metrics.campaign_id
        and c.user_id = auth_user_id()
    )
  );

-- Contacts
create policy "contacts: own rows" on contacts
  for all using (user_id = auth_user_id());

-- Insights
create policy "insights: own rows" on insights
  for all using (user_id = auth_user_id());

-- Service role bypass (used by sync jobs / webhooks — bypasses RLS automatically)
