# Especificação Técnica — Gestão Shopee

> Documento de referência para banco de dados, rotas, regras de negócio e roadmap.

---

## 1. Visão Geral

Aplicativo web de gestão operacional para duas lojas no marketplace Shopee:
- **Cardoso e-Shop** — loja principal
- **Projetando** — loja secundária

Funcionalidades centrais: controle de estoque, importação de pedidos, DRE mensal, Kanban de tarefas, calculadora de precificação.

**Stack:**
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite 8 + TypeScript 6 |
| Estilo | Tailwind CSS 3 |
| Estado | Zustand 5 (persist no localStorage) |
| Gráficos | Recharts 3 |
| Ícones | Lucide React |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Export Excel | xlsx |
| Backend | Supabase Cloud (PostgreSQL + Auth + RLS) |
| Roteamento | React Router DOM 7 |

---

## 2. Banco de Dados — Schema Completo

### 2.1 Tabela `produtos`

```sql
create table produtos (
  sku              text,
  user_id          uuid references auth.users(id) on delete cascade not null,
  nome             text not null default '',
  categoria        text not null default '',
  loja             text not null default 'Cardoso e-Shop', -- 'Cardoso e-Shop' | 'Projetando' | 'Ambas'
  custo_unitario   numeric(10,2) not null default 0,
  estoque_seguranca integer not null default 0,
  estoque_atual    integer not null default 0,
  ativo            boolean not null default true,
  primary key (sku, user_id)  -- ⚠️ CORREÇÃO NECESSÁRIA: PK atual é só `sku`, precisa ser composta
);
```

**Campos calculados (frontend):**
- `statusEstoque`: derivado de `estoqueAtual`, `estoqueSeguranca`, e venda/dia dos últimos 30d
  - `Ruptura` → estoque = 0
  - `Crítico` → dias de cobertura < 7
  - `Excesso` → estoque > estoqueSeguranca × 3
  - `OK` → demais casos

**Operações DB:**
| Operação | Função | Trigger no estoque? |
|----------|--------|---------------------|
| Listar todos | `dbProdutos.getAll(uid)` | — |
| Criar/Atualizar | `dbProdutos.upsert(p, uid)` | — |
| Atualizar em lote | `dbProdutos.upsertAll(ps, uid)` | — |
| Atualizar estoque | `dbProdutos.updateEstoque(sku, qty, uid)` | — |
| Deletar | `dbProdutos.delete(sku, uid)` | — |

---

### 2.2 Tabela `pedidos`

```sql
create table pedidos (
  id                     text primary key,  -- número do pedido Shopee ou UUID
  user_id                uuid references auth.users(id) on delete cascade not null,
  numero_pedido          text not null default '',
  data                   date not null,
  status                 text not null default 'Em processo',
  -- 'Em processo' | 'Enviado' | 'Concluído' | 'Devolvido'
  loja                   text not null default '',
  sku                    text not null default '',
  produto                text not null default '',
  quantidade             integer not null default 1,     -- qtd de itens no pedido
  multiplicador_kit      integer not null default 1,     -- unidades por item (kit/pack)
  unidades_estoque       integer not null default 1,     -- quantidade × multiplicador_kit
  receita                numeric(10,2) not null default 0,
  desconto               numeric(10,2) not null default 0,
  custo_total            numeric(10,2) not null default 0,  -- custo unitário × unidades
  taxa_shopee            numeric(10,2) not null default 0,  -- comissão + taxa fixa
  das_imposto            numeric(10,2) not null default 0,
  ads_marketing          numeric(10,2) not null default 0,  -- 2% da receita por padrão
  lucro_operacional      numeric(10,2) not null default 0,
  margem_s_custo_produto numeric(10,2) not null default 0,  -- lucro / custo_produto × 100
  margem_s_custo_total   numeric(10,2) not null default 0   -- lucro / receita × 100
);
```

**Regra de negócio — Estoque:**
- `Em processo` → `Enviado` ou `Concluído`: decrementa `estoque_atual` em `unidades_estoque` (somente loja ≠ Projetando)
- `Enviado/Concluído` → `Devolvido`: incrementa `estoque_atual` em `unidades_estoque`
- **Projetando não afeta estoque** (estoque gerenciado separadamente)

**Fórmula do lucro:**
```
lucro_operacional = receita - desconto - custo_total - taxa_shopee - das_imposto - ads_marketing
```

**Operações DB:**
| Operação | Função |
|----------|--------|
| Listar todos | `dbPedidos.getAll(uid)` |
| Criar/Atualizar | `dbPedidos.upsert(p, uid)` |
| Importar em lote (500/batch) | `dbPedidos.upsertMany(ps, uid)` |
| Atualizar status | `dbPedidos.updateStatus(id, status, uid)` |
| Deletar | `dbPedidos.delete(id, uid)` |

---

### 2.3 Tabela `compras`

```sql
create table compras (
  id                 text primary key,
  user_id            uuid references auth.users(id) on delete cascade not null,
  sku                text not null default '',
  produto            text not null default '',
  data               date not null,
  quantidade_entrada integer not null default 1,
  custo_unitario     numeric(10,2) not null default 0,
  custo_total        numeric(10,2) not null default 0,  -- quantidade × custo_unitario
  fornecedor         text not null default '',
  nf_ref             text not null default '',
  pagamento          text not null default '',
  parcelas           integer not null default 1,
  valor_parcela      numeric(10,2) not null default 0,
  loja               text not null default '',
  observacoes        text not null default ''
);
```

**Regra de negócio:**
- Ao registrar compra: incrementa `estoque_atual` do produto
- Ao deletar compra: decrementa `estoque_atual` do produto
- Gera automaticamente um registro na tabela `despesas` (categoria `Mercadoria`) com `compra_ref = compra.id`
- Ao deletar compra: apaga despesa vinculada por `compra_ref`

**Operações DB:**
| Operação | Função |
|----------|--------|
| Listar todos | `dbCompras.getAll(uid)` |
| Inserir | `dbCompras.insert(c, uid)` |
| Deletar | `dbCompras.delete(id, uid)` |

---

### 2.4 Tabela `despesas`

```sql
create table despesas (
  id          text primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  data        date not null,
  categoria   text not null default 'Outro',
  -- 'Embalagem' | 'Combustível' | 'Insumos' | 'Mercadoria' | 'Marketing' | 'Outro'
  descricao   text not null default '',
  valor       numeric(10,2) not null default 0,
  loja        text not null default 'Ambas',
  -- 'Cardoso e-Shop' | 'Projetando' | 'Ambas'
  compra_ref  text  -- FK lógica para compras.id (sem constraint formal)
);
```

**Nota:** `compra_ref` vincula despesas geradas automaticamente por compras. Despesas manuais têm `compra_ref = null`.

**Operações DB:**
| Operação | Função |
|----------|--------|
| Listar todos | `dbDespesas.getAll(uid)` |
| Inserir | `dbDespesas.insert(d, uid)` |
| Deletar por compra_ref | `dbDespesas.deleteByCompraRef(compraRef, uid)` |
| Deletar por id | `dbDespesas.delete(id, uid)` |

---

### 2.5 Tabela `tarefas`

```sql
create table tarefas (
  id               text primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  titulo           text not null default '',
  descricao        text not null default '',
  coluna           text not null default 'todo',  -- 'todo' | 'in_progress' | 'done'
  posicao          integer not null default 0,
  data_vencimento  date,
  prioridade       text not null default 'media', -- 'baixa' | 'media' | 'alta'
  criado_em        timestamptz not null default now()
);
```

**Operações DB:**
| Operação | Função |
|----------|--------|
| Listar todos | `dbTarefas.getAll(uid)` |
| Inserir | `dbTarefas.insert(t, uid)` |
| Atualizar (parcial) | `dbTarefas.update(id, data, uid)` |
| Deletar | `dbTarefas.delete(id, uid)` |

---

### 2.6 Tabela `historico_mensal`

```sql
create table historico_mensal (
  mes_ano                text not null,  -- formato 'YYYY-MM'
  user_id                uuid references auth.users(id) on delete cascade not null,
  faturamento_bruto      numeric(10,2) not null default 0,
  pedidos_qtd            integer not null default 0,
  ticket_medio           numeric(10,2) not null default 0,
  unidades_vendidas      integer not null default 0,
  cmv                    numeric(10,2) not null default 0,
  taxas_shopee           numeric(10,2) not null default 0,
  das_imposto            numeric(10,2) not null default 0,
  marketing_ads          numeric(10,2) not null default 0,
  despesas_operacionais  numeric(10,2) not null default 0,
  lucro_bruto            numeric(10,2) not null default 0,
  lucro_operacional      numeric(10,2) not null default 0,
  lucro_liquido          numeric(10,2) not null default 0,
  margem_percentual      numeric(10,2) not null default 0,
  primary key (mes_ano, user_id)
);
```

**Status:** Tabela existe no schema mas **não é populada automaticamente**. A página Financeiro calcula DRE on-the-fly a partir de `pedidos` + `despesas`. O `historico_mensal` é atualmente um snapshot manual via `addHistorico`/`updateHistorico`. **Ver seção 6 — Melhorias.**

---

### 2.7 Índices e RLS

```sql
-- Índices de performance
create index idx_pedidos_user_data  on pedidos (user_id, data);
create index idx_pedidos_user_sku   on pedidos (user_id, sku);
create index idx_despesas_user_data on despesas (user_id, data);
create index idx_compras_user_data  on compras (user_id, data);

-- RLS: cada usuário acessa apenas seus dados
-- Políticas: own_produtos, own_pedidos, own_compras,
--            own_despesas, own_tarefas, own_historico
```

---

## 3. Frontend — Páginas e Funcionalidades

### 3.1 `/login` — Autenticação
- Login via email/senha com Supabase Auth
- Redireciona para `/` se já autenticado
- Ao autenticar: carrega todos os dados do usuário (`loadAndHydrate`)
- Se usuário novo (sem dados): aplica seed com dados de demonstração

---

### 3.2 `/` — Dashboard
**Dados consumidos:** `pedidos`, `produtos`, `despesas`

**Componentes:**
- **Navegação por mês** ← mês atual → (botões prev/next, bloqueia next no mês atual)
- **6 KPI Cards:**
  - Faturamento (soma `receita` dos pedidos Concluído/Enviado do mês)
  - Pedidos (contagem)
  - Lucro Operacional (soma `lucro_operacional`)
  - Despesas Operacionais (soma `despesas` do mês)
  - Ticket Médio (faturamento / pedidos)
  - Lucro Líquido (lucro operacional − das_imposto)
- **Alerta de estoque** — banner vermelho quando há produtos em ruptura/crítico abaixo do estoque de segurança
- **Gráfico de Área** — Faturamento e Lucro Op. por dia do mês selecionado
- **Gráfico de Barras** — Pedidos por dia do mês selecionado
- **Ranking de Produtos (Curva ABC)** — tabela com SKU, Pedidos, Unidades, Receita, Ticket Médio, Lucro Op., Margem, % Receita, Curva A/B/C
- **Status de Estoque** — grid cards com badge OK/Crítico/Ruptura/Excesso por produto

---

### 3.3 `/vendas` — Gestão de Pedidos
**Dados consumidos:** `pedidos`, `produtos`

**Funcionalidades:**
- **Importar CSV da Shopee** — botão abre modal de upload
  - Lê arquivo CSV/XLSX com `FileReader` + `XLSX.read`
  - Mapeia colunas: `Número do pedido`, `Data`, `Status`, `Loja`, `SKU`, `Produto`, `Quantidade`, `Receita`, `Desconto`, `Custo Total`, `Taxa Shopee`, `DAS`, `Ads`, `Lucro Operacional`, `Margem`
  - Insere via `addPedidos` em lote
- **Adicionar pedido manual** — modal com formulário completo
- **Filtros:** busca texto, status (Todos/Em processo/Enviado/Concluído/Devolvido), loja (Todas/Cardoso e-Shop/Projetando), mês
- **Tabela de pedidos** — colunas: Data, Nº Pedido, Status, Loja, SKU, Produto, Unid., Receita, Desconto, Custo, Taxa, ADS, Lucro Op., Margem
- **Alterar status** — dropdown inline por pedido (dispara lógica de estoque)
- **Deletar pedido** — botão de remoção por linha

---

### 3.4 `/estoque` — Gestão de Estoque e Compras
**Dados consumidos:** `produtos`, `pedidos`, `compras`

**Funcionalidades:**
- **Painel de Produtos** — tabela com status visual de estoque
  - Colunas: SKU, Nome, Categoria, Loja, Estoque Atual, Est. Segurança, Venda/Dia (30d), Dias Cobertura, Custo Unit., Valor Total, Status
  - Badge colorido: OK (verde), Crítico (amarelo), Ruptura (vermelho), Excesso (azul)
- **Adicionar/Editar Produto** — modal com campos: SKU, Nome, Categoria, Loja, Custo Unit., Estoque Segurança, Estoque Atual, Ativo
- **Deletar produto**
- **Registrar Compra** — modal com: SKU, Data, Qtd Entrada, Custo Unit., Custo Total (calculado), Fornecedor, NF Ref, Forma Pagamento, Parcelas, Loja, Observações
  - Incrementa estoque automaticamente
  - Gera despesa categoria Mercadoria automaticamente
- **Histórico de Compras** — tabela com todas as compras registradas
- **Deletar Compra** — reverte estoque e remove despesa vinculada

---

### 3.5 `/financeiro` — DRE Mensal
**Dados consumidos:** `pedidos`, `despesas`, `historico` (snapshot)

**Funcionalidades:**
- **Navegação por mês** (igual ao Dashboard)
- **DRE do mês selecionado:**
  - Faturamento Bruto
  - CMV (Custo Mercadoria Vendida = soma `custo_total`)
  - Lucro Bruto (Faturamento − CMV)
  - Taxas Shopee
  - Marketing / Ads
  - DAS / Imposto
  - Despesas Operacionais (da tabela `despesas`)
  - Lucro Operacional
  - Lucro Líquido
  - Margem Líquida %
- **Indicadores:** Pedidos Qtd, Ticket Médio, Unidades Vendidas
- **Botão Exportar** — gera relatório `.xlsx` com 5 abas:
  1. DRE
  2. Ranking de Produtos
  3. Pedidos do Mês
  4. Despesas do Mês
  5. Posição de Estoque

---

### 3.6 `/despesas` — Lançamento de Despesas
**Dados consumidos:** `despesas`

**Funcionalidades:**
- **Formulário de nova despesa:** Data, Categoria, Descrição, Valor, Loja
  - Categorias: Embalagem, Combustível, Insumos, Mercadoria, Marketing, Outro
- **Filtros:** busca texto, categoria, loja, mês
- **Tabela:** Data, Categoria, Descrição, Loja, Valor
  - Badge de categoria com cor
  - Indicador visual quando é despesa gerada automaticamente por compra
- **Deletar despesa** (despesas de compra não são deletáveis individualmente)
- **Totalizador do período** filtrado

---

### 3.7 `/kanban` — Quadro de Tarefas
**Dados consumidos:** `tarefas`

**Funcionalidades:**
- **3 colunas:** A Fazer (todo), Em Andamento (in_progress), Concluído (done)
- **Drag & Drop** entre colunas (`@dnd-kit`)
- **Criar tarefa** — modal com: Título, Descrição, Prioridade (baixa/média/alta), Data Vencimento
- **Editar tarefa** — clique no card abre modal de edição
- **Deletar tarefa** — botão de remoção no card
- **Badge de prioridade** — cores: alta (vermelho), média (amarelo), baixa (cinza)
- **Data de vencimento** — exibida no card, marcada em vermelho se vencida

---

### 3.8 `/calculadora` — Calculadora de Precificação
**Dados consumidos:** `configuracoes` (aliquotaDAS, percentualMarketing)

**Funcionalidades:**
- **Inputs:**
  - Custo do Produto (R$)
  - Margem Desejada (%)
  - Comissão Shopee (%) — padrão configurável
  - Taxa Fixa Shopee (R$)
  - % Ads — padrão 2%
  - Alíquota DAS (%)
- **Outputs calculados:**
  - Preço de Venda Sugerido
  - Taxa Shopee (R$)
  - Ads (R$)
  - DAS (R$)
  - Lucro Líquido (R$)
  - Margem Real (%)
- **Fórmula do preço:**
  ```
  precoVenda = (custo + taxaFixa) / (1 - comissao - ads - das - margemDesejada)
  ```
- **Simulador interativo** — atualiza em tempo real ao mudar qualquer input

---

### 3.9 `/configs` — Configurações
**Dados consumidos:** `configuracoes`, `produtos`

**Funcionalidades:**
- **Configurações globais:** Alíquota DAS (%), % Ads Marketing (padrão 2%)
- **Reset de dados** — botão para restaurar seed de demonstração
- **Gestão de Produtos** — tabela inline para editar/adicionar/deletar produtos
- **Persistência:** `configuracoes` salvas apenas no localStorage (Zustand persist), **não sincronizadas com Supabase**

---

## 4. Fluxo de Dados e Estado

```
Supabase Auth ──► AuthContext ──► useStore.loadAndHydrate()
                                       │
                          ┌────────────┴────────────────────┐
                          ▼                                  ▼
                  Carrega do Supabase              Se novo usuário:
               (produtos, pedidos, compras,        aplica SEED e
                despesas, tarefas, historico)      grava no Supabase
                          │
                          ▼
                   Zustand Store (persist)
                   ┌──────────────────────┐
                   │ produtos[]            │
                   │ pedidos[]             │
                   │ compras[]             │
                   │ despesas[]            │
                   │ tarefas[]             │
                   │ historico[]           │
                   │ configuracoes{}       │
                   └──────────────────────┘
                          │
                    Ações do usuário
                    ├── Otimistas (update local primeiro)
                    └── Async para Supabase (.catch(console.error))
```

**Nota crítica:** As ações do store são **otimistas** — atualizam o estado local imediatamente e sincronizam com o Supabase em background. Erros do Supabase são silenciados com `console.error` (sem feedback visual ao usuário).

---

## 5. Regras de Negócio Críticas

### 5.1 Curva ABC
```typescript
// Ordena por receita desc, acumula % receita
acum <= 80% → 'A'   // produtos principais
acum <= 95% → 'B'   // produtos secundários
acum >  95% → 'C'   // cauda longa
```

### 5.2 Status de Estoque
```typescript
estoqueAtual === 0                        → 'Ruptura'
diasCobertura < 7                         → 'Crítico'
estoqueAtual > estoqueSeguranca * 3       → 'Excesso'
else                                      → 'OK'

diasCobertura = estoqueAtual / vendaDia30d
vendaDia30d = unidadesVendidas30d / 30
```

### 5.3 Fórmula de Precificação
```typescript
denominador = 1 - comissaoShopee - percentualAds - aliquotaDAS - margemDesejada
precoVenda  = (custo + taxaFixa) / denominador
lucroLiq    = precoVenda - custo - (precoVenda * comissaoShopee + taxaFixa)
              - (precoVenda * percentualAds) - (precoVenda * aliquotaDAS)
margemReal  = lucroLiq / precoVenda
```

### 5.4 Impacto no Estoque por Mudança de Status
| Transição | Impacto | Lojas afetadas |
|-----------|---------|----------------|
| `Em processo` → `Enviado` | `−unidades_estoque` | Cardoso e-Shop |
| `Em processo` → `Concluído` | `−unidades_estoque` | Cardoso e-Shop |
| `Enviado` → `Devolvido` | `+unidades_estoque` | Cardoso e-Shop |
| `Concluído` → `Devolvido` | `+unidades_estoque` | Cardoso e-Shop |
| Qualquer | sem impacto | Projetando |

---

## 6. Problemas Encontrados / Melhorias Necessárias

### 6.1 Bug Crítico — PK da Tabela `produtos`
**Problema:** A coluna `sku` é a primary key sozinha. Se dois usuários tiverem o SKU `ALF-118`, o segundo INSERT falha.

**Correção necessária no schema:**
```sql
-- Migração necessária
alter table produtos drop constraint produtos_pkey;
alter table produtos add primary key (sku, user_id);
```

### 6.2 Sem Feedback de Erro nas Ações do Store
**Problema:** Erros do Supabase são silenciados com `.catch(console.error)`. O usuário não sabe se a sincronização falhou.

**Melhoria:** Adicionar toast/notificação de erro. Ex.: biblioteca `react-hot-toast`.

### 6.3 Configurações Não Sincronizadas com Supabase
**Problema:** `aliquotaDAS` e `percentualMarketing` ficam somente no localStorage. Se o usuário limpar o cache ou trocar de dispositivo, perde as configurações.

**Melhoria:** Criar tabela `configuracoes` no Supabase:
```sql
create table configuracoes (
  user_id             uuid primary key references auth.users(id) on delete cascade,
  aliquota_das        numeric(5,4) not null default 0,
  percentual_marketing numeric(5,4) not null default 0.02
);
```

### 6.4 `historico_mensal` Não Populado Automaticamente
**Problema:** A tabela existe mas o DRE é computado on-the-fly. Meses passados importados via CSV são calculados corretamente, mas o histórico não é persistido automaticamente.

**Melhoria:** Criar função de "fechar mês" que:
1. Calcula DRE final do mês
2. Persiste em `historico_mensal` via `upsert`
3. Exibe evolução mensal no Dashboard (gráfico de barras por mês)

### 6.5 Importação CSV — Mapeamento de Colunas Frágil
**Problema:** O mapeador de CSV assume nomes fixos de colunas em português. Se a Shopee mudar o export, quebra.

**Melhoria:** Adicionar etapa de mapeamento manual de colunas na UI antes do import.

### 6.6 Produtos com `sku` como PK e Duplicação por Loja
**Problema atual:** `Produto.loja` pode ser `'Ambas'`, mas o SKU é único. Isso funciona para o cenário atual, mas limita uma evolução para múltiplas lojas independentes.

### 6.7 Sem Loading States nas Telas
**Problema:** `isHydrated` existe no store mas não é usado consistentemente nas páginas para mostrar skeleton/spinner.

### 6.8 `configuracoes` sem suporte a Supabase Realtime
Para uso multi-dispositivo, as configurações precisam ser sincronizadas em tempo real.

---

## 7. Avaliação da Stack

| Item | Avaliação | Observação |
|------|-----------|------------|
| React 19 + Vite 8 | ✅ Ótimo | Última versão, performance excelente |
| TypeScript 6 | ✅ Ótimo | Tipagem forte, bem aplicada |
| Tailwind CSS 3 | ✅ Ótimo | Design system consistente |
| Zustand 5 | ✅ Ótimo | Simples e eficiente para o volume de dados |
| Recharts 3 | ✅ Ótimo | Suficiente para os gráficos necessários |
| @dnd-kit | ✅ Ótimo | Melhor opção para drag & drop acessível |
| xlsx | ✅ Ótimo | Necessário para export e import |
| Supabase Cloud | ✅ Ótimo | Auth + RLS + PostgreSQL prontos |
| React Router 7 | ✅ Ótimo | Framework de roteamento maduro |
| date-fns | ❌ Removido | Importado mas nunca usado |
| Zustand persist | ⚠️ Atenção | Ótimo para configs, mas dado sensível deve ir ao Supabase |

---

## 8. Avaliação dos MCPs Disponíveis

| MCP | Relevância para este projeto |
|-----|------------------------------|
| **Google Drive** | ✅ Útil — acesso à planilha original `.xlsx` para import |
| **Gmail** | 🔵 Eventual — envio de relatórios por e-mail |
| **Google Calendar** | 🔵 Eventual — lembretes de tarefas com vencimento |
| **Canva** | 🔵 Eventual — criação de banners/fotos de produto |
| **Shopify** | ❌ Irrelevante — projeto é para Shopee, não Shopify |

**Recomendação:** O MCP mais imediatamente útil é o **Google Drive** para importar a planilha diretamente sem download manual.

---

## 9. Próximos Passos (Roadmap Priorizado)

### Prioridade Alta (Bugs e Consistência)
1. **Corrigir PK de `produtos`** — `primary key (sku, user_id)` [Migração SQL]
2. **Feedback de erro nas ações** — toast quando sincronização com Supabase falha
3. **Loading states** — usar `isHydrated` para skeleton nas páginas

### Prioridade Média (Funcionalidades Pendentes)
4. **Persistir `configuracoes` no Supabase** — criar tabela + sync
5. **Fechar mês / snapshot DRE** — botão na página Financeiro que persiste em `historico_mensal`
6. **Gráfico histórico mensal** — barras de faturamento/lucro por mês no Dashboard
7. **Mapeamento de colunas no import CSV** — UI para mapear colunas antes de inserir
8. **Triggers de estoque no PostgreSQL** — mover lógica do frontend para o banco (PL/pgSQL)

### Prioridade Baixa (Melhorias)
9. **Supabase Realtime** — sincronizar mudanças em tempo real entre abas/dispositivos
10. **Filtro por loja no Dashboard** — separar métricas de Cardoso e-Shop vs Projetando
11. **Paginação na tabela de Vendas** — para meses com muitos pedidos
12. **Integração Google Drive** — importar planilha diretamente via MCP

---

## 10. Arquivos Removidos (Limpeza)

| Arquivo | Motivo |
|---------|--------|
| `src/App.css` | CSS boilerplate do Vite, nunca importado |
| `src/assets/react.svg` | Asset boilerplate do Vite, nunca usado |
| `src/assets/vite.svg` | Asset boilerplate do Vite, nunca usado |
| `src/assets/hero.png` | Asset boilerplate do Vite, nunca usado |
| `date-fns` (dep) | Dependência nunca importada no código |
| `MovimentacaoEstoque[]` no store | Campo de estado nunca lido nem escrito |
| `seeded: boolean` no store | Campo inicializado como `true`, nunca alterado ou consumido |
| `TipoMovimentacao` (type) | Usado apenas pelo `MovimentacaoEstoque` removido |
| `MovimentacaoEstoque` (type) | Tipo sem implementação funcional |
| `Loja` interface (type) | Interface definida mas nunca importada como tipo |
