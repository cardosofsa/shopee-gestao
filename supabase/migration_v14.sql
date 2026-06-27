-- ──────────────────────────────────────────────────────────────────────────────
-- Migration v14 — Segurança admin + realtime módulos + ranking real
-- Execução: Supabase Studio → SQL Editor → rodar tudo de uma vez
-- ──────────────────────────────────────────────────────────────────────────────
begin;

-- ── Funções RPC seguras para admin (substituem admin_tenants_view) ─────────────
-- A view não aplica RLS. As funções abaixo usam security definer + is_admin().

create or replace function public.get_admin_tenants()
returns table (
  user_id             uuid,
  email               text,
  registered_at       timestamptz,
  last_sign_in_at     timestamptz,
  segment             text,
  business_name       text,
  onboarding_done     boolean,
  plan_id             text,
  subscription_status text,
  pedidos_mes_atual   int,
  total_pedidos       bigint,
  total_skus          bigint,
  active_modules      bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
  select
    u.id                                                                  as user_id,
    u.email::text,
    u.created_at                                                          as registered_at,
    u.last_sign_in_at,
    coalesce(tp.segment, 'ecommerce')::text                              as segment,
    coalesce(tp.business_name, '')::text                                  as business_name,
    coalesce(tp.onboarding_done, false)                                   as onboarding_done,
    s.plan_id::text,
    s.status::text                                                        as subscription_status,
    coalesce(s.pedidos_mes_atual, 0)                                      as pedidos_mes_atual,
    (select count(*) from public.pedidos p    where p.user_id  = u.id)   as total_pedidos,
    (select count(*) from public.produtos pr  where pr.user_id = u.id)   as total_skus,
    (select count(*) from public.tenant_modules tm
     where tm.user_id = u.id and tm.enabled = true)                      as active_modules
  from auth.users u
  left join public.tenant_profiles tp on tp.user_id = u.id
  left join public.subscriptions    s  on s.user_id  = u.id
  order by u.created_at desc;
end;
$$;

create or replace function public.get_admin_tenant(p_user_id uuid)
returns table (
  user_id             uuid,
  email               text,
  registered_at       timestamptz,
  last_sign_in_at     timestamptz,
  segment             text,
  business_name       text,
  onboarding_done     boolean,
  plan_id             text,
  subscription_status text,
  pedidos_mes_atual   int,
  total_pedidos       bigint,
  total_skus          bigint,
  active_modules      bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
  select
    u.id                                                                  as user_id,
    u.email::text,
    u.created_at                                                          as registered_at,
    u.last_sign_in_at,
    coalesce(tp.segment, 'ecommerce')::text                              as segment,
    coalesce(tp.business_name, '')::text                                  as business_name,
    coalesce(tp.onboarding_done, false)                                   as onboarding_done,
    s.plan_id::text,
    s.status::text                                                        as subscription_status,
    coalesce(s.pedidos_mes_atual, 0)                                      as pedidos_mes_atual,
    (select count(*) from public.pedidos p    where p.user_id  = u.id)   as total_pedidos,
    (select count(*) from public.produtos pr  where pr.user_id = u.id)   as total_skus,
    (select count(*) from public.tenant_modules tm
     where tm.user_id = u.id and tm.enabled = true)                      as active_modules
  from auth.users u
  left join public.tenant_profiles tp on tp.user_id = u.id
  left join public.subscriptions    s  on s.user_id  = u.id
  where u.id = p_user_id;
end;
$$;

-- ── Ranking real de módulos (QA-01) ───────────────────────────────────────────
create or replace function public.get_module_usage()
returns table (
  module_key  text,
  usage_count bigint
)
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
  select tm.module_key::text, count(*)::bigint as usage_count
  from public.tenant_modules tm
  where tm.enabled = true
  group by tm.module_key
  order by usage_count desc;
end;
$$;

-- ── Realtime para tenant_modules (GAP-04) ─────────────────────────────────────
-- Permite que TenantContext receba updates em tempo real ao ser editado pelo admin.
-- DO block ignora 42710 (already member) para que a migration seja idempotente.
do $$
begin
  alter publication supabase_realtime add table public.tenant_modules;
exception when duplicate_object then
  null; -- já estava na publication, tudo certo
end;
$$;

commit;
