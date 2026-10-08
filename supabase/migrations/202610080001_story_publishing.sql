begin;

-- Publishing is separate from the editable draft. Ownership is still the shared
-- internal workspace identity; this migration does not introduce user sessions.
create table public.story_publications (
  owner_id uuid not null,
  story_id text not null,
  public_id uuid not null default gen_random_uuid() unique,
  release_id uuid,
  revision integer not null default 0 check (revision >= 0),
  source_revision integer,
  content_hash text not null default '',
  snapshot jsonb,
  published_at timestamptz,
  withdrawn_at timestamptz,
  primary key (owner_id, story_id),
  foreign key (owner_id, story_id) references public.stories(owner_id, id),
  foreign key (owner_id, story_id, source_revision) references public.story_versions(owner_id, story_id, revision),
  check (release_id is null or (snapshot is not null and source_revision is not null and published_at is not null))
);
create table public.publication_operations (
  owner_id uuid not null,
  story_id text not null,
  mutation_id uuid not null,
  request_hash text not null,
  result jsonb not null,
  primary key (owner_id, story_id, mutation_id),
  foreign key (owner_id, story_id) references public.stories(owner_id, id)
);
alter table public.story_publications enable row level security;
alter table public.publication_operations enable row level security;
revoke all on public.story_publications, public.publication_operations from public, anon, authenticated;
grant select, insert, update, delete on public.story_publications, public.publication_operations to service_role;

create function public.dextro_publish_story(
  p_owner uuid, p_story text, p_source integer, p_expected integer,
  p_mutation uuid, p_request_hash text, p_action text,
  p_content_hash text default '', p_snapshot jsonb default null
) returns jsonb language plpgsql set search_path = '' as $$
declare
  story public.stories;
  publication public.story_publications;
  operation public.publication_operations;
  result jsonb;
  ref jsonb;
begin
  -- Same lock as autosave: the source revision cannot change during promotion.
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text || ':' || p_story, 0));
  select * into operation from public.publication_operations
    where owner_id = p_owner and story_id = p_story and mutation_id = p_mutation;
  if found then
    if operation.request_hash <> p_request_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return operation.result;
  end if;
  select * into story from public.stories where owner_id = p_owner and id = p_story for update;
  if not found or story.deleted_at is not null then raise exception 'STORY_DELETED'; end if;
  if p_action not in ('publish', 'unpublish', 'delete') then raise exception 'INVALID_PUBLICATION'; end if;
  select * into publication from public.story_publications where owner_id = p_owner and story_id = p_story for update;
  if coalesce(publication.revision, 0) <> p_expected then raise exception 'PUBLICATION_CONFLICT'; end if;
  if p_action in ('publish', 'delete') and story.revision <> p_source then raise exception 'REVISION_CONFLICT'; end if;

  if p_action = 'publish' then
    if p_snapshot is null or jsonb_typeof(p_snapshot->'assets') is distinct from 'array'
      or octet_length(p_snapshot::text) > 2500000 or p_content_hash !~ '^[a-f0-9]{64}$'
      then raise exception 'INVALID_PUBLICATION'; end if;
    for ref in select value from jsonb_array_elements(p_snapshot->'assets') loop
      perform 1 from public.media_assets a join public.story_asset_refs r
        on r.owner_id = a.owner_id and r.asset_id = a.id
        where a.owner_id = p_owner and a.id = (ref->>'assetId')::uuid
          and r.story_id = p_story and r.revision = p_source
          and a.state = 'ready' and a.deleted_at is null
          and a.sha256 = ref->>'sha256' and a.kind = ref->>'kind'
          and a.mime_type = ref->>'mimeType' and a.byte_size = (ref->>'byteSize')::integer
        for share of a;
      if not found then raise exception 'ASSET_NOT_OWNED_OR_READY'; end if;
    end loop;
    if publication.release_id is null or publication.content_hash <> p_content_hash then
      insert into public.story_publications(owner_id, story_id, release_id, revision, source_revision, content_hash, snapshot, published_at)
        values(p_owner, p_story, gen_random_uuid(), 1, p_source, p_content_hash, p_snapshot, now())
      on conflict(owner_id, story_id) do update set
        release_id = excluded.release_id, revision = public.story_publications.revision + 1,
        source_revision = excluded.source_revision, content_hash = excluded.content_hash,
        snapshot = excluded.snapshot, published_at = now(), withdrawn_at = null
      returning * into publication;
    end if;
  else
    if publication.release_id is not null then
      update public.story_publications set release_id = null, revision = revision + 1, withdrawn_at = now()
        where owner_id = p_owner and story_id = p_story returning * into publication;
    end if;
    if p_action = 'delete' then
      update public.stories set deleted_at = now() where owner_id = p_owner and id = p_story;
    end if;
  end if;
  result := jsonb_build_object('publicId', publication.public_id, 'releaseId', publication.release_id,
    'revision', coalesce(publication.revision, 0), 'contentHash', coalesce(publication.content_hash, ''),
    'publishedAt', publication.published_at, 'deleted', p_action = 'delete');
  insert into public.publication_operations(owner_id, story_id, mutation_id, request_hash, result)
    values(p_owner, p_story, p_mutation, p_request_hash, result);
  return result;
end $$;
revoke all on function public.dextro_publish_story(uuid,text,integer,integer,uuid,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.dextro_publish_story(uuid,text,integer,integer,uuid,text,text,text,jsonb) to service_role;
notify pgrst, 'reload schema';
commit;
