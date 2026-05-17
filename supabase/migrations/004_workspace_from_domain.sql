-- The from_domain is the brand email domain used in SFMC sends (e.g. "acmecorp.com").
-- Needed for SPF / DKIM / DMARC DNS lookups during deliverability checks.
alter table workspaces
  add column if not exists from_domain text;
