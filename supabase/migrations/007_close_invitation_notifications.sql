-- PList: cerrar la notificación original cuando se responde a una invitación.

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

  update public.notifications
  set read_at = now()
  where user_id = auth.uid()
    and type = 'list_invitation'
    and metadata->>'invitation_id' = invitation.id::text
    and read_at is null;

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

revoke all on function public.respond_list_invitation(uuid, text) from public;
grant execute on function public.respond_list_invitation(uuid, text) to authenticated;
