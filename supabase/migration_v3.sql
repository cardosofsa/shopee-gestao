-- ================================================================
-- Shopee Gestão — Migration v3
-- Data: 2026-06-20
-- ================================================================
-- Executar no Supabase Dashboard > SQL Editor
-- Idempotente: seguro re-executar caso alguma etapa já tenha sido
-- aplicada parcialmente.
-- ================================================================

begin;

-- ────────────────────────────────────────────────────────────────
-- 1. Tabela de audit trail de movimentações de estoque
-- ────────────────────────────────────────────────────────────────
create table if not exists movimentacoes_estoque (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users(id) on delete cascade,
  sku          text        not null,
  delta        integer     not null,   -- positivo = entrada, negativo = saída
  origem       text        not null    -- 'pedido' | 'compra' | 'ajuste'
    check (origem in ('pedido', 'compra', 'ajuste')),
  ref_id       text,                   -- id do pedido / compra / ajuste
  motivo       text        not null default '',
  estoque_apos integer     not null,   -- snapshot do estoque após o movimento
  created_at   timestamptz not null default now()
);

-- RLS
alter table movimentacoes_estoque enable row level security;

drop policy if exists "own_movimentacoes" on movimentacoes_estoque;
create policy "own_movimentacoes"
  on movimentacoes_estoque for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices
create index if not exists idx_mov_user_sku    on movimentacoes_estoque (user_id, sku);
create index if not exists idx_mov_user_data   on movimentacoes_estoque (user_id, created_at desc);
create index if not exists idx_mov_origem      on movimentacoes_estoque (user_id, origem);

-- ────────────────────────────────────────────────────────────────
-- 2. Tabela de ajustes manuais de estoque (persistência real)
-- ────────────────────────────────────────────────────────────────
create table if not exists ajustes_estoque (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  sku        text        not null,
  data       date        not null default current_date,
  delta      integer     not null,
  motivo     text        not null default '',
  created_at timestamptz not null default now()
);

-- RLS
alter table ajustes_estoque enable row level security;

drop policy if exists "own_ajustes_estoque" on ajustes_estoque;
create policy "own_ajustes_estoque"
  on ajustes_estoque for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Índices
create index if not exists idx_ajustes_user_sku  on ajustes_estoque (user_id, sku);
create index if not exists idx_ajustes_user_data on ajustes_estoque (user_id, data desc);

-- ────────────────────────────────────────────────────────────────
-- 3. Trigger: registrar movimentação quando pedido muda de status
--
--    Regras de negócio:
--    Em processo → Enviado/Concluído : saída (−unidades_estoque)
--    Enviado/Concluído → Devolvido   : entrada (+unidades_estoque)
--    Loja 'Projetando'               : ignorar (pedido simulado)
-- ────────────────────────────────────────────────────────────────
create or replace function trg_movimentacao_pedido()
returns trigger language plpgsql security definer as $$
declare
  v_delta   integer;
  v_motivo  text;
  v_estoque integer;
begin
  -- Só atua em UPDATE de status e fora de pedidos 'Projetando'
  if TG_OP <> 'UPDATE'               then return new; end if;
  if old.status = new.status         then return new; end if;
  if new.loja   = 'Projetando'       then return new; end if;

  v_delta := null;

  if new.status in ('Enviado', 'Concluído') and old.status = 'Em processo' then
    v_delta  := -new.unidades_estoque;
    v_motivo := 'Pedido ' || new.status;
  elsif new.status = 'Devolvido' and old.status in ('Enviado', 'Concluído') then
    v_delta  := new.unidades_estoque;
    v_motivo := 'Devolução de pedido';
  end if;

  if v_delta is null then return new; end if;

  -- Snapshot do estoque atual após o movimento
  select estoque_atual into v_estoque
  from produtos
  where sku = new.sku and user_id = new.user_id;

  insert into movimentacoes_estoque
    (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values
    (new.user_id, new.sku, v_delta, 'pedido', new.id, v_motivo, coalesce(v_estoque, 0));

  return new;
end;
$$;

drop trigger if exists trg_mov_pedido on pedidos;
create trigger trg_mov_pedido
  after update on pedidos
  for each row execute function trg_movimentacao_pedido();

-- ────────────────────────────────────────────────────────────────
-- 4. Trigger: registrar movimentação quando compra é inserida/
--    atualizada/deletada
-- ────────────────────────────────────────────────────────────────
create or replace function trg_movimentacao_compra()
returns trigger language plpgsql security definer as $$
declare
  v_delta   integer;
  v_motivo  text;
  v_sku     text;
  v_uid     uuid;
  v_ref     text;
  v_estoque integer;
begin
  if TG_OP = 'INSERT' then
    v_delta  := new.quantidade_entrada;
    v_motivo := 'Compra registrada';
    v_sku    := new.sku;
    v_uid    := new.user_id;
    v_ref    := new.id;
  elsif TG_OP = 'DELETE' then
    v_delta  := -old.quantidade_entrada;
    v_motivo := 'Compra excluída';
    v_sku    := old.sku;
    v_uid    := old.user_id;
    v_ref    := old.id;
  elsif TG_OP = 'UPDATE' then
    -- Só registra se a quantidade ou SKU mudou
    if old.quantidade_entrada = new.quantidade_entrada and old.sku = new.sku then
      return coalesce(new, old);
    end if;
    v_delta  := new.quantidade_entrada - old.quantidade_entrada;
    v_motivo := 'Compra atualizada';
    v_sku    := new.sku;
    v_uid    := new.user_id;
    v_ref    := new.id;
  end if;

  select estoque_atual into v_estoque
  from produtos
  where sku = v_sku and user_id = v_uid;

  insert into movimentacoes_estoque
    (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values
    (v_uid, v_sku, v_delta, 'compra', v_ref, v_motivo, coalesce(v_estoque, 0));

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_mov_compra on compras;
create trigger trg_mov_compra
  after insert or update or delete on compras
  for each row execute function trg_movimentacao_compra();

-- ────────────────────────────────────────────────────────────────
-- 5. Trigger: registrar movimentação quando ajuste é inserido
-- ────────────────────────────────────────────────────────────────
create or replace function trg_movimentacao_ajuste()
returns trigger language plpgsql security definer as $$
declare
  v_estoque integer;
begin
  select estoque_atual into v_estoque
  from produtos
  where sku = new.sku and user_id = new.user_id;

  insert into movimentacoes_estoque
    (user_id, sku, delta, origem, ref_id, motivo, estoque_apos)
  values
    (new.user_id, new.sku, new.delta, 'ajuste', new.id::text, new.motivo, coalesce(v_estoque, 0));

  return new;
end;
$$;

drop trigger if exists trg_mov_ajuste on ajustes_estoque;
create trigger trg_mov_ajuste
  after insert on ajustes_estoque
  for each row execute function trg_movimentacao_ajuste();

-- ────────────────────────────────────────────────────────────────
-- Verificação pós-migração
-- ────────────────────────────────────────────────────────────────
do $$ declare
  mov_ok    boolean;
  ajust_ok  boolean;
  trg_ped   boolean;
  trg_comp  boolean;
  trg_ajust boolean;
begin
  select exists(select 1 from information_schema.tables
    where table_schema='public' and table_name='movimentacoes_estoque') into mov_ok;
  select exists(select 1 from information_schema.tables
    where table_schema='public' and table_name='ajustes_estoque') into ajust_ok;
  select exists(select 1 from information_schema.triggers
    where trigger_name='trg_mov_pedido') into trg_ped;
  select exists(select 1 from information_schema.triggers
    where trigger_name='trg_mov_compra') into trg_comp;
  select exists(select 1 from information_schema.triggers
    where trigger_name='trg_mov_ajuste') into trg_ajust;

  raise notice '=== Verificação Migration v3 ===';
  raise notice 'movimentacoes_estoque criada: %', mov_ok;
  raise notice 'ajustes_estoque criada:       %', ajust_ok;
  raise notice 'trigger pedidos:              %', trg_ped;
  raise notice 'trigger compras:              %', trg_comp;
  raise notice 'trigger ajustes:              %', trg_ajust;
  raise notice '================================';
end $$;

commit;
