-- ================================================================
-- Shopee Gestão — Migration v2
-- Data: 2026-06-19
-- ================================================================
-- Executar no Supabase Dashboard > SQL Editor (modo single run)
-- Idempotente: seguro re-executar caso alguma etapa já tenha sido
-- aplicada parcialmente.
-- ================================================================

begin;

-- ────────────────────────────────────────────────────────────────
-- 1. Função auxiliar: mantém updated_at sincronizado
-- ────────────────────────────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ────────────────────────────────────────────────────────────────
-- 2. Corrigir PK de produtos: sku → (sku, user_id)
--    Dois usuários diferentes podiam ter o mesmo SKU e colidir.
-- ────────────────────────────────────────────────────────────────
do $$ declare v_pk_cols int; begin
  select array_length(i.indkey, 1) into v_pk_cols
  from pg_constraint c
  join pg_index     i on i.indexrelid = c.conindid
  where c.conrelid = 'produtos'::regclass and c.contype = 'p';

  if v_pk_cols = 1 then
    -- PK antiga é só sku; recriar como composta
    alter table produtos drop constraint produtos_pkey;
    alter table produtos add primary key (sku, user_id);
  end if;
end $$;

-- ────────────────────────────────────────────────────────────────
-- 3. Adicionar created_at / updated_at em todas as tabelas
-- ────────────────────────────────────────────────────────────────
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

-- ────────────────────────────────────────────────────────────────
-- 4. tarefas: renomear criado_em → created_at + adicionar updated_at
-- ────────────────────────────────────────────────────────────────
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'tarefas' and column_name = 'criado_em'
  ) then
    alter table tarefas rename column criado_em to created_at;
  end if;
end $$;

alter table tarefas add column if not exists updated_at timestamptz not null default now();

-- ────────────────────────────────────────────────────────────────
-- 5. Nova tabela: configuracoes (por usuário, no Supabase)
-- ────────────────────────────────────────────────────────────────
create table if not exists configuracoes (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  aliquota_das         numeric(5,4) not null default 0,      -- decimal: 0.06 = 6%
  percentual_marketing numeric(5,4) not null default 0.02,   -- decimal: 0.02 = 2%
  created_at           timestamptz  not null default now(),
  updated_at           timestamptz  not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- 6. CHECK constraints — integridade dos valores enum-like
-- ────────────────────────────────────────────────────────────────

-- produtos.loja
alter table produtos
  drop constraint if exists chk_produto_loja,
  add  constraint chk_produto_loja
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas'));

-- pedidos.status
alter table pedidos
  drop constraint if exists chk_pedido_status,
  add  constraint chk_pedido_status
    check (status in ('Em processo', 'Enviado', 'Concluído', 'Devolvido'));

-- pedidos.loja / compras.loja — default para a loja principal
alter table pedidos  alter column loja set default 'Cardoso e-Shop';
alter table compras  alter column loja set default 'Cardoso e-Shop';

-- despesas.categoria + loja
alter table despesas
  drop constraint if exists chk_despesa_categoria,
  add  constraint chk_despesa_categoria
    check (categoria in ('Embalagem', 'Combustível', 'Insumos', 'Mercadoria', 'Marketing', 'Outro')),
  drop constraint if exists chk_despesa_loja,
  add  constraint chk_despesa_loja
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas')),
  alter column loja set default 'Ambas';

-- tarefas.coluna + prioridade
alter table tarefas
  drop constraint if exists chk_tarefa_coluna,
  add  constraint chk_tarefa_coluna
    check (coluna in ('todo', 'in_progress', 'done')),
  drop constraint if exists chk_tarefa_prioridade,
  add  constraint chk_tarefa_prioridade
    check (prioridade in ('baixa', 'media', 'alta'));

-- ────────────────────────────────────────────────────────────────
-- 7. Triggers: atualização automática de updated_at
-- ────────────────────────────────────────────────────────────────
drop trigger if exists trg_updated_at_produtos         on produtos;
drop trigger if exists trg_updated_at_pedidos          on pedidos;
drop trigger if exists trg_updated_at_compras          on compras;
drop trigger if exists trg_updated_at_despesas         on despesas;
drop trigger if exists trg_updated_at_tarefas          on tarefas;
drop trigger if exists trg_updated_at_historico_mensal on historico_mensal;
drop trigger if exists trg_updated_at_configuracoes    on configuracoes;

create trigger trg_updated_at_produtos
  before update on produtos
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_pedidos
  before update on pedidos
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_compras
  before update on compras
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_despesas
  before update on despesas
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_tarefas
  before update on tarefas
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_historico_mensal
  before update on historico_mensal
  for each row execute function update_updated_at_column();

create trigger trg_updated_at_configuracoes
  before update on configuracoes
  for each row execute function update_updated_at_column();

-- ────────────────────────────────────────────────────────────────
-- 8. RLS — configuracoes (tabelas existentes: recriar idempotente)
-- ────────────────────────────────────────────────────────────────
alter table configuracoes enable row level security;

-- Recriar todas as políticas (drop + create é o caminho mais seguro)
drop policy if exists "own_produtos"       on produtos;
drop policy if exists "own_pedidos"        on pedidos;
drop policy if exists "own_compras"        on compras;
drop policy if exists "own_despesas"       on despesas;
drop policy if exists "own_tarefas"        on tarefas;
drop policy if exists "own_historico"      on historico_mensal;
drop policy if exists "own_configuracoes"  on configuracoes;

create policy "own_produtos"
  on produtos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_pedidos"
  on pedidos for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_compras"
  on compras for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_despesas"
  on despesas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_tarefas"
  on tarefas for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_historico"
  on historico_mensal for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own_configuracoes"
  on configuracoes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 9. Índices adicionais
-- ────────────────────────────────────────────────────────────────
-- Existentes (mantidos com if not exists)
create index if not exists idx_pedidos_user_data  on pedidos (user_id, data);
create index if not exists idx_pedidos_user_sku   on pedidos (user_id, sku);
create index if not exists idx_despesas_user_data on despesas (user_id, data);
create index if not exists idx_compras_user_data  on compras (user_id, data);

-- Novos
create index if not exists idx_compras_user_sku   on compras (user_id, sku);
create index if not exists idx_produtos_user_loja  on produtos (user_id, loja);

-- ────────────────────────────────────────────────────────────────
-- Verificação rápida pós-migração
-- ────────────────────────────────────────────────────────────────
do $$ declare
  tbl_ok  boolean;
  cfg_ok  boolean;
  pk_cols int;
begin
  -- Tabela configuracoes existe?
  select exists(
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'configuracoes'
  ) into cfg_ok;

  -- PK de produtos é composta?
  select array_length(i.indkey, 1) into pk_cols
  from pg_constraint c join pg_index i on i.indexrelid = c.conindid
  where c.conrelid = 'produtos'::regclass and c.contype = 'p';

  -- created_at em pedidos existe?
  select exists(
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'pedidos' and column_name = 'created_at'
  ) into tbl_ok;

  raise notice '=== Verificação Migration v2 ===';
  raise notice 'configuracoes criada:    %', cfg_ok;
  raise notice 'produtos PK composta:    %', (pk_cols = 2);
  raise notice 'pedidos.created_at ok:   %', tbl_ok;
  raise notice '================================';
end $$;

commit;
