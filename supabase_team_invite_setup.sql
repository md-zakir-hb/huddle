-- lets any signed-in user search for other users by email prefix, without
-- exposing full profile rows (e.g. phone number) to arbitrary searchers
create or replace function public.search_profiles_by_email(search_query text)
returns table (id uuid, name text, email text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select id, name, email, avatar_url
  from public.profiles
  where email ilike search_query || '%'
  limit 10;
$$;

grant execute on function public.search_profiles_by_email(text) to authenticated;

-- team admins can add other users as members
-- (this is in addition to the existing "creator can add themself" policy)
create policy "Admins can add other members"
  on public.team_members for insert
  with check (
    exists (
      select 1 from public.team_members existing
      where existing.team_id = team_members.team_id
        and existing.user_id = auth.uid()
        and existing.role = 'admin'
    )
  );
