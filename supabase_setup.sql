-- profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  phone text,
  email text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-create a profile row whenever a new user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- tasks table
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  description text,
  completed boolean default false,
  date timestamptz,
  priority text,
  reminder boolean default false,
  team_id uuid,       -- unused for now, reserved for Phase 2 (teams)
  assigned_to uuid,    -- unused for now, reserved for Phase 3 (assignment)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can view own personal tasks"
  on public.tasks for select
  using (owner_id = auth.uid() and team_id is null);

create policy "Users can insert own personal tasks"
  on public.tasks for insert
  with check (owner_id = auth.uid() and team_id is null);

create policy "Users can update own personal tasks"
  on public.tasks for update
  using (owner_id = auth.uid() and team_id is null);

create policy "Users can delete own personal tasks"
  on public.tasks for delete
  using (owner_id = auth.uid() and team_id is null);
