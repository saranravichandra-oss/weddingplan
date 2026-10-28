create table public.wedding_users (
  id text primary key, name text not null, email text unique not null,
  password text not null, created_at timestamptz not null default now()
);
create table public.wedding_sessions (
  token text primary key, user_id text not null references public.wedding_users(id) on delete cascade,
  csrf text not null, expires bigint not null
);
create index wedding_sessions_user on public.wedding_sessions(user_id);
create table public.wedding_invitations (token text primary key, expires bigint not null, used boolean not null default false);
create table public.wedding_records (
  id text primary key, kind text not null check (kind in ('tasks','providers','offers','guests','costs','events','settings')),
  data jsonb not null, version integer not null default 1 check(version>0),
  updated_at timestamptz not null default now(), updated_by text references public.wedding_users(id)
);
create index wedding_records_kind on public.wedding_records(kind);
create unique index wedding_cost_offer_once on public.wedding_records((data->>'offerId')) where kind='costs' and data->>'offerId' is not null;
create table public.wedding_history (
  id bigint generated always as identity primary key, record_id text not null, kind text not null,
  data jsonb not null, version integer not null, updated_at timestamptz not null, updated_by text
);
create table public.wedding_documents (
  id text primary key, name text not null, mime text not null, size bigint not null check(size>0 and size<=15728640),
  filename text unique not null, status text not null default 'queued', progress text not null default 'Upload wird vorbereitet',
  uploaded boolean not null default false, analysis jsonb, error text,
  created_at timestamptz not null default now(), created_by text not null references public.wedding_users(id)
);
create index wedding_documents_creator on public.wedding_documents(created_by);
create table public.wedding_config (key text primary key, value jsonb not null);
create table public.wedding_limits (key text primary key, count integer not null, resets bigint not null);

alter table public.wedding_users enable row level security;
alter table public.wedding_sessions enable row level security;
alter table public.wedding_invitations enable row level security;
alter table public.wedding_records enable row level security;
alter table public.wedding_history enable row level security;
alter table public.wedding_documents enable row level security;
alter table public.wedding_config enable row level security;
alter table public.wedding_limits enable row level security;
revoke all on public.wedding_users,public.wedding_sessions,public.wedding_invitations,public.wedding_records,public.wedding_history,public.wedding_documents,public.wedding_config,public.wedding_limits from anon,authenticated;
grant all on public.wedding_users,public.wedding_sessions,public.wedding_invitations,public.wedding_records,public.wedding_history,public.wedding_documents,public.wedding_config,public.wedding_limits to service_role;
grant usage,select on sequence public.wedding_history_id_seq to service_role;

-- Every RPC is SECURITY INVOKER and executable only by the backend service role.
-- No database secret is sent to Vercel or to the browser.
create function public.wedding_limit(p_key text,p_window bigint,p_limit integer) returns boolean
language plpgsql security invoker set search_path='' as $$
declare n integer; current_ms bigint := floor(extract(epoch from now())*1000);
begin
  delete from public.wedding_limits where resets<current_ms-86400000;
  insert into public.wedding_limits(key,count,resets) values(p_key,1,current_ms+p_window)
  on conflict(key) do update set count=case when wedding_limits.resets<current_ms then 1 else wedding_limits.count+1 end,
    resets=case when wedding_limits.resets<current_ms then current_ms+p_window else wedding_limits.resets end returning count into n;
  return n<=p_limit;
end $$;

create function public.wedding_write(p_kind text,p_id text,p_data jsonb,p_version integer,p_user text,p_delete boolean default false) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare old public.wedding_records; result public.wedding_records; linked public.wedding_records;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-writes'));
  if not exists(select 1 from public.wedding_users where id=p_user) then raise exception 'forbidden'; end if;
  if p_kind not in ('tasks','providers','offers','guests','costs','events','settings') then raise exception 'invalid_kind'; end if;
  select * into old from public.wedding_records where id=p_id and kind=p_kind for update;
  if p_version is not null and (old.id is null or old.version<>p_version) then raise exception 'conflict'; end if;
  if p_version is null and old.id is not null then raise exception 'conflict'; end if;
  if p_delete then
    if p_kind in ('settings','events') then raise exception 'protected_record'; end if;
    if p_kind='providers' and exists(select 1 from public.wedding_records where kind='offers' and data->>'providerId'=p_id) then raise exception 'linked_record'; end if;
    if p_kind='offers' and exists(select 1 from public.wedding_records where kind='costs' and data->>'offerId'=p_id) then raise exception 'linked_record'; end if;
  elsif p_kind='offers' then
    if p_data->>'providerId' is not null and not exists(select 1 from public.wedding_records where kind='providers' and id=p_data->>'providerId') then raise exception 'linked_record'; end if;
    if p_data->>'documentId' is not null and not exists(select 1 from public.wedding_documents where id=p_data->>'documentId' and uploaded) then raise exception 'linked_record'; end if;
    if coalesce(p_data->>'status'='Gebucht',false) <> exists(select 1 from public.wedding_records where kind='costs' and data->>'offerId'=p_id) then raise exception 'booking_state'; end if;
  elsif p_kind='costs' and p_data->>'offerId' is not null then
    if p_data->>'stage'<>'Beauftragt' or not exists(select 1 from public.wedding_records where kind='offers' and id=p_data->>'offerId') then raise exception 'booking_state'; end if;
  end if;
  if old.id is not null then
    insert into public.wedding_history(record_id,kind,data,version,updated_at,updated_by) values(old.id,old.kind,old.data,old.version,old.updated_at,old.updated_by);
  end if;
  if p_delete then
    delete from public.wedding_records where id=p_id;
    if p_kind='costs' and old.data->>'offerId' is not null then
      select * into linked from public.wedding_records where id=old.data->>'offerId' and kind='offers' for update;
      if linked.id is not null then perform public.wedding_write('offers',linked.id,linked.data||'{"status":"Geprüft"}'::jsonb,linked.version,p_user,false); end if;
    end if;
    return jsonb_build_object('ok',true);
  end if;
  if old.id is null then
    insert into public.wedding_records(id,kind,data,updated_by) values(p_id,p_kind,p_data,p_user) returning * into result;
  else
    update public.wedding_records set data=p_data,version=version+1,updated_at=now(),updated_by=p_user where id=p_id returning * into result;
  end if;
  return to_jsonb(result);
end $$;

create function public.wedding_book(p_offer text,p_version integer,p_user text,p_amount numeric,p_paid numeric,p_due text,p_id text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare offer public.wedding_records; cost public.wedding_records;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-writes'));
  select * into offer from public.wedding_records where id=p_offer and kind='offers' for update;
  if offer.id is null or offer.version<>p_version then raise exception 'conflict'; end if;
  if p_amount<0 or p_paid<0 or p_paid>p_amount then raise exception 'invalid_amount'; end if;
  if exists(select 1 from public.wedding_records where kind='costs' and data->>'offerId'=p_offer) then raise exception 'already_booked'; end if;
  insert into public.wedding_records(id,kind,data,updated_by) values(p_id,'costs',jsonb_build_object(
    'label',offer.data->>'name','category',offer.data->>'category','event',coalesce((select string_agg(value,' + ') from jsonb_array_elements_text(offer.data->'events')),''),
    'stage','Beauftragt','amount',p_amount,'paid',p_paid,'due',p_due,'offerId',p_offer,'notes','Gesamtbetrag in EUR ausdrücklich bestätigt. Gemeinsame Kosten einmal erfasst.'),p_user) returning * into cost;
  perform public.wedding_write('offers',offer.id,offer.data||'{"status":"Gebucht"}'::jsonb,offer.version,p_user,false);
  return to_jsonb(cost);
end $$;

create function public.wedding_join(p_token text,p_id text,p_name text,p_email text,p_password text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare u public.wedding_users;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-users'));
  if (select count(*) from public.wedding_users)>=2 then raise exception 'invitation_invalid'; end if;
  if not exists(select 1 from public.wedding_invitations where token=p_token and not used and expires>floor(extract(epoch from now())*1000)) then raise exception 'invitation_invalid'; end if;
  insert into public.wedding_users(id,name,email,password) values(p_id,p_name,lower(p_email),p_password) returning * into u;
  update public.wedding_invitations set used=true where token=p_token;
  return jsonb_build_object('id',u.id,'name',u.name,'email',u.email);
end $$;

create function public.wedding_reserve_document(p_document jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.wedding_documents;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-storage'));
  if (select coalesce(sum(size),0) from public.wedding_documents)+(p_document->>'size')::bigint>786432000 then raise exception 'storage_limit'; end if;
  insert into public.wedding_documents(id,name,mime,size,filename,created_by) values(p_document->>'id',p_document->>'name',p_document->>'mime',(p_document->>'size')::bigint,p_document->>'filename',p_document->>'created_by') returning * into d;
  return to_jsonb(d);
end $$;

create function public.wedding_delete_document(p_id text) returns text
language plpgsql security invoker set search_path='' as $$
declare d public.wedding_documents;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-writes'));
  if exists(select 1 from public.wedding_records where kind='offers' and data->>'documentId'=p_id) then raise exception 'linked_record'; end if;
  delete from public.wedding_documents where id=p_id returning * into d;
  if d.id is null then raise exception 'not_found'; end if;
  return d.filename;
end $$;

create function public.wedding_migrate(p_payload jsonb) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  perform pg_advisory_xact_lock(hashtext('wedding-migration'));
  if exists(select 1 from public.wedding_users) or exists(select 1 from public.wedding_records) or exists(select 1 from public.wedding_config where key='migration_done') then raise exception 'migration_closed'; end if;
  insert into public.wedding_users select id,name,email,password,created_at::timestamptz from jsonb_to_recordset(p_payload->'users') as u(id text,name text,email text,password text,created_at text);
  insert into public.wedding_records(id,kind,data,version,updated_at,updated_by) select id,kind,data,version,updated_at::timestamptz,updated_by from jsonb_to_recordset(p_payload->'records') as r(id text,kind text,data jsonb,version integer,updated_at text,updated_by text);
  insert into public.wedding_history(record_id,kind,data,version,updated_at,updated_by) select record_id,kind,data,version,updated_at::timestamptz,updated_by from jsonb_to_recordset(coalesce(p_payload->'history','[]'::jsonb)) as h(record_id text,kind text,data jsonb,version integer,updated_at text,updated_by text);
  insert into public.wedding_invitations select token,expires,used<>0 from jsonb_to_recordset(coalesce(p_payload->'invitations','[]'::jsonb)) as i(token text,expires bigint,used integer);
  insert into public.wedding_config(key,value) values('migration_done','true');
  return true;
end $$;

revoke all on function public.wedding_limit(text,bigint,integer),public.wedding_write(text,text,jsonb,integer,text,boolean),public.wedding_book(text,integer,text,numeric,numeric,text,text),public.wedding_join(text,text,text,text,text),public.wedding_reserve_document(jsonb),public.wedding_delete_document(text),public.wedding_migrate(jsonb) from public,anon,authenticated;
grant execute on function public.wedding_limit(text,bigint,integer),public.wedding_write(text,text,jsonb,integer,text,boolean),public.wedding_book(text,integer,text,numeric,numeric,text,text),public.wedding_join(text,text,text,text,text),public.wedding_reserve_document(jsonb),public.wedding_delete_document(text),public.wedding_migrate(jsonb) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('wedding-documents','wedding-documents',false,15728640,array['application/pdf','image/png','image/jpeg','image/webp','text/plain']) on conflict(id) do nothing;
