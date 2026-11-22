-- Date Vials: Supabase schema
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- A "space" is the two of you. Each person joins it once.
create table if not exists public.spaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default 'Our date vials',
  invite_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(4), 'hex'), 1, 6)),
  created_at  timestamptz not null default now()
);

create table if not exists public.members (
  space_id     uuid not null references public.spaces on delete cascade,
  user_id      uuid not null references auth.users on delete cascade,
  display_name text not null,
  joined_at    timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.ideas (
  id           uuid primary key default gen_random_uuid(),
  space_id     uuid not null references public.spaces on delete cascade,
  title        text not null,
  notes        text not null default '',
  link         text not null default '',
  place        text not null default '',
  maps_url     text not null default '',
  jar          text not null check (jar in ('outside', 'indoor', 'home')),
  vibe         text not null,
  cover_url    text,
  interested   uuid[] not null default '{}',
  status       text not null default 'open' check (status in ('open', 'planned', 'done')),
  planned_for  date,
  planned_time text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now()
);

-- Added later; keeps older databases in step.
alter table public.ideas add column if not exists maps_url text not null default '';
alter table public.ideas add column if not exists deadline date;  -- last day an event is on
alter table public.ideas add column if not exists done_on date;   -- the day you went
alter table public.ideas add column if not exists memory text not null default '';  -- what you want to remember

create index if not exists ideas_space_idx on public.ideas (space_id);

-- Is the signed-in person part of this space?
create or replace function public.is_member(s uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where space_id = s and user_id = auth.uid());
$$;

alter table public.spaces  enable row level security;
alter table public.members enable row level security;
alter table public.ideas   enable row level security;

-- Newer Supabase projects don't expose SQL-created tables automatically. Signed-in people get table
-- access here; the policies below still limit them to their own vials. Signed-out visitors get none.
grant usage on schema public to authenticated;
grant select on public.spaces to authenticated;
grant select, update on public.members to authenticated;
grant select, insert, update, delete on public.ideas to authenticated;
revoke all on public.spaces, public.members, public.ideas from anon;

drop policy if exists "members read space" on public.spaces;
create policy "members read space" on public.spaces
  for select to authenticated using (public.is_member(id));

drop policy if exists "members read members" on public.members;
create policy "members read members" on public.members
  for select to authenticated using (public.is_member(space_id));

drop policy if exists "rename yourself" on public.members;
create policy "rename yourself" on public.members
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "members manage ideas" on public.ideas;
create policy "members manage ideas" on public.ideas
  for all to authenticated
  using (public.is_member(space_id))
  with check (public.is_member(space_id));

-- Start a new space (first person).
create or replace function public.create_space(p_name text, p_display text)
returns public.spaces language plpgsql security definer set search_path = public as $$
declare s public.spaces;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  insert into public.spaces (name) values (coalesce(nullif(trim(p_name), ''), 'Our date vials')) returning * into s;
  insert into public.members (space_id, user_id, display_name) values (s.id, auth.uid(), trim(p_display));
  return s;
end $$;

-- Join with the invite code (second person). Max two people per space.
create or replace function public.join_space(p_code text, p_display text)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; n int;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select id into sid from public.spaces where invite_code = upper(trim(p_code));
  if sid is null then raise exception 'That invite code does not match any vials'; end if;
  if exists (select 1 from public.members where space_id = sid and user_id = auth.uid()) then return sid; end if;
  select count(*) into n from public.members where space_id = sid;
  if n >= 2 then raise exception 'These vials already have two people'; end if;
  insert into public.members (space_id, user_id, display_name) values (sid, auth.uid(), trim(p_display));
  return sid;
end $$;

-- Tap "I'm in" / "Not for me". Done atomically so you never overwrite each other.
create or replace function public.set_interest(p_idea uuid, p_on boolean)
returns uuid[] language sql security invoker set search_path = public as $$
  update public.ideas
     set interested = case
       when p_on then array(select distinct unnest(interested || auth.uid()))
       else array_remove(interested, auth.uid()) end
   where id = p_idea
  returning interested;
$$;

revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.create_space(text, text) from public, anon;
revoke execute on function public.join_space(text, text) from public, anon;
revoke execute on function public.set_interest(uuid, boolean) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.create_space(text, text) to authenticated;
grant execute on function public.join_space(text, text)   to authenticated;
grant execute on function public.set_interest(uuid, boolean) to authenticated;

-- Live updates, so you see each other's taps straight away.
do $$ begin
  alter publication supabase_realtime add table public.ideas;
exception when duplicate_object then null; end $$;

-- Cover screenshots. File names are random, stored in a folder per space.
insert into storage.buckets (id, name, public) values ('covers', 'covers', true)
on conflict (id) do nothing;

drop policy if exists "members upload covers" on storage.objects;
create policy "members upload covers" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'covers' and public.is_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "members delete covers" on storage.objects;
create policy "members delete covers" on storage.objects
  for delete to authenticated
  using (bucket_id = 'covers' and public.is_member(((storage.foldername(name))[1])::uuid));

-- "Not for me": a red light for the other person, never a delete (added later).
alter table public.ideas add column if not exists declined uuid[] not null default '{}';

create or replace function public.set_interest(p_idea uuid, p_on boolean)
returns uuid[] language sql security invoker set search_path = public as $$
  update public.ideas
     set interested = case
           when p_on then array(select distinct unnest(interested || auth.uid()))
           else array_remove(interested, auth.uid()) end,
         declined = case when p_on then array_remove(declined, auth.uid()) else declined end
   where id = p_idea
  returning interested;
$$;

create or replace function public.set_decline(p_idea uuid, p_on boolean)
returns uuid[] language sql security invoker set search_path = public as $$
  update public.ideas
     set declined = case
           when p_on then array(select distinct unnest(declined || auth.uid()))
           else array_remove(declined, auth.uid()) end,
         interested = case when p_on then array_remove(interested, auth.uid()) else interested end
   where id = p_idea
  returning declined;
$$;

revoke execute on function public.set_decline(uuid, boolean) from public, anon;
grant execute on function public.set_decline(uuid, boolean) to authenticated;
