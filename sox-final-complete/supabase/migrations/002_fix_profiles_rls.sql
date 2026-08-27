-- ============================================================
-- Hotfix: profiles RLS + trigger fix
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql
-- ============================================================

-- Drop existing restrictive policy
drop policy if exists "own profile" on profiles;

-- Allow users to read/update their own profile
create policy "select own profile" on profiles
  for select using (id = auth.uid());

create policy "update own profile" on profiles
  for update using (id = auth.uid());

-- Allow the trigger (service role / security definer) to insert
-- This is the key fix — service_role bypasses RLS by default
-- but we need an explicit insert policy for authenticated inserts too
create policy "insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Re-create trigger function with explicit security definer
-- so it runs as the Supabase service role, bypassing RLS
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Recreate trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Verify the function exists
select proname, prosecdef from pg_proc where proname = 'handle_new_user';
