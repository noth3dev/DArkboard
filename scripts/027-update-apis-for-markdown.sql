-- Update apis table to support richer data from Markdown
alter table apis add column if not exists folder text;
alter table apis add column if not exists markdown_content text;

-- Add comments
comment on column apis.folder is 'Folder/Group name for the API (from x-apidog-folder or sections)';
comment on column apis.markdown_content is 'Raw markdown content for this API section';
