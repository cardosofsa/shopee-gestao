-- migration_v5: tabelas de planos e assinaturas (schema SaaS, sem billing)
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: usa IF NOT EXISTS + ON CONFLICT DO NOTHING

begin;

-- ── Tabela plans ──────────────────────────────────────────────
create table if not exists plans (
  id                  text primary key,
  nome                text not null,
  limite_pedidos_mes  integer,          -- NULL = ilimitado
  limite_skus         integer,          -- NULL = ilimitado
  limite_usuarios     integer not null default 1,
  features            jsonb not null default '{}'
);

-- Seed dos planos (idempotente via ON CONFLICT DO NOTHING)
insert into plans (id, nome, limite_pedidos_mes, limite_skus, limite_usuarios, features) values
  ('free',             'Free',             100,   20,   1,  '{"dre":false,"importAuto":false,"exportXlsx":false,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('starter',          'Starter',          500,   50,   1,  '{"dre":false,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('pro',              'Pro',              3000,  null, 1,  '{"dre":true,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('max',              'Max',              10000, null, 1,  '{"dre":true,"importAuto":true,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":true,"api":false,"multiLoja":false}'),
  ('cowork_starter',   'CoWork Starter',   5000,  null, 3,  '{"dre":true,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":true}'),
  ('cowork_titanium',  'CoWork Titanium',  null,  null, 10, '{"dre":true,"importAuto":true,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":true,"api":true,"multiLoja":true}')
on conflict (id) do nothing;

-- ── Tabela subscriptions ──────────────────────────────────────
create table if not exists subscriptions (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  plan_id            text not null references plans(id) default 'free',
  status             text not null default 'active' check (status in ('active', 'trialing', 'canceled', 'past_due')),
  pedidos_mes_atual  integer not null default 0,
  periodo_inicio     date,
  periodo_fim        date,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
-- plans é pública (apenas leitura)
alter table plans enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'plans' and policyname = 'plans_public_read'
  ) then
    create policy plans_public_read on plans for select using (true);
  end if;
end $$;

-- subscriptions: cada user vê apenas a própria
alter table subscriptions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'subscriptions_owner'
  ) then
    create policy subscriptions_owner on subscriptions
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_subscriptions_plan on subscriptions(plan_id);

-- ── Trigger: inserir subscription Free ao criar usuário ───────
create or replace function handle_new_user_subscription()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, plan_id, status, periodo_inicio)
  values (new.id, 'free', 'active', current_date)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

do $$ begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created_subscription'
  ) then
    create trigger on_auth_user_created_subscription
      after insert on auth.users
      for each row execute procedure handle_new_user_subscription();
  end if;
end $$;

-- ── Verificação ───────────────────────────────────────────────
do $$
declare
  plans_ok   boolean;
  subs_ok    boolean;
  planos_qtd integer;
begin
  select exists (select 1 from information_schema.tables where table_name = 'plans')        into plans_ok;
  select exists (select 1 from information_schema.tables where table_name = 'subscriptions') into subs_ok;
  select count(*) from plans into planos_qtd;

  if plans_ok and subs_ok and planos_qtd = 6 then
    raise notice 'migration_v5 OK — plans (% tiers) e subscriptions criadas.', planos_qtd;
  else
    raise exception 'migration_v5 FALHOU — plans_ok=%, subs_ok=%, planos=%', plans_ok, subs_ok, planos_qtd;
  end if;
end $$;

commit;
