create table if not exists early_access_requests (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text not null,
  platform    text not null,
  challenge   text,
  created_at  timestamptz not null default now()
);

create index if not exists early_access_email_idx on early_access_requests (email);
