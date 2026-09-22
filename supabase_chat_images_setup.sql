-- allow messages to optionally carry an image instead of / alongside text
alter table public.messages alter column content drop not null;
alter table public.messages add column if not exists image_url text;
alter table public.messages add constraint messages_content_or_image
  check (content is not null or image_url is not null);

-- create a public storage bucket for chat images
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

-- anyone can view chat images (bucket is public, same as avatars)
create policy "Public can view chat images"
  on storage.objects for select
  using (bucket_id = 'chat-images');

-- only participants of a conversation can upload images into that
-- conversation's folder (e.g. "<conversation-id>/<filename>.jpg")
create policy "Participants can upload chat images"
  on storage.objects for insert
  with check (
    bucket_id = 'chat-images'
    and public.is_conversation_participant(((storage.foldername(name))[1])::uuid)
  );
