-- Pitch Picture: sessions table, RLS, audio-recordings storage bucket

-- Enums --------------------------------------------------------------------

create type session_status as enum (
  'uploading', 'transcribing', 'analyzing', 'ready', 'failed'
);

create type diagram_type as enum (
  'flowchart', 'mindmap', 'architecture', 'decision_tree', 'sequence'
);

-- Sessions table -----------------------------------------------------------

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  status session_status not null default 'uploading',
  audio_path text,
  duration_seconds integer,
  transcript text,
  title text,
  diagram_type diagram_type,
  diagram_reasoning text,
  mermaid_code text,
  summary text,
  key_concepts jsonb,
  share_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions(user_id);
create index sessions_share_token_idx on sessions(share_token);

alter table sessions enable row level security;

create policy "users see their own sessions"
  on sessions for select
  using (auth.uid() = user_id);

create policy "users insert their own sessions"
  on sessions for insert
  with check (auth.uid() = user_id);

create policy "users update their own sessions"
  on sessions for update
  using (auth.uid() = user_id);

create policy "users delete their own sessions"
  on sessions for delete
  using (auth.uid() = user_id);

-- Storage bucket -----------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('audio-recordings', 'audio-recordings', false)
on conflict (id) do nothing;

-- Bucket access: users can only touch objects under their own user_id prefix
create policy "users read their own audio"
  on storage.objects for select
  using (
    bucket_id = 'audio-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users upload their own audio"
  on storage.objects for insert
  with check (
    bucket_id = 'audio-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users delete their own audio"
  on storage.objects for delete
  using (
    bucket_id = 'audio-recordings'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
