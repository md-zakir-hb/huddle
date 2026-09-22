-- add avatar_url column to profiles
alter table public.profiles add column if not exists avatar_url text;

-- create a public storage bucket for avatar images
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- anyone can view avatar files (bucket is public)
create policy "Public can view avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- users can only upload/update/delete their own avatar, stored under a
-- folder named after their own user id (e.g. "<user-id>/avatar.jpg")
create policy "Users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
