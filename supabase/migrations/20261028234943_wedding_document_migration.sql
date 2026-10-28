create or replace function public.wedding_migrate(p_payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtext('wedding-migration'));
  if exists(select 1 from public.wedding_users) or exists(select 1 from public.wedding_records) or exists(select 1 from public.wedding_config where key='migration_done') then raise exception 'migration_closed'; end if;
  insert into public.wedding_users select id,name,email,password,created_at::timestamptz from jsonb_to_recordset(p_payload->'users') as u(id text,name text,email text,password text,created_at text);
  insert into public.wedding_records(id,kind,data,version,updated_at,updated_by) select id,kind,data,version,updated_at::timestamptz,updated_by from jsonb_to_recordset(p_payload->'records') as r(id text,kind text,data jsonb,version integer,updated_at text,updated_by text);
  insert into public.wedding_history(record_id,kind,data,version,updated_at,updated_by) select record_id,kind,data,version,updated_at::timestamptz,updated_by from jsonb_to_recordset(coalesce(p_payload->'history','[]'::jsonb)) as h(record_id text,kind text,data jsonb,version integer,updated_at text,updated_by text);
  insert into public.wedding_invitations select token,expires,used<>0 from jsonb_to_recordset(coalesce(p_payload->'invitations','[]'::jsonb)) as i(token text,expires bigint,used integer);
  insert into public.wedding_documents(id,name,mime,size,filename,status,progress,analysis,error,created_at,created_by)
  select id,name,mime,size,filename,status,progress,analysis,error,created_at::timestamptz,created_by
  from jsonb_to_recordset(coalesce(p_payload->'documents','[]'::jsonb)) as d(id text,name text,mime text,size bigint,filename text,status text,progress text,analysis jsonb,error text,created_at text,created_by text);
  insert into public.wedding_config(key,value) values('migration_done','true');
  return true;
end $$;
