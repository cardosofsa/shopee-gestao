-- ──────────────────────────────────────────────────────────────────────────────
-- Migration v15 — Plano "Monte do seu jeito" + métricas de receita
-- Execução: Supabase Studio → SQL Editor → rodar tudo de uma vez
-- ──────────────────────────────────────────────────────────────────────────────
begin;

-- ── Campos para plano personalizável ─────────────────────────────────────────
alter table public.plans
  add column if not exists is_custom        boolean      not null default false,
  add column if not exists price_per_module numeric(6,2) not null default 0;

-- ── Plano "Monte do seu jeito" ────────────────────────────────────────────────
insert into public.plans (id, nome, price_brl, price_per_module, modules_included, active, is_custom)
values ('custom', 'Monte do seu jeito', 29.90, 9.90, '{}', true, true)
on conflict (id) do update
  set nome             = excluded.nome,
      price_brl        = excluded.price_brl,
      price_per_module = excluded.price_per_module,
      is_custom        = excluded.is_custom,
      active           = excluded.active;

-- ── Admin pode ler e alterar subscriptions ───────────────────────────────────
-- (necessário para GAP-02: admin altera plano de assinante via tenant detail)
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'subscriptions' and policyname = 'subscriptions_admin_all'
  ) then
    create policy subscriptions_admin_all on public.subscriptions
      for all using (public.is_admin());
  end if;
end $$;

-- ── RPC: métricas de receita para o dashboard admin ──────────────────────────
create or replace function public.get_admin_metrics()
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_mrr          numeric;
  v_churn_count  int;
  v_total_active int;
  v_arpu         numeric;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;

  -- MRR: soma dos preços dos planos de todos os assinantes com status active
  select coalesce(sum(p.price_brl), 0) into v_mrr
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.status = 'active';

  -- Churn: cancelamentos nos últimos 30 dias
  select count(*)::int into v_churn_count
  from public.subscriptions
  where status = 'canceled'
    and updated_at >= now() - interval '30 days';

  -- Total com assinaturas ativas
  select count(*)::int into v_total_active
  from public.subscriptions
  where status = 'active';

  -- ARPU (Average Revenue Per User)
  v_arpu := case
    when v_total_active > 0 then round(v_mrr / v_total_active, 2)
    else 0
  end;

  return jsonb_build_object(
    'mrr',          v_mrr,
    'churn_count',  v_churn_count,
    'total_active', v_total_active,
    'arpu',         v_arpu
  );
end;
$$;

commit;
