begin;
create table meu_setup_private.radar_quotes (
  id bigint generated always as identity primary key,
  part_id text not null,
  identity_key text not null,
  store text not null,
  url text not null,
  cents integer not null check (cents > 0),
  observed_at timestamptz not null default now()
);
alter table meu_setup_private.radar_quotes enable row level security;
create index radar_quotes_part_time on meu_setup_private.radar_quotes (part_id, identity_key, observed_at desc, id desc);
revoke all on meu_setup_private.radar_quotes from public, anon, authenticated;
grant insert on meu_setup_private.radar_quotes to service_role;

create function public.unisetup_record_radar(p_id text, p_name text, p_details text, p_part_url text, p_store text, p_url text, p_cents integer)
returns void language sql security invoker set search_path = '' as $$
  insert into meu_setup_private.radar_quotes (part_id, identity_key, store, url, cents)
  select p_id, md5(jsonb_build_array(p_name, p_details, p_part_url)::text), p_store, p_url, p_cents
  where p_cents > 0 and p_url like 'https://%'
    and exists (
      select from meu_setup_private.workspace w
      cross join lateral jsonb_array_elements(w.setup->'parts') p
      where w.id and p->>'id' = p_id and p->>'name' = p_name
        and p->>'details' is not distinct from p_details and p->>'url' is not distinct from p_part_url
        and p->'bought' is distinct from 'true'::jsonb
    );
$$;
revoke all on function public.unisetup_record_radar(text,text,text,text,text,text,integer) from public, anon, authenticated;
grant execute on function public.unisetup_record_radar(text,text,text,text,text,text,integer) to service_role;

create function meu_setup_private.read_radar(p_key text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  parts jsonb;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  select w.setup->'parts' into parts from meu_setup_private.workspace w
    where w.id and w.access_hash = sha256(convert_to(p_key, 'UTF8'));
  if not found then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_object_agg(p->>'id', jsonb_build_object(
      'lowest', history.lowest, 'quotes', history.quotes,
      'name', p->>'name', 'details', p->>'details', 'partUrl', p->>'url'
    )), '{}'::jsonb)
    from jsonb_array_elements(parts) p
    cross join lateral (
      select min(q.cents) as lowest,
        jsonb_agg(jsonb_build_object('store', q.store, 'url', q.url, 'cents', q.cents, 'at', q.observed_at)
          order by q.observed_at desc, q.id desc) filter (where q.rank <= 6) as quotes
      from (
        select r.*, row_number() over (order by r.observed_at desc, r.id desc) as rank
        from meu_setup_private.radar_quotes r
        where r.part_id = p->>'id'
          and r.identity_key = md5(jsonb_build_array(p->>'name', p->>'details', p->>'url')::text)
      ) q
    ) history
    where p->'bought' is distinct from 'true'::jsonb and history.lowest is not null
  );
end;
$$;
create function public.unisetup_read_radar(p_key text)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select meu_setup_private.read_radar(p_key);
$$;
revoke all on function meu_setup_private.read_radar(text) from public, anon, authenticated;
revoke all on function public.unisetup_read_radar(text) from public, anon, authenticated;
grant execute on function meu_setup_private.read_radar(text) to anon, authenticated;
grant execute on function public.unisetup_read_radar(text) to anon, authenticated;
commit;
