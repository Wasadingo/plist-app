-- PList: avisos para cambios realizados en listas compartidas.

alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('list_invitation', 'list_item', 'recipe', 'system'));

create or replace function public.notify_shared_list_item_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changed_list uuid;
  actor_id uuid;
  actor_name text;
  list_name text;
  event_text text;
  item_name text;
  purchased boolean;
begin
  changed_list := coalesce(new.list_id, old.list_id);
  actor_id := coalesce(auth.uid(), new.created_by, old.created_by);

  if not exists (
    select 1 from public.shopping_lists
    where id = changed_list and kind = 'shared'
  ) then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    event_text := 'ha añadido';
    item_name := new.name;
    purchased := new.is_purchased;
  elsif tg_op = 'UPDATE' then
    if new.is_purchased is not distinct from old.is_purchased then
      return new;
    end if;
    event_text := case when new.is_purchased then 'ha marcado como comprado' else 'ha vuelto a marcar como pendiente' end;
    item_name := new.name;
    purchased := new.is_purchased;
  else
    event_text := 'ha eliminado';
    item_name := old.name;
    purchased := old.is_purchased;
  end if;

  select name into list_name from public.shopping_lists where id = changed_list;
  select coalesce(display_name, nickname, 'Un usuario')
    into actor_name
    from public.profiles
    where id = actor_id;

  insert into public.notifications (user_id, type, title, body, metadata)
  select
    member.user_id,
    'list_item',
    'Cambio en una lista compartida',
    actor_name || ' ' || event_text || ' «' || coalesce(item_name, 'un producto') || '» en «' || coalesce(list_name, 'una lista') || '».',
    jsonb_build_object(
      'list_id', changed_list,
      'item_id', coalesce(new.id, old.id),
      'actor_id', actor_id,
      'action', lower(tg_op),
      'is_purchased', purchased
    )
  from public.list_members member
  where member.list_id = changed_list
    and member.user_id <> actor_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists shared_list_item_notification on public.shopping_items;
create trigger shared_list_item_notification
  after insert or update of is_purchased or delete on public.shopping_items
  for each row execute function public.notify_shared_list_item_change();

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
