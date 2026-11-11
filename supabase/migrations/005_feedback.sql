-- PList: sugerencias e incidencias enviadas por los usuarios.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_email text not null check (position('@' in contact_email) > 1),
  category text not null check (category in ('suggestion', 'bug', 'content', 'other')),
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists feedback_self_insert on public.feedback;
create policy feedback_self_insert on public.feedback
  for insert with check (user_id = auth.uid());

drop policy if exists feedback_self_read on public.feedback;
create policy feedback_self_read on public.feedback
  for select using (user_id = auth.uid());
