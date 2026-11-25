begin;

create schema meu_setup_private;
revoke all on schema meu_setup_private from public, anon, authenticated;
grant usage on schema meu_setup_private to anon, authenticated;

create table meu_setup_private.workspace (
  id boolean primary key default true check (id),
  access_hash bytea check (octet_length(access_hash) = 32),
  setup jsonb check (setup is null or jsonb_typeof(setup) = 'object'),
  games jsonb check (games is null or jsonb_typeof(games) = 'array'),
  setup_revision integer not null default 0 check (setup_revision >= 0),
  games_revision integer not null default 0 check (games_revision >= 0)
);
alter table meu_setup_private.workspace enable row level security;
insert into meu_setup_private.workspace (id) values (true);

create function meu_setup_private.access_workspace(
  p_key text, p_action text, p_payload jsonb, p_revision integer
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  current_workspace meu_setup_private.workspace%rowtype;
  next_revision integer;
begin
  if p_key is null or p_key !~ '^[0-9a-f]{64}$' then
    raise exception 'Access denied' using errcode = '42501';
  end if;
  select * into current_workspace from meu_setup_private.workspace
    where id and access_hash = pg_catalog.sha256(pg_catalog.convert_to(p_key, 'UTF8'));
  if not found then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  case p_action
    when 'read' then
      return pg_catalog.jsonb_build_object(
        'setup', current_workspace.setup, 'games', current_workspace.games,
        'setup_revision', current_workspace.setup_revision,
        'games_revision', current_workspace.games_revision
      );
    when 'setup' then
      if pg_catalog.jsonb_typeof(p_payload) is distinct from 'object' then
        raise exception 'Invalid setup' using errcode = '22023';
      end if;
      update meu_setup_private.workspace set setup = p_payload, setup_revision = setup_revision + 1
        where id and setup_revision = p_revision and access_hash = current_workspace.access_hash
        returning setup_revision into next_revision;
    when 'games' then
      if pg_catalog.jsonb_typeof(p_payload) is distinct from 'array' then
        raise exception 'Invalid games' using errcode = '22023';
      end if;
      update meu_setup_private.workspace set games = p_payload, games_revision = games_revision + 1
        where id and games_revision = p_revision and access_hash = current_workspace.access_hash
        returning games_revision into next_revision;
    when 'import' then
      if pg_catalog.jsonb_typeof(p_payload->'setup') is distinct from 'object'
        or pg_catalog.jsonb_typeof(p_payload->'games') is distinct from 'array' then
        raise exception 'Invalid backup' using errcode = '22023';
      end if;
      update meu_setup_private.workspace
        set setup = p_payload->'setup', games = p_payload->'games', setup_revision = 1, games_revision = 1
        where id and setup_revision = 0 and games_revision = 0 and access_hash = current_workspace.access_hash
        returning setup_revision into next_revision;
    else
      raise exception 'Invalid action' using errcode = '22023';
  end case;
  if next_revision is null then
    raise exception 'Workspace changed' using errcode = '40001';
  end if;
  return pg_catalog.jsonb_build_object('revision', next_revision);
end;
$$;

create function public.meu_setup_access(
  p_key text, p_action text, p_payload jsonb default null, p_revision integer default null
) returns jsonb
language sql security invoker
set search_path = ''
as $$
  select meu_setup_private.access_workspace(p_key, p_action, p_payload, p_revision);
$$;

revoke all on function meu_setup_private.access_workspace(text,text,jsonb,integer) from public, anon, authenticated;
revoke all on function public.meu_setup_access(text,text,jsonb,integer) from public, anon, authenticated;
grant execute on function meu_setup_private.access_workspace(text,text,jsonb,integer) to anon, authenticated;
grant execute on function public.meu_setup_access(text,text,jsonb,integer) to anon, authenticated;

commit;
