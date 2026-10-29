-- Only future explicit event-name changes trigger this transaction.
-- Existing records, source quotes and guest attendance IDs are not migrated.
create or replace function public.wedding_event_name_guard() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if exists(select 1 from public.wedding_records r where r.kind='events'
    and r.id<>new.id and lower(btrim(r.data->>'name'))=lower(btrim(new.data->>'name')))
    then raise exception 'event_name_taken'; end if;
  return new;
end $$;

create or replace function public.wedding_event_rename() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  with candidates as materialized (
    select r.*,
      case
        when r.kind='offers' and coalesce(r.data->'events','[]'::jsonb) ? (old.data->>'name') then
          jsonb_set(r.data,'{events}',(select jsonb_agg(case when e.name=old.data->>'name' then new.data->>'name' else e.name end order by e.position)
            from jsonb_array_elements_text(r.data->'events') with ordinality as e(name,position)))
        when r.kind in ('tasks','providers','costs') and r.data->>'event'=old.data->>'name' then
          jsonb_set(r.data,'{event}',to_jsonb(new.data->>'name'))
        when r.kind='costs' and coalesce(o.data->'events','[]'::jsonb) ? (old.data->>'name')
          and r.data->>'event'=(select string_agg(e.name,' + ' order by e.position)
            from jsonb_array_elements_text(o.data->'events') with ordinality as e(name,position)) then
          jsonb_set(r.data,'{event}',to_jsonb((select string_agg(case when e.name=old.data->>'name' then new.data->>'name' else e.name end,' + ' order by e.position)
            from jsonb_array_elements_text(o.data->'events') with ordinality as e(name,position))))
        else r.data
      end as renamed_data
    from public.wedding_records r
    left join public.wedding_records o on r.kind='costs' and o.kind='offers' and o.id=r.data->>'offerId'
    where r.kind in ('tasks','providers','offers','costs')
  ), changed as materialized (
    select * from candidates where data is distinct from renamed_data
  ), history as (
    insert into public.wedding_history(record_id,kind,data,version,updated_at,updated_by)
    select id,kind,data,version,updated_at,updated_by from changed
  )
  update public.wedding_records r set data=c.renamed_data,version=r.version+1,updated_at=now(),updated_by=new.updated_by
    from changed c where r.id=c.id;
  return new;
end $$;

create or replace trigger wedding_event_name_guard
before insert or update of data on public.wedding_records
for each row when (new.kind='events') execute function public.wedding_event_name_guard();

create or replace trigger wedding_event_rename
after update of data on public.wedding_records
for each row when (new.kind='events' and old.data->>'name' is distinct from new.data->>'name')
execute function public.wedding_event_rename();

revoke all on function public.wedding_event_name_guard(),public.wedding_event_rename() from public,anon,authenticated;
grant execute on function public.wedding_event_name_guard(),public.wedding_event_rename() to service_role;
