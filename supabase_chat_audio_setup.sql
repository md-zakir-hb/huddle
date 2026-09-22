-- allow messages to optionally carry a voice note
alter table public.messages add column if not exists audio_url text;
alter table public.messages add column if not exists audio_duration integer;

alter table public.messages drop constraint if exists messages_content_or_image;
alter table public.messages add constraint messages_content_or_image
  check (content is not null or image_url is not null or audio_url is not null);

-- create a public storage bucket for voice notes
insert into storage.buckets (id, name, public)
values ('chat-audio', 'chat-audio', true)
on conflict (id) do nothing;

-- anyone can view chat audio (bucket is public, same as chat-images)
drop policy if exists "Public can view chat audio" on storage.objects;
create policy "Public can view chat audio"
  on storage.objects for select
  using (bucket_id = 'chat-audio');

-- only participants of a conversation can upload audio into that
-- conversation's folder (e.g. "<conversation-id>/<filename>.m4a")
drop policy if exists "Participants can upload chat audio" on storage.objects;
create policy "Participants can upload chat audio"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-audio'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );
