-- ================================================================
-- CORE — Business OS
-- Migration Completa (v2 → v8)
-- Executar no Supabase Dashboard → SQL Editor
-- Idempotente: seguro rodar mesmo que partes já tenham sido aplicadas
-- ================================================================

begin;

-- ════════════════════════════════════════════════════════════════
-- V2 — Fundação: PK composta, configuracoes, updated_at, RLS
-- ════════════════════════════════════════════════════════════════

-- Função auxiliar: mantém updated_at sincronizado
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Corrigir PK de produtos: sku → (sku, user_id)
do $$ declare v_pk_cols int; begin
  select array_length(i.indkey, 1) into v_pk_cols
  from pg_constraint c
  join pg_index     i on i.indexrelid = c.conindid
  where c.conrelid = 'produtos'::regclass and c.contype = 'p';

  if v_pk_cols = 1 then
    alter table produtos drop constraint produtos_pkey;
    alter table produtos add primary key (sku, user_id);
  end if;
end $$;

-- created_at / updated_at em todas as tabelas
alter table produtos         add column if not exists created_at timestamptz not null default now();
alter table produtos         add column if not exists updated_at timestamptz not null default now();
alter table pedidos          add column if not exists created_at timestamptz not null default now();
alter table pedidos          add column if not exists updated_at timestamptz not null default now();
alter table compras          add column if not exists created_at timestamptz not null default now();
alter table compras          add column if not exists updated_at timestamptz not null default now();
alter table despesas         add column if not exists created_at timestamptz not null default now();
alter table despesas         add column if not exists updated_at timestamptz not null default now();
alter table historico_mensal add column if not exists created_at timestamptz not null default now();
alter table historico_mensal add column if not exists updated_at timestamptz not null default now();

-- tarefas: renomear criado_em → created_at + adicionar updated_at
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tarefas' and column_name = 'criado_em'
  ) then
    alter table tarefas rename column criado_em to created_at;
  end if;
end $$;
alter table tarefas add column if not exists updated_at timestamptz not null default now();

-- Nova tabela: configuracoes (por usuário)
create table if not exists configuracoes (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  aliquota_das         numeric(5,4) not null default 0,
  percentual_marketing numeric(5,4) not null default 0.02,
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

-- CHECK constraints
alter table produtos
  drop constraint if exists chk_produto_loja,
  add  constraint chk_produto_loja
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas'));

alter table pedidos
  drop constraint if exists chk_pedido_status,
  add  constraint chk_pedido_status
    check (status in ('Em processo', 'Enviado', 'Concluído', 'Devolvido'));

alter table pedidos  alter column loja set default 'Cardoso e-Shop';
alter table compras  alter column loja set default 'Cardoso e-Shop';

alter table despesas
  drop constraint if exists chk_despesa_categoria,
  add  constraint chk_despesa_categoria
    check (categoria in ('Embalagem', 'Combustível', 'Insumos', 'Mercadoria', 'Marketing', 'Outro')),
  drop constraint if exists chk_despesa_loja,
  add  constraint chk_despesa_loja
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas')),
  alter column loja set default 'Ambas';

alter table tarefas
  drop constraint if exists chk_tarefa_coluna,
  add  constraint chk_tarefa_coluna
    check (coluna in ('todo', 'in_progress', 'done')),
  drop constraint if exists chk_tarefa_prioridade,
  add  constraint chk_tarefa_prioridade
    check (prioridade in ('baixa', 'media', 'alta'));

-- Triggers updated_at
drop trigger if exists trg_updated_at_produtos         on produtos;
drop trigger if exists trg_updated_at_pedidos          on pedidos;
drop trigger if exists trg_updated_at_compras          on compras;
drop trigger if exists trg_updated_at_despesas         on despesas;
drop trigger if exists trg_updated_at_tarefas          on tarefas;
drop trigger if exists trg_updated_at_historico_mensal on historico_mensal;
drop trigger if exists trg_updated_at_configuracoes    on configuracoes;

create trigger trg_updated_at_produtos
  before update on produtos for each row execute function update_updated_at_column();
create trigger trg_updated_at_pedidos
  before update on pedidos for each row execute function update_updated_at_column();
create trigger trg_updated_at_compras
  before update on compras for each row execute function update_updated_at_column();
create trigger trg_updated_at_despesas
  before update on despesas for each row execute function update_updated_at_column();
create trigger trg_updated_at_tarefas
  before update on tarefas for each row execute function update_updated_at_column();
create trigger trg_updated_at_historico_mensal
  before update on historico_mensal for each row execute function update_updated_at_column();
create trigger trg_updated_at_configuracoes
  before update on configuracoes for each row execute function update_updated_at_column();

-- RLS
alter table configuracoes enable row level security;

drop policy if exists "own_produtos"       on produtos;
drop policy if exists "own_pedidos"        on pedidos;
drop policy if exists "own_compras"        on compras;
drop policy if exists "own_despesas"       on despesas;
drop policy if exists "own_tarefas"        on tarefas;
drop policy if exists "own_historico"      on historico_mensal;
drop policy if exists "own_configuracoes"  on configuracoes;

create policy "own_produtos"      on produtos         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_pedidos"       on pedidos          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_compras"       on compras          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_despesas"      on despesas         for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_tarefas"       on tarefas          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_historico"     on historico_mensal for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own_configuracoes" on configuracoes    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices
create index if not exists idx_pedidos_user_data  on pedidos (user_id, data);
create index if not exists idx_pedidos_user_sku   on pedidos (user_id, sku);
create index if not exists idx_despesas_user_data on despesas (user_id, data);
create index if not exists idx_compras_user_data  on compras (user_id, data);
create index if not exists idx_compras_user_sku   on compras (user_id, sku);
create index if not exists idx_produtos_user_loja on produtos (user_id, loja);

-- ════════════════════════════════════════════════════════════════
-- V3 — Triggers de estoque + audit trail
-- ════════════════════════════════════════════════════════════════

create table if not exists movimentacoes_estoque (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  sku          text        not null,
  delta        integer     not null,
  origem       text        not null check (origem in ('pedido', 'compra', 'ajuste')),
  ref_id       text,
  motivo       text        not null default '',
  estoque_apos integer     not null,
  created_at   timestamptz not null default now()
);

alter table movimentacoes_estoque enable row level security;
drop policy if exists "own_movimentacoes" on movimentacoes_estoque;
create policy "own_movimentacoes"
  on movimentacoes_estoque for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_mov_user_sku  on movimentacoes_estoque (user_id, sku);
create index if not exists idx_mov_user_data on movimentacoes_estoque (user_id, created_at desc);
create index if not exists idx_mov_origem    on movimentacoes_estoque (user_id, origem);

create table if not exists ajustes_estoque (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  sku        text        not null,
  data       date        not null default current_date,
  delta      integer     not null,
  motivo     text        not null default '',
  created_at timestamptz not null default now()
);

alter table ajustes_estoque enable row level security;
drop policy if exists "own_ajustes_estoque" on ajustes_estoque;
create policy "own_ajustes_estoque"
  on ajustes_estoque for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_ajustes_user_sku  on ajustes_estoque (user_id, sku);
create index if not exists idx_ajustes_user_data on ajustes_estoque (user_id, data desc);

-- Trigger: mudança de status de pedido → movimentação de estoque
create or replace function trg_movimentacao_pedido()
returns trigger language plpgsql security definer as $$
declare
  v_delta   integer;
  v_motivo  text;
  v_estoque integer;
begin
  if TG_OP <> 'UPDATE'         then return new; end if;
  if old.status = new.status   then return new; end if;
  if new.loja = 'Projetando'   then return new; end if;

  v_delta := null;

  if new.status in ('Enviado', 'Concluído') and old.status = 'Em processo' then
    v_delta  := -new.unidades_estoque;
    v_motivo := 'Pedido ' || new.status;
  elsif new.status = 'Devolvido' and old.status in ('Enviado', 'Concluído') then
    v_delta  := new.unidades_estoque;
    v_motivo := 'Devolução de pedido';
  end if;

  if v_delta is null then return new; end if;

  select estoque_atual into v_estoque
  from produtos where sku = new.sku and user_id = new.user_id;

  insert into movimentacoes_estoque (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values (new.user_id, new.sku, v_delta, 'pedido', new.id, v_motivo, coalesce(v_estoque, 0));

  return new;
end;
$$;

drop trigger if exists trg_mov_pedido on pedidos;
create trigger trg_mov_pedido
  after update on pedidos
  for each row execute function trg_movimentacao_pedido();

-- Trigger: compra registrada/editada/excluída → movimentação de estoque
create or replace function trg_movimentacao_compra()
returns trigger language plpgsql security definer as $$
declare
  v_delta integer; v_motivo text; v_sku text; v_uid uuid; v_ref text; v_estoque integer;
begin
  if TG_OP = 'INSERT' then
    v_delta := new.quantidade_entrada; v_motivo := 'Compra registrada'; v_sku := new.sku; v_uid := new.user_id; v_ref := new.id;
  elsif TG_OP = 'DELETE' then
    v_delta := -old.quantidade_entrada; v_motivo := 'Compra excluída'; v_sku := old.sku; v_uid := old.user_id; v_ref := old.id;
  elsif TG_OP = 'UPDATE' then
    if old.quantidade_entrada = new.quantidade_entrada and old.sku = new.sku then
      return coalesce(new, old);
    end if;
    v_delta := new.quantidade_entrada - old.quantidade_entrada; v_motivo := 'Compra atualizada'; v_sku := new.sku; v_uid := new.user_id; v_ref := new.id;
  end if;

  select estoque_atual into v_estoque from produtos where sku = v_sku and user_id = v_uid;

  insert into movimentacoes_estoque (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values (v_uid, v_sku, v_delta, 'compra', v_ref, v_motivo, coalesce(v_estoque, 0));

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_mov_compra on compras;
create trigger trg_mov_compra
  after insert or update or delete on compras
  for each row execute function trg_movimentacao_compra();

-- Trigger: ajuste manual → movimentação de estoque
create or replace function trg_movimentacao_ajuste()
returns trigger language plpgsql security definer as $$
declare v_estoque integer;
begin
  select estoque_atual into v_estoque from produtos where sku = new.sku and user_id = new.user_id;

  insert into movimentacoes_estoque (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values (new.user_id, new.sku, new.delta, 'ajuste', new.id::text, new.motivo, coalesce(v_estoque, 0));

  return new;
end;
$$;

drop trigger if exists trg_mov_ajuste on ajustes_estoque;
create trigger trg_mov_ajuste
  after insert on ajustes_estoque
  for each row execute function trg_movimentacao_ajuste();

-- ════════════════════════════════════════════════════════════════
-- V4 — Log de importações
-- ════════════════════════════════════════════════════════════════

create table if not exists importacoes_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  importado_em timestamptz not null default now(),
  formato      text not null check (formato in ('shopee_nativo', 'upseller', 'generico')),
  total        integer not null,
  novos        integer not null,
  duplicados   integer not null,
  loja         text
);

alter table importacoes_log enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'importacoes_log' and policyname = 'importacoes_log_owner') then
    create policy importacoes_log_owner on importacoes_log
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_importacoes_user on importacoes_log(user_id, importado_em desc);

-- ════════════════════════════════════════════════════════════════
-- V5 — Planos e assinaturas (SaaS schema)
-- ════════════════════════════════════════════════════════════════

create table if not exists plans (
  id                  text primary key,
  nome                text not null,
  limite_pedidos_mes  integer,
  limite_skus         integer,
  limite_usuarios     integer not null default 1,
  features            jsonb not null default '{}'
);

insert into plans (id, nome, limite_pedidos_mes, limite_skus, limite_usuarios, features) values
  ('free',            'Free',            100,   20,   1,  '{"dre":false,"importAuto":false,"exportXlsx":false,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('starter',         'Starter',         500,   50,   1,  '{"dre":false,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('pro',             'Pro',             3000,  null, 1,  '{"dre":true,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":false}'),
  ('max',             'Max',             10000, null, 1,  '{"dre":true,"importAuto":true,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":true,"api":false,"multiLoja":false}'),
  ('cowork_starter',  'CoWork Starter',  5000,  null, 3,  '{"dre":true,"importAuto":false,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":false,"api":false,"multiLoja":true}'),
  ('cowork_titanium', 'CoWork Titanium', null,  null, 10, '{"dre":true,"importAuto":true,"exportXlsx":true,"kanban":true,"calculadora":true,"relatoriosPdf":true,"api":true,"multiLoja":true}')
on conflict (id) do nothing;

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

alter table plans enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'plans' and policyname = 'plans_public_read') then
    create policy plans_public_read on plans for select using (true);
  end if;
end $$;

alter table subscriptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'subscriptions' and policyname = 'subscriptions_owner') then
    create policy subscriptions_owner on subscriptions
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_subscriptions_plan on subscriptions(plan_id);

-- Trigger: inserir subscription Free ao criar usuário
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
  if not exists (select 1 from pg_trigger where tgname = 'on_auth_user_created_subscription') then
    create trigger on_auth_user_created_subscription
      after insert on auth.users
      for each row execute procedure handle_new_user_subscription();
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════
-- V6 — Google Calendar tokens
-- ════════════════════════════════════════════════════════════════

create table if not exists google_calendar_tokens (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  calendar_id  text not null default 'primary',
  sync_enabled boolean not null default true,
  last_sync_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table google_calendar_tokens enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'google_calendar_tokens' and policyname = 'gcal_owner') then
    create policy gcal_owner on google_calendar_tokens
      using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

create index if not exists idx_gcal_tokens_user on google_calendar_tokens(user_id);

-- ════════════════════════════════════════════════════════════════
-- V7 — CoWork: organizations, org_members, org_invites
-- ════════════════════════════════════════════════════════════════

create table if not exists organizations (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  owner      uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table organizations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'organizations' and policyname = 'org_owner_full') then
    create policy org_owner_full on organizations
      using (owner = auth.uid()) with check (owner = auth.uid());
  end if;
end $$;

create table if not exists org_members (
  org_id    uuid not null references organizations(id) on delete cascade,
  user_id   uuid not null references auth.users(id)   on delete cascade,
  role      text not null default 'operador' check (role in ('owner', 'admin', 'operador', 'viewer')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

alter table org_members enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'organizations' and policyname = 'org_members_read') then
    create policy org_members_read on organizations for select
      using (id in (select org_id from org_members where user_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_members' and policyname = 'org_members_see_peers') then
    create policy org_members_see_peers on org_members for select
      using (org_id in (select org_id from org_members m2 where m2.user_id = auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_members' and policyname = 'org_admins_manage') then
    create policy org_admins_manage on org_members
      using (org_id in (select org_id from org_members m2 where m2.user_id = auth.uid() and m2.role in ('owner', 'admin')))
      with check (org_id in (select org_id from org_members m2 where m2.user_id = auth.uid() and m2.role in ('owner', 'admin')));
  end if;
end $$;

create table if not exists org_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'operador' check (role in ('admin', 'operador', 'viewer')),
  token      uuid not null default gen_random_uuid() unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

alter table org_invites enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_invites' and policyname = 'org_invites_admins') then
    create policy org_invites_admins on org_invites
      using (org_id in (select org_id from org_members m where m.user_id = auth.uid() and m.role in ('owner', 'admin')))
      with check (org_id in (select org_id from org_members m where m.user_id = auth.uid() and m.role in ('owner', 'admin')));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'org_invites' and policyname = 'org_invites_token_read') then
    create policy org_invites_token_read on org_invites for select
      using (used_at is null and expires_at > now());
  end if;
end $$;

create index if not exists idx_org_members_user  on org_members(user_id);
create index if not exists idx_org_members_org   on org_members(org_id);
create index if not exists idx_org_invites_token on org_invites(token);
create index if not exists idx_org_invites_email on org_invites(email);

-- Trigger: owner vira membro automático ao criar org
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
  if not exists (select 1 from pg_trigger where tgname = 'on_org_created_add_owner') then
    create trigger on_org_created_add_owner
      after insert on organizations
      for each row execute procedure handle_org_owner_member();
  end if;
end $$;

-- ════════════════════════════════════════════════════════════════
-- V8 — Leads (captura de marketing / landing page)
-- ════════════════════════════════════════════════════════════════

create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text,
  telefone   text,
  origem     text not null default 'landing' check (origem in ('landing', 'lancamento', 'popup')),
  created_at timestamptz not null default now()
);

alter table leads enable row level security;

drop policy if exists leads_insert_public on leads;
create policy leads_insert_public on leads
  for insert with check (true);

create index if not exists idx_leads_origem  on leads(origem);
create index if not exists idx_leads_created on leads(created_at desc);
create index if not exists idx_leads_email   on leads(email) where email is not null;

-- ════════════════════════════════════════════════════════════════
-- Verificação final
-- ════════════════════════════════════════════════════════════════
do $$ declare
  tabelas text[] := array[
    'configuracoes','movimentacoes_estoque','ajustes_estoque',
    'importacoes_log','plans','subscriptions',
    'google_calendar_tokens','organizations','org_members','org_invites','leads'
  ];
  t text;
  ok boolean;
begin
  raise notice '=== Verificação Migration Complete ===';
  foreach t in array tabelas loop
    select exists(
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) into ok;
    raise notice '  %-35s %s', t, case when ok then '✓' else '✗ FALHOU' end;
  end loop;
  raise notice '======================================';
end $$;

commit;
