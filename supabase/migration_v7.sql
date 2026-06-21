-- migration_v7: CoWork — organizations, org_members, org_invites
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: usa IF NOT EXISTS
--
-- ⚠️  NOTA SOBRE RLS:
-- As tabelas operacionais (pedidos, produtos, etc.) usam `user_id = auth.uid()`.
-- Para acesso compartilhado entre membros de uma org, as políticas RLS precisarão
-- ser migradas para verificar `org_id` em vez de `user_id`. Essa migração (v8+)
-- deve ser planejada separadamente para não quebrar usuários solo existentes.

begin;

-- ── Organizations ─────────────────────────────────────────────
create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  owner      uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'organizations' and policyname = 'org_owner_full'
  ) then
    create policy org_owner_full on organizations
      using (owner = auth.uid())
      with check (owner = auth.uid());
  end if;
end $$;

-- ── Org Members ───────────────────────────────────────────────
-- (criada antes de org_members_read em organizations, pois a policy faz subquery aqui)
create table if not exists org_members (
  org_id    uuid not null references organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id)   on delete cascade,
  role      text not null default 'operador'
            check (role in ('owner', 'admin', 'operador', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table org_members enable row level security;

-- Policy em organizations que depende de org_members (movida para cá)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'organizations' and policyname = 'org_members_read'
  ) then
    create policy org_members_read on organizations for select
      using (
        id in (
          select org_id from org_members where user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Membros da mesma org podem ver uns aos outros
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'org_members' and policyname = 'org_members_see_peers'
  ) then
    create policy org_members_see_peers on org_members for select
      using (
        org_id in (
          select org_id from org_members m2 where m2.user_id = auth.uid()
        )
      );
  end if;
end $$;

-- Owner/admin podem gerenciar membros
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'org_members' and policyname = 'org_admins_manage'
  ) then
    create policy org_admins_manage on org_members
      using (
        org_id in (
          select org_id from org_members m2
          where m2.user_id = auth.uid()
            and m2.role in ('owner', 'admin')
        )
      )
      with check (
        org_id in (
          select org_id from org_members m2
          where m2.user_id = auth.uid()
            and m2.role in ('owner', 'admin')
        )
      );
  end if;
end $$;

-- ── Org Invites ───────────────────────────────────────────────
create table if not exists org_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'operador'
             check (role in ('admin', 'operador', 'viewer')),
  token      uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table org_invites enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'org_invites' and policyname = 'org_invites_admins'
  ) then
    create policy org_invites_admins on org_invites
      using (
        org_id in (
          select org_id from org_members m
          where m.user_id = auth.uid()
            and m.role in ('owner', 'admin')
        )
      )
      with check (
        org_id in (
          select org_id from org_members m
          where m.user_id = auth.uid()
            and m.role in ('owner', 'admin')
        )
      );
  end if;
end $$;

-- Token público: qualquer um com o link pode ler o invite (para aceitar)
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'org_invites' and policyname = 'org_invites_token_read'
  ) then
    create policy org_invites_token_read on org_invites for select
      using (used_at is null and expires_at > now());
  end if;
end $$;

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_org_members_user  on org_members(user_id);
create index if not exists idx_org_members_org   on org_members(org_id);
create index if not exists idx_org_invites_token on org_invites(token);
create index if not exists idx_org_invites_email on org_invites(email);

-- ── Trigger: owner vira membro automático ao criar org ────────
create or replace function handle_org_owner_member()
returns trigger language plpgsql security definer as $$
begin
  insert into public.org_members (org_id, user_id, role)
  values (new.id, new.owner, 'owner')
  on conflict do nothing;
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_org_created_add_owner'
  ) then
    create trigger on_org_created_add_owner
      after insert on organizations
      for each row execute procedure handle_org_owner_member();
  end if;
end $$;

-- ── Verificação ───────────────────────────────────────────────
do $$
declare orgs_ok boolean; members_ok boolean; invites_ok boolean;
begin
  select exists(select 1 from information_schema.tables where table_name='organizations') into orgs_ok;
  select exists(select 1 from information_schema.tables where table_name='org_members')   into members_ok;
  select exists(select 1 from information_schema.tables where table_name='org_invites')   into invites_ok;

  if orgs_ok and members_ok and invites_ok then
    raise notice 'migration_v7 OK — organizations, org_members, org_invites criadas.';
  else
    raise exception 'migration_v7 FALHOU — orgs=%, members=%, invites=%', orgs_ok, members_ok, invites_ok;
  end if;
end $$;

commit;
