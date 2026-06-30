# SYSTEM.md — Core Gestor (Business OS para E-commerce)

Documentação técnica completa do sistema. Atualizado em 2026-06-29.

---

## 1. Visão Geral

Plataforma SaaS de gestão operacional para vendedores de e-commerce multi-plataforma (Shopee, Mercado Livre, Shein e outros). Substitui planilhas Excel por um sistema integrado com backend em nuvem, autenticação por usuário e dados isolados por RLS (Row Level Security).

**Produto:** Core Gestor  
**URL produção:** https://app.coregestor.com.br  
**Landing page:** https://coregestor.com.br  
**Status:** Em produção  
**Versão:** 0.0.0 (pré-lançamento público)

---

## 2. Stack Tecnológica

### Frontend

| Tecnologia              | Versão         | Função                         |
| ----------------------- | -------------- | ------------------------------ |
| React                   | 19.2.6         | Framework UI                   |
| TypeScript              | ~6.0.2         | Tipagem estática               |
| Vite                    | 8.0.12         | Bundler e dev server           |
| React Router DOM        | 7.18.0         | Roteamento SPA                 |
| Tailwind CSS            | 3.4.19         | Estilização utilitária         |
| Zustand                 | 5.0.14         | Estado global                  |
| Recharts                | 3.8.1          | Gráficos e visualizações       |
| Lucide React            | 1.21.0         | Ícones                         |
| @dnd-kit                | 6.3.1 + 10.0.0 | Drag-and-drop (Kanban)         |
| @tanstack/react-virtual | 3.14.3         | Virtualização de listas longas |
| xlsx                    | 0.18.5         | Importação/exportação Excel    |
| Geist                   | 1.7.2          | Fonte tipográfica              |

### Backend

| Tecnologia | Versão  | Função                                 |
| ---------- | ------- | -------------------------------------- |
| Supabase   | 2.108.2 | PostgreSQL + Auth + Storage + Realtime |

### Tooling

| Ferramenta        | Versão | Função              |
| ----------------- | ------ | ------------------- |
| Vitest            | 4.1.9  | Testes unitários    |
| Playwright        | 1.61.0 | Testes E2E          |
| ESLint            | 10.3.0 | Linting             |
| typescript-eslint | 8.59.2 | Regras TS no ESLint |

---

## 3. Estrutura de Pastas

```
shopee-gestao/
├── src/
│   ├── App.tsx                  # Router principal, 47 rotas
│   ├── main.tsx                 # Entry point React
│   ├── index.css                # Estilos globais + Tailwind base
│   │
│   ├── pages/                   # 47 telas (todas lazy-loaded)
│   │   ├── Dashboard.tsx
│   │   ├── Vendas.tsx
│   │   ├── Estoque.tsx
│   │   ├── ProdutoDetalhe.tsx
│   │   ├── Kanban.tsx
│   │   ├── Financeiro.tsx
│   │   ├── Despesas.tsx
│   │   ├── Calculadora.tsx
│   │   ├── Configs.tsx
│   │   ├── Calendario.tsx
│   │   ├── Planos.tsx
│   │   ├── Equipe.tsx
│   │   ├── Clientes.tsx
│   │   ├── Metas.tsx
│   │   ├── Alertas.tsx
│   │   ├── Insights.tsx
│   │   ├── DRE.tsx
│   │   ├── Comparativo.tsx
│   │   ├── ComparativoAnual.tsx
│   │   ├── ContasPagar.tsx
│   │   ├── BreakEven.tsx
│   │   ├── FluxoCaixa.tsx
│   │   ├── Sazonalidade.tsx
│   │   ├── Precificacao.tsx
│   │   ├── Relatorio.tsx
│   │   ├── Fornecedores.tsx
│   │   ├── Campanhas.tsx
│   │   ├── Devolucoes.tsx
│   │   ├── Reposicao.tsx
│   │   ├── Importar.tsx
│   │   ├── Compras.tsx
│   │   ├── Hoje.tsx
│   │   ├── Analise.tsx
│   │   ├── Previsao.tsx
│   │   ├── CurvaABC.tsx
│   │   ├── MetasProduto.tsx
│   │   ├── Simulador.tsx
│   │   ├── Saude.tsx
│   │   ├── MapaCalor.tsx
│   │   ├── Categorias.tsx
│   │   ├── Exportar.tsx
│   │   ├── Login.tsx
│   │   ├── Registro.tsx
│   │   ├── estoque/             # Subcomponentes da tela de Estoque
│   │   │   ├── PosicaoTab.tsx
│   │   │   ├── ComprasTab.tsx
│   │   │   ├── MovimentacoesTab.tsx
│   │   │   └── PaginationBar.tsx
│   │   ├── vendas/              # Subcomponentes da tela de Vendas
│   │   │   ├── VendasTable.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   └── types.ts
│   │   └── public/              # Páginas de marketing (sem auth)
│   │       ├── Landing.tsx      # Landing page principal
│   │       └── Lancamento.tsx   # Página de captação pré-lançamento
│   │
│   ├── components/              # Componentes globais reutilizáveis
│   │   ├── Layout.tsx           # Sidebar + header + nav principal
│   │   ├── CommandPalette.tsx   # Busca rápida (⌘K)
│   │   ├── ErrorBoundary.tsx    # Fallback de erro por página
│   │   ├── Toast.tsx            # Sistema de notificações toast
│   │   ├── Onboarding.tsx       # Fluxo de primeiro acesso
│   │   ├── public/
│   │   │   └── PublicLayout.tsx # Layout para páginas públicas
│   │   └── ui/                  # Design system — componentes atômicos
│   │       ├── index.ts         # Barrel export
│   │       ├── Button.tsx
│   │       ├── Badge.tsx        # + statusPedidoBadge, statusEstoqueBadge
│   │       ├── EmptyState.tsx
│   │       ├── Spinner.tsx      # + PageSpinner
│   │       └── SectionHeader.tsx # + PageHeader
│   │
│   ├── store/
│   │   └── index.ts             # Store Zustand (~1100 linhas) — estado global monolítico
│   │
│   ├── lib/
│   │   ├── supabase.ts          # Singleton do cliente Supabase
│   │   ├── db.ts                # Camada de dados: mappers + queries CRUD
│   │   ├── sync.ts              # withRetry, backoff, notifySyncError
│   │   ├── gcal.ts              # Integração Google Calendar (OAuth + ICS)
│   │   └── leads.ts             # insertLead para captação (Landing/Lancamento)
│   │
│   ├── hooks/
│   │   ├── useAlertas.ts        # Alertas automáticos de estoque
│   │   └── useRealtime.ts       # Supabase Realtime (sync multi-aba)
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth context: user, loading, logout
│   │
│   ├── domain/
│   │   └── dre.ts               # computeDRE() — DRE centralizado
│   │
│   ├── import/
│   │   └── parsers/             # Pipeline de importação de arquivos
│   │       ├── index.ts         # parseImportRows() — roteador de formato
│   │       ├── shopee.ts        # Parser Shopee nativo (CSV/XLSX)
│   │       ├── upseller.ts      # Parser UpSeller
│   │       ├── generico.ts      # Parser genérico (CSV/XLSX)
│   │       └── common.ts        # mapearStatus(), funções compartilhadas
│   │
│   ├── utils/
│   │   ├── calculations.ts      # Cálculos: lucro, preço ideal, KPIs, ABC
│   │   ├── exportXlsx.ts        # Exportação para Excel
│   │   └── exportRelatorio.ts   # Exportação de relatório PDF
│   │
│   ├── types/
│   │   └── index.ts             # Todos os tipos e interfaces TypeScript
│   │
│   └── __tests__/               # Suites de teste unitário
│       ├── store.test.ts
│       ├── calculations.test.ts
│       ├── dre.test.ts
│       ├── parsers.test.ts
│       └── precificacao.test.ts
│
├── e2e/
│   └── smoke.test.ts            # Testes E2E Playwright
│
├── supabase/                    # Migrations SQL versionadas
│   ├── schema.sql               # Schema inicial completo
│   ├── migration_complete.sql
│   ├── migration_v2.sql         # PK composta produtos, tabela configuracoes
│   ├── migration_v3.sql         # movimentacoes_estoque, ajustes_estoque
│   ├── migration_v4.sql         # importacoes_log
│   ├── migration_v5.sql         # plans + subscriptions
│   ├── migration_v6.sql         # google_calendar_tokens
│   ├── migration_v7.sql         # organizations + org_members + org_invites
│   ├── migration_v8.sql
│   ├── migration_v9.sql
│   ├── migration_v10.sql
│   └── migration_v11.sql        # Coluna lojas[] em configuracoes
│
├── public/                      # Assets estáticos servidos diretamente
│
├── index.html                   # HTML root (ponto de entrada Vite)
├── package.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── tsconfig.json                # Referências de sub-configs
├── tsconfig.app.json            # Config app (ES2023, JSX react-jsx)
├── tsconfig.node.json           # Config node (vite.config.ts)
├── tailwind.config.js
├── postcss.config.js
├── eslint.config.js
├── vercel.json                  # SPA rewrite rule
├── .env.example                 # Template de variáveis de ambiente
└── .gitignore
```

---

## 4. Rotas e Páginas

### Públicas (sem autenticação)

| Rota          | Componente   | Descrição                          |
| ------------- | ------------ | ---------------------------------- |
| `/`           | `Landing`    | Landing page com captação de leads |
| `/lancamento` | `Lancamento` | Página countdown pré-lançamento    |
| `/login`      | `Login`      | Autenticação Supabase              |
| `/registro`   | `Registro`   | Cadastro de novo usuário           |

### Protegidas (requerem autenticação)

| Rota             | Componente         | Descrição                                |
| ---------------- | ------------------ | ---------------------------------------- |
| `/`              | `Dashboard`        | Visão geral com KPIs do mês              |
| `/vendas`        | `Vendas`           | Listagem e gestão de pedidos             |
| `/estoque`       | `Estoque`          | Posição, compras e movimentações         |
| `/estoque/:sku`  | `ProdutoDetalhe`   | Detalhes, KPIs e histórico de um produto |
| `/financeiro`    | `Financeiro`       | DRE interativo e fluxo financeiro        |
| `/despesas`      | `Despesas`         | Lançamento e gestão de despesas          |
| `/contas-pagar`  | `ContasPagar`      | Contas a pagar com recorrência           |
| `/break-even`    | `BreakEven`        | Ponto de equilíbrio                      |
| `/fluxo-caixa`   | `FluxoCaixa`       | Fluxo de caixa mensal                    |
| `/dre`           | `DRE`              | DRE fechado (histórico mensal)           |
| `/comparativo`   | `Comparativo`      | Comparação mês a mês                     |
| `/anual`         | `ComparativoAnual` | Comparativo anual                        |
| `/hoje`          | `Hoje`             | Visão do dia atual                       |
| `/analise`       | `Analise`          | Análise profunda de vendas               |
| `/insights`      | `Insights`         | Insights automatizados                   |
| `/metas`         | `Metas`            | Metas mensais globais                    |
| `/metas-produto` | `MetasProduto`     | Metas por SKU                            |
| `/abc`           | `CurvaABC`         | Curva ABC de produtos                    |
| `/previsao`      | `Previsao`         | Projeção de receita                      |
| `/saude`         | `Saude`            | Score de saúde do negócio                |
| `/simulador`     | `Simulador`        | Simulador de cenários                    |
| `/mapa-calor`    | `MapaCalor`        | Heatmap de vendas por dia/hora           |
| `/categorias`    | `Categorias`       | Análise por categoria                    |
| `/sazonalidade`  | `Sazonalidade`     | Padrões sazonais                         |
| `/clientes`      | `Clientes`         | Ranking e histórico de clientes          |
| `/devolucoes`    | `Devolucoes`       | Gestão de devoluções                     |
| `/importar`      | `Importar`         | Importação de relatórios (CSV/XLSX)      |
| `/compras`       | `Compras`          | Histórico de compras de estoque          |
| `/reposicao`     | `Reposicao`        | Sugestões de reposição                   |
| `/fornecedores`  | `Fornecedores`     | Cadastro de fornecedores                 |
| `/campanhas`     | `Campanhas`        | Gestão de campanhas de desconto          |
| `/calculadora`   | `Calculadora`      | Precificação e simulação de preços       |
| `/precificacao`  | `Precificacao`     | Precificações salvas                     |
| `/relatorio`     | `Relatorio`        | Relatório gerencial exportável           |
| `/exportar`      | `Exportar`         | Exportação de dados                      |
| `/kanban`        | `Kanban`           | Quadro de tarefas drag-and-drop          |
| `/calendario`    | `Calendario`       | Calendário de tarefas e vencimentos      |
| `/alertas`       | `Alertas`          | Central de alertas automáticos           |
| `/configs`       | `Configs`          | Configurações da empresa e lojas         |
| `/planos`        | `Planos`           | Planos e assinatura                      |
| `/equipe`        | `Equipe`           | Membros e permissões da organização      |

---

## 5. Estado Global — Zustand

Arquivo: `src/store/index.ts`

### Shape do estado

```typescript
// Dados operacionais (sincronizados com Supabase)
produtos:       Produto[]
pedidos:        Pedido[]
compras:        Compra[]
ajustes:        AjusteEstoque[]
despesas:       Despesa[]
tarefas:        Tarefa[]
historico:      HistoricoMensal[]
configuracoes:  Configuracoes
userId:         string | null
isHydrated:     boolean

// Dados locais (persistidos em localStorage)
darkMode:              boolean
onboardingCompleted:   boolean
calculadoraDraft:      CalculadoraDraft
categoriasDesp:        string[]
categoriasProd:        string[]
precificacoesSalvas:   PrecificacaoSalva[]
lojaFiltro:            string | null
```

### Middleware

- `persist` com `partialize` — persiste **apenas** dados de preferência/rascunho em `localStorage` (chave `shopee-gestao-store`)
- Dados operacionais vêm exclusivamente do Supabase

### Padrão otimista

Todas as ações críticas (add, update, delete) atualizam o estado local imediatamente e fazem rollback em caso de erro no Supabase.

---

## 6. Banco de Dados — Supabase

### Tabelas

| Tabela                   | PK                   | RLS                    | Descrição                  |
| ------------------------ | -------------------- | ---------------------- | -------------------------- |
| `produtos`               | `(sku, user_id)`     | `user_id = auth.uid()` | Catálogo de produtos       |
| `pedidos`                | `id`                 | `user_id = auth.uid()` | Pedidos de venda           |
| `compras`                | `id`                 | `user_id = auth.uid()` | Entradas de estoque        |
| `despesas`               | `id`                 | `user_id = auth.uid()` | Despesas operacionais      |
| `ajustes_estoque`        | `id`                 | `user_id = auth.uid()` | Ajustes manuais de estoque |
| `movimentacoes_estoque`  | `id`                 | `user_id = auth.uid()` | Audit trail imutável       |
| `tarefas`                | `id`                 | `user_id = auth.uid()` | Tarefas do Kanban          |
| `historico_mensal`       | `(mes_ano, user_id)` | `user_id = auth.uid()` | DRE fechado por mês        |
| `configuracoes`          | `user_id`            | `user_id = auth.uid()` | Configurações por usuário  |
| `importacoes_log`        | `id`                 | `user_id = auth.uid()` | Log de importações         |
| `plans`                  | `id`                 | público                | Planos disponíveis         |
| `subscriptions`          | `user_id`            | `user_id = auth.uid()` | Assinatura do usuário      |
| `organizations`          | `id`                 | por membership         | Organizações multiusuário  |
| `org_members`            | `(org_id, user_id)`  | por org                | Membros da organização     |
| `org_invites`            | `id`                 | por org                | Convites pendentes         |
| `google_calendar_tokens` | `user_id`            | `user_id = auth.uid()` | OAuth Google Calendar      |
| `leads`                  | `id`                 | público (insert)       | Leads das páginas públicas |

### Camada de dados — `src/lib/db.ts`

Padrão mapper: cada tabela tem interfaces `DbX` (tipagem do row cru do Supabase) e funções `fromX(r: DbX): Tipo` que convertem para o modelo do frontend.

```
DbProduto    → Produto
DbPedido     → Pedido
DbCompra     → Compra
DbDespesa    → Despesa
DbTarefa     → Tarefa
DbHistorico  → HistoricoMensal
DbConfiguracoes → Configuracoes
DbContaPagar → ContaPagar
DbFornecedor → Fornecedor
DbCampanha   → Campanha
DbMetaProduto → MetaProduto
DbPlan       → Plan
DbMember     → OrgMember
```

### Realtime

`src/hooks/useRealtime.ts` subscreve nos canais `pedidos`, `produtos`, `tarefas` para sincronizar dados entre abas abertas em tempo real.

---

## 7. Autenticação

`src/contexts/AuthContext.tsx` — wrapper do Supabase Auth.

- Provê `user`, `loading`, `logout` via `useAuth()`
- `App.tsx` usa `AppOrPublic` para decidir entre landing, login e app autenticado
- Redirect automático com `return URL` para rotas protegidas acessadas sem auth

---

## 8. Importação de Dados

Arquivo: `src/import/parsers/`

### Fluxo

1. Usuário faz upload de arquivo CSV/XLSX na tela `/importar`
2. `parseImportRows(rows, produtos, configuracoes)` detecta o formato automaticamente
3. O parser correto é chamado, retornando `Pedido[]`

### Detecção de formato

```typescript
isUpSeller = 'Nº de Pedido da Plataforma' in rows[0];
isShopeeNativo = !isUpSeller && 'ID do pedido' in rows[0];
// else: genérico
```

### Parsers disponíveis

| Parser        | Arquivo       | Identifica por                      |
| ------------- | ------------- | ----------------------------------- |
| Shopee Nativo | `shopee.ts`   | Coluna `ID do pedido`               |
| UpSeller      | `upseller.ts` | Coluna `Nº de Pedido da Plataforma` |
| Genérico      | `generico.ts` | Fallback                            |

### Loja padrão

O `lojaDefault` é sempre `configuracoes.lojas[0]` (nunca hardcoded). O UpSeller usa fuzzy-match contra `configuracoes.lojas[]`.

---

## 9. Cálculos — `src/utils/calculations.ts`

| Função                                                                | Descrição                                  |
| --------------------------------------------------------------------- | ------------------------------------------ |
| `calcularLucroOperacional(receita, desconto, custo, taxa, das, ads)`  | Lucro operacional                          |
| `calcularTaxaShopee(receita, percentual?)`                            | Taxa Shopee (padrão 20%)                   |
| `calcularAds(receita, percentual?)`                                   | Custo de ads (padrão 2%)                   |
| `calcularPrecoIdeal({ custo, margem, comissao, taxaFixa, ads, das })` | Preço mínimo para margem alvo              |
| `getStatusEstoque(atual, vendaDia, seguranca)`                        | Status: Comprar / Baixo / Estável / Acima  |
| `getKPIsMes(pedidos, mes?)`                                           | KPIs mensais (faturamento, lucro, ticket…) |
| `getMesAnterior(mes)`                                                 | Mês anterior em formato `YYYY-MM`          |
| `getCapitalEstoque(produtos)`                                         | Capital imobilizado em estoque             |
| `getProjecaoMensal(faturamento, mes)`                                 | Projeção baseada em dias corridos          |
| `getRankingProdutos(pedidos)`                                         | Curva ABC: A=0-80%, B=80-95%, C=95-100%    |
| `agruparPorDia(pedidos, mes)`                                         | Dados diários para gráficos                |
| `fmt(valor)`                                                          | Formata como moeda BRL                     |
| `fmtPct(valor)`                                                       | Formata como percentual                    |

### DRE — `src/domain/dre.ts`

`computeDRE(pedidos, despesas, historico, mes)` centraliza o cálculo do DRE mensal, usado em `Financeiro.tsx`, `Relatorio.tsx` e nos testes.

---

## 10. Design System

### Cores (Tailwind)

| Token          | Hex       | Uso                                   |
| -------------- | --------- | ------------------------------------- |
| `core-green`   | `#18B37A` | Cor primária (CTAs, lucro, sucesso)   |
| `core-green-h` | `#0e9463` | Hover da cor primária                 |
| `core-black`   | `#111111` | Sidebar e elementos escuros           |
| `shopee-500`   | `#f97316` | Accent legado (laranja) — pouco usado |

### Dark mode

Ativado via classe `dark` no elemento raiz. Toggle em `configuracoes.darkMode` no store.

### Sombras

- `shadow-core-sm` — cards secundários
- `shadow-core` — cards principais
- `shadow-core-lg` — modais e dropdowns

### Border radius

- `rounded-core` (10px) — padrão para todos os cards e containers

### Fonte

- Geist (primária) → Inter → system-ui (fallback)

### Regra de cores

Todas as páginas usam exclusivamente: `slate`, `emerald`, `blue`, `sky`, `teal`, `amber`, `cyan`, `red`. Cores `violet`, `purple` e `indigo` são proibidas (conflito com brand) — exceto em badges de plano específico em `Planos.tsx` e `Configs.tsx`.

---

## 11. Tipos e Interfaces — `src/types/index.ts`

### Tipos principais

```typescript
// Enums
StatusPedido = 'Em processo' | 'Enviado' | 'Concluído' | 'Devolvido';
StatusEstoque = 'Comprar' | 'Estoque Baixo' | 'Estoque Estável' | 'Estoque Acima';
PrioridadeTarefa = 'baixa' | 'media' | 'alta';
ColunaTarefa = 'todo' | 'in_progress' | 'done';
OrgRole = 'owner' | 'admin' | 'operador' | 'viewer';

// Entidades de negócio
(Produto, Pedido, Compra, Despesa, AjusteEstoque, Tarefa);
(HistoricoMensal, Configuracoes, MetaProduto);
(ContaPagar, Fornecedor, Campanha, RankingProduto);

// Precificação
(PrecificacaoSalva, CalculadoraDraft);

// SaaS / Multitenancy
(Organization, OrgMember, OrgInvite, Plan, PlanFeatures, Subscription);
```

### Configuracoes (chave para multi-loja)

```typescript
interface Configuracoes {
  aliquotaDAS: number; // % Simples Nacional
  percentualMarketing: number; // % Ads/Marketing
  metaFaturamento?: number;
  metaMargem?: number;
  metaPedidos?: number;
  metaLucro?: number;
  nomeEmpresa?: string;
  tipoEmpresa?: 'MEI' | 'ME' | 'EPP';
  cnpj?: string;
  lojas: string[]; // Lista de lojas (dinâmico, gerenciado em Configs)
}
```

---

## 12. Testes

### Unitários — Vitest

```
npm run test              # roda todos os testes
npm run test:watch        # modo watch
npm run test:coverage     # gera relatório de cobertura
```

| Suite        | Arquivo                | Cobre                                            |
| ------------ | ---------------------- | ------------------------------------------------ |
| Store        | `store.test.ts`        | Ações Zustand (add, update, delete, status)      |
| Calculations | `calculations.test.ts` | Cálculos: lucro, preço ideal, KPIs, ABC, estoque |
| DRE          | `dre.test.ts`          | `computeDRE` centralizado                        |
| Parsers      | `parsers.test.ts`      | Import Shopee, UpSeller, Genérico                |
| Precificação | `precificacao.test.ts` | Lógica da calculadora                            |

**Status:** 193/193 passando

### E2E — Playwright

```
npm run test:e2e          # roda testes E2E (requer servidor rodando)
npm run test:e2e:ui       # interface visual do Playwright
```

Arquivo: `e2e/smoke.test.ts`  
Testa: carregamento da app, tela de login, fluxo autenticado (dashboard, vendas, estoque, kanban).  
Credenciais: variáveis `TEST_EMAIL` e `TEST_PASSWORD` no ambiente.

### Configuração de cobertura

Cobertura habilitada para `src/utils/**` e `src/lib/**` via v8 (reporters: text + html).

---

## 13. Deploy — Vercel

```json
// vercel.json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

- Toda requisição cai em `index.html` (SPA routing)
- Build command: `tsc -b && vite build`
- Output directory: `dist/`

### Comandos

```bash
npm run build         # build de produção (TypeScript + Vite)
npm run preview       # serve o dist/ localmente
npx vercel --prod     # deploy manual para produção
```

---

## 14. Variáveis de Ambiente

Arquivo: `.env.local` (não versionado)

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...

# Apenas para E2E
TEST_EMAIL=usuario@email.com
TEST_PASSWORD=senha
```

Template público em `.env.example`.

---

## 15. TypeScript — Regras do Compilador

`tsconfig.app.json`:

- `target: "es2023"` — JavaScript moderno
- `noUnusedLocals: true` — proibido declarar variáveis não usadas
- `noUnusedParameters: true` — proibido declarar parâmetros não usados
- `noFallthroughCasesInSwitch: true` — switch sem break explícito é erro
- `erasableSyntaxOnly: true` — sem `enum` ou `namespace` (somente syntax apagável)

---

## 16. Scripts disponíveis

```bash
npm run dev                # Servidor de desenvolvimento (Vite, porta 5173)
npm run build              # Build de produção (tsc + vite build)
npm run preview            # Preview do build local
npm run lint               # ESLint
npm run format:check       # Prettier check
npm run typecheck          # TypeScript check (sem emit)
npm run test               # Vitest (todos os testes, single run)
npm run test:watch         # Vitest em modo watch
npm run test:coverage      # Cobertura de testes
npm run test:e2e           # Playwright E2E
npm run test:e2e:ui        # Playwright com UI visual
npm run checklist          # Checklist IA — padrões obrigatórios
npm run validate:rls       # Valida políticas RLS no Supabase
npm run secret-scan        # Scan de secrets no src/ (CI bloqueante)
npm run secret-scan:bundle # Scan de secrets no dist/ após build
npm run seed:demo          # Popula dados de demonstração no Supabase
```

---

## 17. Funcionalidades por Módulo

### Operacional

- **Dashboard** — KPIs do mês, gráficos de receita/lucro/pedidos, alertas, top produtos
- **Vendas** — tabela de pedidos com filtros, atualização de status, importação
- **Estoque** — posição de estoque por SKU, compras de reposição, movimentações, ajustes manuais
- **Produto Detalhe** — histórico completo por SKU: KPIs, gráficos mensais, evolução de custo, simulador de preço, reposição inteligente, top clientes
- **Hoje** — foco no dia atual: pedidos do dia, alertas urgentes

### Financeiro

- **Financeiro** — DRE interativo com gráficos, categorias de despesa, fluxo
- **Despesas** — lançamento de despesas por categoria e loja
- **Contas a Pagar** — vencimentos, recorrência, status pago/pendente
- **Break-even** — ponto de equilíbrio dinâmico
- **Fluxo de Caixa** — entradas x saídas x saldo projetado
- **DRE** — DRE fechado mês a mês (histórico importado)
- **Comparativo** — delta mês a mês em todos os indicadores
- **Comparativo Anual** — visão dos 12 meses do ano

### Análise

- **Análise** — análise profunda: por loja, por categoria, por período
- **Insights** — insights automáticos gerados a partir dos dados
- **Mapa de Calor** — heatmap de vendas por dia da semana e hora
- **Sazonalidade** — padrões mensais históricos
- **Categorias** — breakdown por categoria de produto
- **Curva ABC** — classificação A/B/C de produtos por receita
- **Previsão** — projeção baseada em tendência e sazonalidade
- **Saúde do Negócio** — score composito de indicadores

### Gestão

- **Metas** — definição e acompanhamento de metas mensais globais
- **Metas por Produto** — metas de unidades e receita por SKU
- **Clientes** — ranking, histórico e LTV dos clientes
- **Devoluções** — análise de pedidos devolvidos e taxa de devolução
- **Reposição** — sugestão automática de compra baseada em velocidade de venda
- **Fornecedores** — cadastro com lead time e termos de pagamento
- **Campanhas** — períodos de desconto por SKUs com impacto calculado

### Produtividade

- **Kanban** — quadro de tarefas com drag-and-drop e prioridades
- **Calendário** — visualização de tarefas e vencimentos em calendário
- **Alertas** — central de alertas: estoque crítico, metas, vencimentos

### Ferramentas

- **Calculadora** — precificação multi-plataforma: modo simples, avançado e reverso
- **Precificação** — histórico de precificações salvas
- **Simulador** — simulação de cenários (aumento de custo, desconto, taxa)
- **Relatório** — relatório gerencial completo exportável
- **Exportar** — exportação de dados em Excel por tipo
- **Importar** — importação de relatórios Shopee nativo, UpSeller e genérico

### SaaS

- **Planos** — visualização dos planos e limites
- **Equipe** — convite e gestão de membros da organização
- **Configurações** — empresa, CNPJ, alíquota DAS, marketing, lojas

---

## 18. Sincronização e Resiliência

- `src/lib/sync.ts` — `withRetry(fn, maxAttempts=3)` com backoff exponencial
- Todas as mutations do store usam `withRetry` antes de commitar no Supabase
- Em caso de falha: estado local é revertido (rollback otimista)
- `notifySyncError()` exibe toast de erro ao usuário
- `useRealtime` mantém sincronia entre múltiplas abas abertas

---

_Atualizado em 2026-06-29. Produto: Core Gestor — Business OS para E-commerce._
