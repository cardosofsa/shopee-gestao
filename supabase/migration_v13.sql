-- ──────────────────────────────────────────────────────────────────────────────
-- Migration v13 — Admin Panel + Sistema Modular
-- Execução: Supabase Studio → SQL Editor → rodar bloco a bloco na ordem abaixo
-- ──────────────────────────────────────────────────────────────────────────────
begin;

-- ── admin_users ───────────────────────────────────────────────────────────────
-- Lista de user_ids que são administradores da plataforma.
-- Inserção manual via Supabase Studio pelo dono após criação da tabela.
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Function segura para checar admin (evita expor a tabela ao cliente)
-- security definer = executa com privilégios do criador (não do caller)
create or replace function public.is_admin()
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  );
end;
$$;

-- Admin pode ler e inserir na própria tabela (via Studio, service_role ignora RLS)
create policy admin_users_admin_all on public.admin_users
  for all using (public.is_admin());

-- ── tenant_profiles ───────────────────────────────────────────────────────────
-- Perfil de configuração de cada assinante.
create table if not exists public.tenant_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  segment         text not null default 'ecommerce'
                  check (segment in ('ecommerce','varejo','atacado','servicos','industria')),
  business_name   text not null default '',
  onboarding_done boolean not null default false,
  term_pedido     text not null default 'Pedido',
  term_cliente    text not null default 'Cliente',
  term_produto    text not null default 'Produto',
  term_receita    text not null default 'Faturamento',
  term_loja       text not null default 'Loja',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.tenant_profiles enable row level security;

-- Usuário lê/edita apenas o próprio perfil
create policy tenant_profile_owner on public.tenant_profiles
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admin lê todos os perfis
create policy tenant_profile_admin_read on public.tenant_profiles
  for select using (public.is_admin());

-- Admin edita qualquer perfil
create policy tenant_profile_admin_write on public.tenant_profiles
  for all using (public.is_admin());

-- Trigger: criar profile automaticamente ao registrar usuário
create or replace function public.handle_new_user_tenant_profile()
returns trigger language plpgsql security definer as $$
begin
  insert into public.tenant_profiles (user_id, segment, business_name, onboarding_done)
  values (new.id, 'ecommerce', '', false)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_tenant_profile on auth.users;
create trigger on_auth_user_created_tenant_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_tenant_profile();

-- ── tenant_modules ────────────────────────────────────────────────────────────
-- Módulos ativos por assinante (controle granular por admin).
create table if not exists public.tenant_modules (
  user_id    uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  enabled    boolean not null default true,
  config     jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  primary key (user_id, module_key)
);

alter table public.tenant_modules enable row level security;

-- Usuário lê seus próprios módulos (mas não escreve — só admin escreve)
create policy tenant_modules_owner_read on public.tenant_modules
  for select using (user_id = auth.uid());

-- Admin lê e altera tudo
create policy tenant_modules_admin_all on public.tenant_modules
  for all using (public.is_admin());

-- ── admin_audit_log ───────────────────────────────────────────────────────────
-- Log imutável de todas as ações do admin.
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references auth.users(id),
  action      text not null,
  target_user uuid references auth.users(id),
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

-- Apenas admin cria e lê logs — sem DELETE policy (append-only)
create policy audit_log_admin on public.admin_audit_log
  for all using (public.is_admin());

-- ── Atualizar tabela plans ────────────────────────────────────────────────────
alter table public.plans
  add column if not exists modules_included text[]     not null default '{}',
  add column if not exists price_brl        numeric(10,2) not null default 0,
  add column if not exists active           boolean      not null default true;

-- Módulos core para planos free/starter
update public.plans
set modules_included = array[
  'pedidos','estoque','compras','clientes','financeiro',
  'despesas','analise','alertas','calculadora','tarefas','exportar'
]
where id in ('free','starter');

-- Todos os módulos para planos max/cowork_titanium
update public.plans
set modules_included = array[
  'pedidos','estoque','compras','clientes','devolucoes','importar',
  'financeiro','dre','fluxo_caixa','despesas','contas_pagar','break_even',
  'analise','curva_abc','comparativo','sazonalidade','insights','alertas',
  'campanhas','ads','calculadora','precificacao',
  'tarefas','calendario','metas','reposicao','fornecedores','relatorio','exportar'
]
where id in ('max','cowork_titanium');

-- ── View admin: visão consolidada de todos os tenants ─────────────────────────
create or replace view public.admin_tenants_view as
select
  u.id                                                               as user_id,
  u.email,
  u.created_at                                                       as registered_at,
  u.last_sign_in_at,
  coalesce(tp.segment, 'ecommerce')                                 as segment,
  coalesce(tp.business_name, '')                                    as business_name,
  coalesce(tp.onboarding_done, false)                               as onboarding_done,
  s.plan_id,
  s.status                                                           as subscription_status,
  coalesce(s.pedidos_mes_atual, 0)                                  as pedidos_mes_atual,
  s.periodo_fim,
  (select count(*) from public.pedidos p  where p.user_id  = u.id) as total_pedidos,
  (select count(*) from public.produtos pr where pr.user_id = u.id) as total_skus,
  (
    select count(*) from public.tenant_modules tm
    where tm.user_id = u.id and tm.enabled = true
  )                                                                  as active_modules
from auth.users u
left join public.tenant_profiles tp on tp.user_id = u.id
left join public.subscriptions   s  on s.user_id  = u.id;

commit;

-- ── Pós-execução: inserir seu user_id como admin ──────────────────────────────
-- Execute SEPARADAMENTE após o commit acima, substituindo o UUID:
-- insert into public.admin_users (user_id)
-- values ('<SEU_USER_ID_DO_SUPABASE>')
-- on conflict do nothing;
