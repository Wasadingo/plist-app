create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (nickname ~ '^[a-zA-Z0-9_]{3,24}$'),
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_path text,
  birth_year smallint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  kind text not null default 'personal' check (kind in ('personal','shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.list_members (
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','collaborator')),
  joined_at timestamptz not null default now(),
  primary key (list_id, user_id)
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 160),
  quantity text not null default '1 unidad',
  is_purchased boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text not null default '',
  ingredients jsonb not null default '[]'::jsonb,
  preparation text not null default '',
  photo_path text,
  video_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 15 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ratings (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  first_rated_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table public.recipe_favorites (
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recipe_id, user_id)
);

create table public.list_invitations (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.shopping_lists(id) on delete cascade,
  inviter_id uuid not null references auth.users(id),
  invitee_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id),
  recipe_id uuid references public.recipes(id) on delete set null,
  comment_id uuid references public.recipe_comments(id) on delete set null,
  reason text not null,
  status text not null default 'open' check (status in ('open','reviewing','resolved')),
  created_at timestamptz not null default now()
);

create table public.admin_security (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  pin_salt text not null,
  failed_attempts integer not null default 0,
  blocked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  resource text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.shopping_lists enable row level security;
alter table public.list_members enable row level security;
alter table public.shopping_items enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_comments enable row level security;
alter table public.recipe_ratings enable row level security;
alter table public.recipe_favorites enable row level security;
alter table public.list_invitations enable row level security;
alter table public.reports enable row level security;
alter table public.admin_security enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.is_list_member(target_list uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.list_members where list_id = target_list and user_id = auth.uid());
$$;

create or replace function public.is_list_owner(target_list uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.shopping_lists where id = target_list and owner_id = auth.uid());
$$;

create policy profiles_self on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy lists_member_read on public.shopping_lists for select using (public.is_list_member(id));
create policy lists_owner_write on public.shopping_lists for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy members_visible_to_member on public.list_members for select using (public.is_list_member(list_id));
create policy items_member_access on public.shopping_items for all using (public.is_list_member(list_id)) with check (public.is_list_member(list_id));
create policy published_recipes_read on public.recipes for select using (published = true or author_id = auth.uid());
create policy recipe_author_write on public.recipes for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy comments_read on public.recipe_comments for select using (auth.uid() is not null);
create policy comments_author_write on public.recipe_comments for all using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy ratings_own on public.recipe_ratings for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy favorites_own on public.recipe_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy invitations_participant on public.list_invitations for select using (inviter_id = auth.uid() or invitee_id = auth.uid());
create policy reports_own_create on public.reports for insert with check (reporter_id = auth.uid());

revoke all on public.admin_security from anon, authenticated;
revoke all on public.admin_sessions from anon, authenticated;
revoke all on public.admin_audit_log from anon, authenticated;
