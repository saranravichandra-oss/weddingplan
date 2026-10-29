create function public.wedding_import_guests(p_batch text,p_rows jsonb,p_user text) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare row jsonb; guest jsonb; record_id text; created integer:=0; skipped integer:=0; people integer:=0;
begin
  perform pg_advisory_xact_lock(hashtext('wedding-writes'));
  if not exists(select 1 from public.wedding_users where id=p_user) then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)<1 or jsonb_array_length(p_rows)>500 then raise exception 'invalid_import'; end if;
  for row in select value from jsonb_array_elements(p_rows) loop
    guest:=row->'guest';
    record_id:='guest-import-'||p_batch||'-'||(row->>'sourceRow');
    if exists(select 1 from public.wedding_records where id=record_id)
      or (not coalesce((row->>'allowDuplicate')::boolean,false) and exists(
        select 1 from public.wedding_records where kind='guests'
        and regexp_replace(lower(btrim(data->>'name')),'\s+',' ','g')=regexp_replace(lower(btrim(guest->>'name')),'\s+',' ','g')
      )) then skipped:=skipped+1; continue; end if;
    if coalesce(guest->>'name','')='' or (guest->>'partySize')::integer not between 1 and 1000 then raise exception 'invalid_guest'; end if;
    if exists(select 1 from jsonb_object_keys(guest->'attendance') as event(id)
      where not exists(select 1 from public.wedding_records where kind='events' and id=event.id)) then raise exception 'linked_record'; end if;
    insert into public.wedding_records(id,kind,data,updated_by)
      values(record_id,'guests',guest||jsonb_build_object('importBatch',p_batch),p_user);
    created:=created+1;people:=people+(guest->>'partySize')::integer;
  end loop;
  return jsonb_build_object('created',created,'skipped',skipped,'people',people);
end $$;
revoke all on function public.wedding_import_guests(text,jsonb,text) from public,anon,authenticated;
grant execute on function public.wedding_import_guests(text,jsonb,text) to service_role;
