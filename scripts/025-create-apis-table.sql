
create table if not exists apis (
  id uuid default gen_random_uuid() primary key,
  path text not null,
  method text not null,
  summary text,
  description text,
  tags text[],
  parameters jsonb,
  request_body jsonb,
  responses jsonb,
  original_spec jsonb, -- Store the full original spec object for this path/method just in case
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  unique(path, method)
);

-- RLS
alter table apis enable row level security;

create policy "Apis are viewable by everyone"
  on apis for select
  using ( true );

create policy "Apis are insertable by admins"
  on apis for insert
  with check (
    exists (
      select 1 from users
      where user_uuid = auth.uid()
      and access_level >= 3
    )
  );

create policy "Apis are updatable by admins"
  on apis for update
  using (
    exists (
      select 1 from users
      where user_uuid = auth.uid()
      and access_level >= 3
    )
  );

create policy "Apis are deletable by admins"
  on apis for delete
  using (
    exists (
      select 1 from users
      where user_uuid = auth.uid()
      and access_level >= 3
    )
  );
