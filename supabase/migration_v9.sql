-- Migration v9: contas_pagar, fornecedores, campanhas, metas_produto
-- Executar no Supabase SQL Editor

begin;

-- ── Contas a Pagar ───────────────────────────────────────────────────────────
create table if not exists contas_pagar (
  id            text primary key,
  user_id       uuid references auth.users not null,
  descricao     text not null,
  categoria     text not null default '',
  valor         numeric(12,2) not null,
  vencimento    date not null,
  status        text not null default 'pendente',
  pago_em       date,
  recorrente    boolean not null default false,
  loja          text not null default 'Ambas',
  observacoes   text,
  created_at    timestamptz default now()
);
alter table contas_pagar enable row level security;
drop policy if exists "contas_pagar_own" on contas_pagar;
create policy "contas_pagar_own" on contas_pagar for all using (user_id = auth.uid());

-- ── Fornecedores ─────────────────────────────────────────────────────────────
create table if not exists fornecedores (
  id                text primary key,
  user_id           uuid references auth.users not null,
  nome              text not null,
  telefone          text,
  email             text,
  cnpj              text,
  lead_time_dias    int not null default 0,
  termos_pagamento  text,
  observacoes       text,
  created_at        timestamptz default now()
);
alter table fornecedores enable row level security;
drop policy if exists "fornecedores_own" on fornecedores;
create policy "fornecedores_own" on fornecedores for all using (user_id = auth.uid());

-- ── Campanhas ────────────────────────────────────────────────────────────────
create table if not exists campanhas (
  id          text primary key,
  user_id     uuid references auth.users not null,
  nome        text not null,
  inicio      date not null,
  fim         date not null,
  desconto    numeric(5,2) not null default 0,
  skus        text[] not null default '{}',
  cor         text not null default '#18B37A',
  observacoes text,
  created_at  timestamptz default now()
);
alter table campanhas enable row level security;
drop policy if exists "campanhas_own" on campanhas;
create policy "campanhas_own" on campanhas for all using (user_id = auth.uid());

-- ── Metas por Produto ────────────────────────────────────────────────────────
create table if not exists metas_produto (
  user_id       uuid references auth.users not null,
  sku           text not null,
  mes_ano       text not null,
  meta_unidades int,
  meta_receita  numeric(12,2),
  created_at    timestamptz default now(),
  primary key (user_id, sku, mes_ano)
);
alter table metas_produto enable row level security;
drop policy if exists "metas_produto_own" on metas_produto;
create policy "metas_produto_own" on metas_produto for all using (user_id = auth.uid());

commit;
