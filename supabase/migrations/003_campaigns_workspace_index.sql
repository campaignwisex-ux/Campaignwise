-- The original unique constraint (user_id, platform_id, external_id) breaks when
-- platform_id is NULL (workspace-based SFMC connections), because NULL != NULL.
-- Add a partial unique index that works when external_id is present.
create unique index if not exists campaigns_user_external_unique
  on campaigns (user_id, external_id)
  where external_id is not null;

-- Link campaigns to the workspace they were synced from.
alter table campaigns
  add column if not exists workspace_id uuid references workspaces(id) on delete set null;

create index if not exists campaigns_workspace_id_idx on campaigns (workspace_id);
