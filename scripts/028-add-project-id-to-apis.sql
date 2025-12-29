-- Add project_id to apis table and update uniqueness constraint
alter table apis add column if not exists project_id uuid;

-- Update uniquely constraint to include project_id
-- We need to drop the old unique constraint first. 
-- Assuming it's named 'apis_path_method_key' which is the default for unique(path, method)
alter table apis drop constraint if exists apis_path_method_key;
alter table apis add constraint apis_project_path_method_unique unique(project_id, path, method);

-- Add foreign key
alter table apis add constraint apis_project_id_fkey foreign key (project_id) references projects(id) on delete cascade;

-- Update RLS policies to be project-aware
drop policy if exists "Apis are viewable by everyone" on apis;
create policy "Apis are viewable by project members"
  on apis for select
  using (
    exists (
      select 1 from project_members
      where project_id = apis.project_id
      and user_id = (select id from users where user_uuid = auth.uid())
    )
    or
    exists (
      select 1 from projects
      where id = apis.project_id
      and is_public = true
    )
  );

drop policy if exists "Apis are insertable by admins" on apis;
create policy "Apis are insertable by project admins"
  on apis for insert
  with check (
    exists (
      select 1 from project_members
      where project_id = apis.project_id
      and user_id = (select id from users where user_uuid = auth.uid())
      and access_level >= 3
    )
  );

drop policy if exists "Apis are updatable by admins" on apis;
create policy "Apis are updatable by project admins"
  on apis for update
  using (
    exists (
      select 1 from project_members
      where project_id = apis.project_id
      and user_id = (select id from users where user_uuid = auth.uid())
      and access_level >= 3
    )
  );

drop policy if exists "Apis are deletable by admins" on apis;
create policy "Apis are deletable by project admins"
  on apis for delete
  using (
    exists (
      select 1 from project_members
      where project_id = apis.project_id
      and user_id = (select id from users where user_uuid = auth.uid())
      and access_level >= 3
    )
  );
