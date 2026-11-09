-- PList: segundo perfil administrador para la cuenta propietaria.
-- El PIN nunca se guarda en texto plano.

create table if not exists public.admin_allowlist (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_allowlist enable row level security;

create or replace function public.admin_account_allowed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_allowlist where user_id = auth.uid());
$$;

create or replace function public.admin_status()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.admin_account_allowed()
    and exists (select 1 from public.admin_security where owner_user_id = auth.uid());
$$;

create or replace function public.set_admin_pin(new_pin text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare salt text;
begin
  if not public.admin_account_allowed() then raise exception 'Esta cuenta no puede activar el perfil administrador'; end if;
  if new_pin !~ '^[0-9]{4}$' then raise exception 'El PIN debe tener exactamente cuatro dígitos'; end if;
  salt := gen_salt('bf');
  insert into public.admin_security (owner_user_id, pin_hash, pin_salt)
  values (auth.uid(), crypt(new_pin, salt), salt)
  on conflict (owner_user_id) do update set
    pin_hash = crypt(new_pin, salt),
    pin_salt = salt,
    failed_attempts = 0,
    blocked_until = null,
    updated_at = now();
  return true;
end;
$$;

create or replace function public.verify_admin_pin(candidate_pin text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare security_row public.admin_security%rowtype; session_id uuid;
begin
  if not public.admin_account_allowed() then return null; end if;
  select * into security_row from public.admin_security where owner_user_id = auth.uid() for update;
  if security_row.owner_user_id is null then return null; end if;
  if security_row.blocked_until is not null and security_row.blocked_until > now() then return null; end if;

  if crypt(candidate_pin, security_row.pin_hash) = security_row.pin_hash then
    insert into public.admin_sessions (owner_user_id, expires_at)
    values (auth.uid(), now() + interval '30 minutes')
    returning id into session_id;
    update public.admin_security set failed_attempts = 0, blocked_until = null, updated_at = now() where owner_user_id = auth.uid();
    return session_id;
  end if;

  update public.admin_security
  set failed_attempts = failed_attempts + 1,
      blocked_until = case when failed_attempts + 1 >= 5 then now() + interval '15 minutes' else blocked_until end,
      updated_at = now()
  where owner_user_id = auth.uid();
  return null;
end;
$$;

create or replace function public.admin_session_valid(target_session uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_sessions
    where id = target_session and owner_user_id = auth.uid() and expires_at > now()
  );
$$;

create or replace function public.admin_delete_recipe(target_session uuid, target_recipe uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_session_valid(target_session) then raise exception 'Sesión administradora no válida'; end if;
  delete from public.recipes where id = target_recipe;
  return true;
end;
$$;

create or replace function public.admin_delete_comment(target_session uuid, target_comment uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.admin_session_valid(target_session) then raise exception 'Sesión administradora no válida'; end if;
  delete from public.recipe_comments where id = target_comment;
  return true;
end;
$$;

revoke all on function public.admin_account_allowed() from public;
grant execute on function public.admin_account_allowed() to authenticated;
revoke all on function public.admin_status() from public;
grant execute on function public.admin_status() to authenticated;
revoke all on function public.set_admin_pin(text) from public;
grant execute on function public.set_admin_pin(text) to authenticated;
revoke all on function public.verify_admin_pin(text) from public;
grant execute on function public.verify_admin_pin(text) to authenticated;
revoke all on function public.admin_session_valid(uuid) from public;
grant execute on function public.admin_session_valid(uuid) to authenticated;
revoke all on function public.admin_delete_recipe(uuid, uuid) from public;
grant execute on function public.admin_delete_recipe(uuid, uuid) to authenticated;
revoke all on function public.admin_delete_comment(uuid, uuid) from public;
grant execute on function public.admin_delete_comment(uuid, uuid) to authenticated;
