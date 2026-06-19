-- ================================================================
-- Shopee Gestão — Schema Completo v2
-- Schema de referência. Para banco já existente, use migration_v2.sql
-- ================================================================

-- ── Função updated_at ────────────────────────────────────────
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ── produtos ──────────────────────────────────────────────────
create table if not exists produtos (
  sku               text          not null,
  user_id           uuid          not null references auth.users(id) on delete cascade,
  nome              text          not null default '',
  categoria         text          not null default '',
  loja              text          not null default 'Cardoso e-Shop'
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas')),
  custo_unitario    numeric(10,2) not null default 0,
  estoque_seguranca integer       not null default 0,
  estoque_atual     integer       not null default 0,
  ativo             boolean       not null default true,
  created_at        timestamptz   not null default now(),
  updated_at        timestamptz   not null default now(),
  primary key (sku, user_id)
);

-- ── pedidos ───────────────────────────────────────────────────
create table if not exists pedidos (
  id                     text          primary key,
  user_id                uuid          not null references auth.users(id) on delete cascade,
  numero_pedido          text          not null default '',
  data                   date          not null,
  status                 text          not null default 'Em processo'
    check (status in ('Em processo', 'Enviado', 'Concluído', 'Devolvido')),
  loja                   text          not null default 'Cardoso e-Shop',
  sku                    text          not null default '',
  produto                text          not null default '',
  quantidade             integer       not null default 1,
  multiplicador_kit      integer       not null default 1,
  unidades_estoque       integer       not null default 1,
  receita                numeric(10,2) not null default 0,
  desconto               numeric(10,2) not null default 0,
  custo_total            numeric(10,2) not null default 0,
  taxa_shopee            numeric(10,2) not null default 0,
  das_imposto            numeric(10,2) not null default 0,
  ads_marketing          numeric(10,2) not null default 0,
  lucro_operacional      numeric(10,2) not null default 0,
  margem_s_custo_produto numeric(10,2) not null default 0,
  margem_s_custo_total   numeric(10,2) not null default 0,
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now()
);

-- ── compras ───────────────────────────────────────────────────
create table if not exists compras (
  id                 text          primary key,
  user_id            uuid          not null references auth.users(id) on delete cascade,
  sku                text          not null default '',
  produto            text          not null default '',
  data               date          not null,
  quantidade_entrada integer       not null default 1,
  custo_unitario     numeric(10,2) not null default 0,
  custo_total        numeric(10,2) not null default 0,
  fornecedor         text          not null default '',
  nf_ref             text          not null default '',
  pagamento          text          not null default '',
  parcelas           integer       not null default 1,
  valor_parcela      numeric(10,2) not null default 0,
  loja               text          not null default 'Cardoso e-Shop',
  observacoes        text          not null default '',
  created_at         timestamptz   not null default now(),
  updated_at         timestamptz   not null default now()
);

-- ── despesas ─────────────────────────────────────────────────
create table if not exists despesas (
  id          text          primary key,
  user_id     uuid          not null references auth.users(id) on delete cascade,
  data        date          not null,
  categoria   text          not null default 'Outro'
    check (categoria in ('Embalagem', 'Combustível', 'Insumos', 'Mercadoria', 'Marketing', 'Outro')),
  descricao   text          not null default '',
  valor       numeric(10,2) not null default 0,
  loja        text          not null default 'Ambas'
    check (loja in ('Cardoso e-Shop', 'Projetando', 'Ambas')),
  compra_ref  text,  -- FK lógica → compras.id; null para despesas manuais
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

-- ── tarefas ───────────────────────────────────────────────────
create table if not exists tarefas (
  id               text        primary key,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  titulo           text        not null default '',
  descricao        text        not null default '',
  coluna           text        not null default 'todo'
    check (coluna in ('todo', 'in_progress', 'done')),
  posicao          integer     not null default 0,
  data_vencimento  date,
  prioridade       text        not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── historico_mensal ──────────────────────────────────────────
create table if not exists historico_mensal (
  mes_ano                text          not null,  -- 'YYYY-MM'
  user_id                uuid          not null references auth.users(id) on delete cascade,
  faturamento_bruto      numeric(10,2) not null default 0,
  pedidos_qtd            integer       not null default 0,
  ticket_medio           numeric(10,2) not null default 0,
  unidades_vendidas      integer       not null default 0,
  cmv                    numeric(10,2) not null default 0,
  taxas_shopee           numeric(10,2) not null default 0,
  das_imposto            numeric(10,2) not null default 0,
  marketing_ads          numeric(10,2) not null default 0,
  despesas_operacionais  numeric(10,2) not null default 0,
  lucro_bruto            numeric(10,2) not null default 0,
  lucro_operacional      numeric(10,2) not null default 0,
  lucro_liquido          numeric(10,2) not null default 0,
  margem_percentual      numeric(10,2) not null default 0,
  created_at             timestamptz   not null default now(),
  updated_at             timestamptz   not null default now(),
  primary key (mes_ano, user_id)
);

-- ── configuracoes ─────────────────────────────────────────────
create table if not exists configuracoes (
  user_id              uuid          primary key references auth.users(id) on delete cascade,
  aliquota_das         numeric(5,4)  not null default 0,      -- 0.06 = 6%
  percentual_marketing numeric(5,4)  not null default 0.02,   -- 0.02 = 2%
  created_at           timestamptz   not null default now(),
  updated_at           timestamptz   not null default now()
);

-- ── Row Level Security ────────────────────────────────────────
alter table produtos         enable row level security;
alter table pedidos          enable row level security;
alter table compras          enable row level security;
alter table despesas         enable row level security;
alter table tarefas          enable row level security;
alter table historico_mensal enable row level security;
alter table configuracoes    enable row level security;

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

-- ── Triggers updated_at ───────────────────────────────────────
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

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_pedidos_user_data  on pedidos (user_id, data);
create index if not exists idx_pedidos_user_sku   on pedidos (user_id, sku);
create index if not exists idx_despesas_user_data on despesas (user_id, data);
create index if not exists idx_compras_user_data  on compras (user_id, data);
create index if not exists idx_compras_user_sku   on compras (user_id, sku);
create index if not exists idx_produtos_user_loja  on produtos (user_id, loja);
