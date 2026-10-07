begin;
create table if not exists public.app_users (
  id uuid primary key, kind text not null check (kind in ('internal','account')),
  auth_user_id uuid unique references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.stories (
  owner_id uuid not null references public.app_users(id), id text not null check(length(id) between 1 and 100),
  title text not null, description text not null, genre text not null,
  status text not null default 'ready' check(status in ('draft','ready','archived')),
  schema_version integer not null default 3 check(schema_version=3), revision integer not null check(revision>0),
  document jsonb not null, passage_count integer not null, ending_count integer not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), deleted_at timestamptz,
  primary key(owner_id,id)
);
create table if not exists public.media_assets (
  id uuid primary key, owner_id uuid not null references public.app_users(id),
  kind text not null check(kind in ('image','audio')), source text not null check(source in ('upload','legacy','catalog','generated')),
  state text not null default 'pending' check(state in ('pending','ready','quarantined','failed')),
  name text not null, credit text not null default '', mime_type text not null,
  byte_size integer not null check(byte_size>0 and byte_size<=25000000), sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  object_key text not null unique, provenance jsonb, generation_job_id uuid,
  created_at timestamptz not null default now(), deleted_at timestamptz,
  unique(owner_id,id)
);
create table if not exists public.story_versions (
  owner_id uuid not null, story_id text not null, revision integer not null,
  mutation_id uuid not null, mutation_hash text not null, snapshot jsonb not null,
  reason text not null default 'save', created_at timestamptz not null default now(),
  primary key(owner_id,story_id,revision), unique(owner_id,story_id,mutation_id),
  foreign key(owner_id,story_id) references public.stories(owner_id,id)
);
create table if not exists public.story_asset_refs (
  owner_id uuid not null, story_id text not null, revision integer not null, asset_id uuid not null,
  primary key(owner_id,story_id,revision,asset_id),
  foreign key(owner_id,story_id,revision) references public.story_versions(owner_id,story_id,revision),
  foreign key(owner_id,asset_id) references public.media_assets(owner_id,id)
);
create table if not exists public.generation_jobs (
  id uuid primary key, owner_id uuid not null references public.app_users(id), kind text not null check(kind in ('story','image')),
  idempotency_key uuid not null, request_hash text not null, input jsonb not null,
  status text not null default 'queued' check(status in ('queued','running','persisting','succeeded','failed','cancelled','outcome_unknown')),
  result jsonb, error text, workflow_id text, cancel_requested_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(owner_id,kind,idempotency_key), unique(owner_id,id)
);
create table if not exists public.generation_attempts (
  id uuid primary key, owner_id uuid not null, job_id uuid not null, sequence integer not null check(sequence in (1,2)),
  status text not null check(status in ('dispatched','received','persisted','failed','outcome_unknown')),
  provider text not null default 'openai', model text not null,
  request jsonb not null, response jsonb, provider_request_id text, usage jsonb,
  charge_state text not null default 'unknown', created_at timestamptz not null default now(),
  unique(job_id,sequence), unique(owner_id,id),
  foreign key(owner_id,job_id) references public.generation_jobs(owner_id,id)
);
alter table public.media_assets drop constraint if exists media_assets_job_owner_fk;
alter table public.media_assets add constraint media_assets_job_owner_fk foreign key(owner_id,generation_job_id) references public.generation_jobs(owner_id,id);
create unique index if not exists media_generated_once on public.media_assets(owner_id,generation_job_id) where generation_job_id is not null;
create index if not exists stories_owner_recent on public.stories(owner_id,updated_at desc,id) where deleted_at is null;
create index if not exists assets_owner_recent on public.media_assets(owner_id,created_at desc,id) where deleted_at is null;
create index if not exists assets_owner_hash on public.media_assets(owner_id,sha256);
create index if not exists references_asset on public.story_asset_refs(asset_id);
create index if not exists jobs_owner_recent on public.generation_jobs(owner_id,created_at desc,id);
create index if not exists attempts_created on public.generation_attempts(created_at);

-- Internal test identity has no login. Linking a real account is an explicit later action.
insert into public.app_users(id,kind) values('8dc1ba9a-adf2-48ff-8dec-c0b4152e326a','internal') on conflict(id) do nothing;

do $$ declare t text; begin
  foreach t in array array['app_users','stories','media_assets','story_versions','story_asset_refs','generation_jobs','generation_attempts'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to service_role',t);
  end loop;
end $$;

create or replace function public.dextro_save_story(p_owner uuid,p_id text,p_base integer,p_mutation uuid,p_hash text,p_story jsonb,p_status text default 'ready')
returns jsonb language plpgsql set search_path='' as $$
declare current_row public.stories; prior public.story_versions; next_revision integer; asset uuid; snapshot jsonb; count_assets integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_id,0));
  select * into prior from public.story_versions where owner_id=p_owner and story_id=p_id and mutation_id=p_mutation;
  if found then
    if prior.mutation_hash<>p_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return jsonb_build_object('revision',prior.revision,'updatedAt',prior.created_at);
  end if;
  select * into current_row from public.stories where owner_id=p_owner and id=p_id for update;
  if found then
    if current_row.deleted_at is not null then raise exception 'STORY_DELETED'; end if;
    if current_row.revision<>p_base then raise exception 'REVISION_CONFLICT'; end if;
  elsif p_base<>0 then raise exception 'REVISION_CONFLICT'; end if;
  if p_status not in ('draft','ready','archived') or jsonb_typeof(p_story->'document'->'passages')<>'array' or jsonb_array_length(p_story->'document'->'passages') not between 1 and 150 then raise exception 'INVALID_STORY'; end if;
  if octet_length(p_story::text)>2500000 or jsonb_typeof(p_story->'document'->'assets')<>'array' then raise exception 'INVALID_STORY'; end if;
  count_assets:=jsonb_array_length(p_story->'document'->'assets');
  if count_assets>300 then raise exception 'INVALID_STORY'; end if;
  for asset in select distinct (value->>'assetId')::uuid from jsonb_array_elements(p_story->'document'->'assets') loop
    perform 1 from public.media_assets where owner_id=p_owner and id=asset and state='ready' and deleted_at is null for share;
    if not found then raise exception 'ASSET_NOT_OWNED_OR_READY'; end if;
  end loop;
  next_revision:=coalesce(current_row.revision,0)+1;
  insert into public.stories(owner_id,id,title,description,genre,status,revision,document,passage_count,ending_count)
  values(p_owner,p_id,p_story->>'title',p_story->>'description',p_story->>'genre',p_status,next_revision,p_story->'document',jsonb_array_length(p_story->'document'->'passages'),
    (select count(*) from jsonb_array_elements(p_story->'document'->'passages') where value->>'ending'='true'))
  on conflict(owner_id,id) do update set title=excluded.title,description=excluded.description,genre=excluded.genre,status=excluded.status,revision=excluded.revision,document=excluded.document,passage_count=excluded.passage_count,ending_count=excluded.ending_count,updated_at=now();
  snapshot:=p_story||jsonb_build_object('status',p_status,'schemaVersion',3);
  insert into public.story_versions(owner_id,story_id,revision,mutation_id,mutation_hash,snapshot) values(p_owner,p_id,next_revision,p_mutation,p_hash,snapshot);
  insert into public.story_asset_refs(owner_id,story_id,revision,asset_id)
    select distinct p_owner,p_id,next_revision,(value->>'assetId')::uuid from jsonb_array_elements(p_story->'document'->'assets');
  return jsonb_build_object('revision',next_revision,'updatedAt',now());
end $$;

-- Claim the external-call boundary once. A dispatched attempt is NEVER replayed.
create or replace function public.dextro_claim_attempt(p_owner uuid,p_job uuid,p_sequence integer,p_model text,p_request jsonb,p_daily integer default 20,p_concurrency integer default 2)
returns jsonb language plpgsql set search_path='' as $$
declare j public.generation_jobs; a public.generation_attempts; active_count integer;
begin
  perform pg_advisory_xact_lock(83510421);
  select * into j from public.generation_jobs where owner_id=p_owner and id=p_job for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  select * into a from public.generation_attempts where owner_id=p_owner and job_id=p_job and sequence=p_sequence;
  if found then return to_jsonb(a)||jsonb_build_object('claimed',false); end if;
  if j.cancel_requested_at is not null or j.status in ('succeeded','failed','cancelled','outcome_unknown') then raise exception 'JOB_CANCELLED'; end if;
  if (select count(*) from public.generation_attempts where created_at>=date_trunc('day',now()))>=least(greatest(p_daily,1),100) then raise exception 'DAILY_LIMIT'; end if;
  select count(*) into active_count from public.generation_attempts where status='dispatched' and created_at>now()-interval '4 minutes';
  if active_count>=least(greatest(p_concurrency,1),2) then raise exception 'CONCURRENCY_LIMIT'; end if;
  insert into public.generation_attempts(id,owner_id,job_id,sequence,status,model,request)
    values(gen_random_uuid(),p_owner,p_job,p_sequence,'dispatched',p_model,p_request) returning * into a;
  update public.generation_jobs set status='running',updated_at=now() where owner_id=p_owner and id=p_job;
  return to_jsonb(a)||jsonb_build_object('claimed',true);
end $$;

-- Atomically save a generated draft and point its job at the exact revision.
create or replace function public.dextro_finish_story(p_owner uuid,p_job uuid,p_story jsonb,p_repaired boolean)
returns jsonb language plpgsql set search_path='' as $$
declare j public.generation_jobs; saved jsonb;
begin
  select * into j from public.generation_jobs where owner_id=p_owner and id=p_job and kind='story' for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if j.status='succeeded' then return j.result; end if;
  saved:=public.dextro_save_story(p_owner,p_job::text,0,p_job,p_job::text,p_story,'draft');
  update public.generation_jobs set status='succeeded',result=jsonb_build_object('storyId',p_job::text,'revision',saved->'revision','repaired',p_repaired),updated_at=now() where owner_id=p_owner and id=p_job returning * into j;
  return j.result;
end $$;

-- No public execute privileges: every caller is the trusted owner-scoped server.
revoke all on function public.dextro_save_story(uuid,text,integer,uuid,text,jsonb,text) from public,anon,authenticated;
revoke all on function public.dextro_claim_attempt(uuid,uuid,integer,text,jsonb,integer,integer) from public,anon,authenticated;
revoke all on function public.dextro_finish_story(uuid,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.dextro_save_story(uuid,text,integer,uuid,text,jsonb,text) to service_role;
grant execute on function public.dextro_claim_attempt(uuid,uuid,integer,text,jsonb,integer,integer) to service_role;
grant execute on function public.dextro_finish_story(uuid,uuid,jsonb,boolean) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('user-media','user-media',false,25000000,array['image/png','image/jpeg','image/webp','audio/mpeg','audio/mp4','audio/ogg','audio/wav','audio/webm'])
on conflict(id) do nothing;
-- Provider responses are recovery material, never browser-readable objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('generation-output','generation-output',false,40000000,array['application/json']) on conflict(id) do nothing;
notify pgrst,'reload schema';
commit;
