-- PList: invitaciones reales, notificaciones y colaboración en listas.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('list_invitation', 'recipe', 'system')),
  title text not null,
  body text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_self_read on public.notifications;
create policy notifications_self_read on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notifications_self_update on public.notifications;
create policy notifications_self_update on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists invitations_owner_create on public.list_invitations;
create policy invitations_owner_create on public.list_invitations
  for insert with check (
    inviter_id = auth.uid()
    and exists (select 1 from public.shopping_lists where id = list_id and owner_id = auth.uid())
  );

drop policy if exists invitations_invitee_update on public.list_invitations;
create policy invitations_invitee_update on public.list_invitations
  for update using (invitee_id = auth.uid()) with check (invitee_id = auth.uid());

create or replace function public.ensure_list_owner_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.list_members (list_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (list_id, user_id) do update set role = 'owner';
  return new;
end;
$$;

drop trigger if exists shopping_lists_owner_member on public.shopping_lists;
create trigger shopping_lists_owner_member
  after insert on public.shopping_lists
  for each row execute function public.ensure_list_owner_member();

create or replace function public.notify_list_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare list_name text;
begin
  select name into list_name from public.shopping_lists where id = new.list_id;
  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    new.invitee_id,
    'list_invitation',
    'Invitación a una lista compartida',
    'Te han invitado a colaborar en «' || coalesce(list_name, 'una lista') || '».',
    jsonb_build_object('invitation_id', new.id, 'list_id', new.list_id, 'inviter_id', new.inviter_id)
  );
  return new;
end;
$$;

drop trigger if exists list_invitation_notification on public.list_invitations;
create trigger list_invitation_notification
  after insert on public.list_invitations
  for each row execute function public.notify_list_invitation();

create or replace function public.create_list_invitation(target_list uuid, target_nickname text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare target_user uuid; new_invitation uuid;
begin
  if not exists (select 1 from public.shopping_lists where id = target_list and owner_id = auth.uid()) then
    raise exception 'No tienes permiso para compartir esta lista';
  end if;

  select id into target_user
  from public.profiles
  where lower(nickname) = lower(trim(target_nickname));

  if target_user is null then raise exception 'No existe ningún usuario con ese apodo'; end if;
  if target_user = auth.uid() then raise exception 'No puedes invitarte a ti mismo'; end if;

  if exists (
    select 1 from public.list_members
    where list_id = target_list and user_id = target_user
  ) then raise exception 'Ese usuario ya forma parte de la lista'; end if;

  insert into public.list_invitations (list_id, inviter_id, invitee_id)
  values (target_list, auth.uid(), target_user)
  returning id into new_invitation;
  return new_invitation;
end;
$$;

create or replace function public.respond_list_invitation(target_invitation uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare invitation public.list_invitations%rowtype; list_name text;
begin
  if decision not in ('accepted', 'rejected') then raise exception 'Respuesta no válida'; end if;

  select * into invitation
  from public.list_invitations
  where id = target_invitation and invitee_id = auth.uid()
  for update;

  if invitation.id is null then raise exception 'Invitación no encontrada'; end if;
  if invitation.status <> 'pending' then raise exception 'Esta invitación ya fue respondida'; end if;

  update public.list_invitations
  set status = decision, responded_at = now()
  where id = invitation.id;

  select name into list_name from public.shopping_lists where id = invitation.list_id;
  if decision = 'accepted' then
    insert into public.list_members (list_id, user_id, role)
    values (invitation.list_id, auth.uid(), 'collaborator')
    on conflict (list_id, user_id) do update set role = 'collaborator';
  end if;

  insert into public.notifications (user_id, type, title, body, metadata)
  values (
    invitation.inviter_id,
    'list_invitation',
    case when decision = 'accepted' then 'Invitación aceptada' else 'Invitación rechazada' end,
    'La invitación para «' || coalesce(list_name, 'la lista') || '» ha sido ' || case when decision = 'accepted' then 'aceptada' else 'rechazada' end || '.',
    jsonb_build_object('invitation_id', invitation.id, 'list_id', invitation.list_id, 'decision', decision)
  );
end;
$$;

revoke all on function public.create_list_invitation(uuid, text) from public;
grant execute on function public.create_list_invitation(uuid, text) to authenticated;
revoke all on function public.respond_list_invitation(uuid, text) from public;
grant execute on function public.respond_list_invitation(uuid, text) to authenticated;

-- Un colaborador puede marcar cualquier producto como comprado, pero solo
-- puede editar o eliminar los productos que él mismo haya creado.
drop policy if exists items_member_access on public.shopping_items;
drop policy if exists items_member_read on public.shopping_items;
drop policy if exists items_member_insert on public.shopping_items;
drop policy if exists items_owner_or_author_update on public.shopping_items;
drop policy if exists items_owner_or_author_delete on public.shopping_items;

create policy items_member_read on public.shopping_items
  for select using (public.is_list_member(list_id));

create policy items_member_insert on public.shopping_items
  for insert with check (public.is_list_member(list_id) and created_by = auth.uid());

create policy items_owner_or_author_update on public.shopping_items
  for update using (public.is_list_member(list_id) and (public.is_list_owner(list_id) or created_by = auth.uid()))
  with check (public.is_list_member(list_id) and (public.is_list_owner(list_id) or created_by = auth.uid()));

create policy items_owner_or_author_delete on public.shopping_items
  for delete using (public.is_list_member(list_id) and (public.is_list_owner(list_id) or created_by = auth.uid()));
