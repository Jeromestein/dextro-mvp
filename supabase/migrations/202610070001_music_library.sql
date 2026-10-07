-- Public CC0 catalog; existing private story assets and their references are unchanged.
create table if not exists public.music_library_tracks (
  id text primary key,
  role text not null check (role in ('music', 'sfx')),
  active boolean not null default true,
  record jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (record->>'id' = id),
  check (record->>'role' = role),
  check (record->>'license' = 'CC0-1.0'),
  check (record->>'sha256' ~ '^[a-f0-9]{64}$')
);
alter table public.music_library_tracks enable row level security;
revoke all on public.music_library_tracks from anon, authenticated;
grant select, insert, update on public.music_library_tracks to service_role;

-- Only intentionally public, licensed audio is published here. Uploads remain server-only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('music-library', 'music-library', true, 6000000, array['audio/mpeg', 'audio/ogg'])
on conflict (id) do nothing;
