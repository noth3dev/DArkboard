-- Add components column to apis table for storing OpenAPI components (schemas, responses, etc.)
alter table apis add column if not exists components jsonb;

-- Add comment
comment on column apis.components is 'OpenAPI components (schemas, responses, etc.) for resolving $ref';
