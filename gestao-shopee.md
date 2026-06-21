# Gestão Shopee — Status do Projeto

Última atualização: 2026-06-20

---

## Tech Stack
- Frontend: React 19 + Vite 8 + TypeScript + Tailwind CSS 3.4
- Gráficos: Recharts
- Ícones: Lucide React
- Backend: Supabase (PostgreSQL + Auth + RLS)
- Estado: Zustand 5 com persist middleware
- Conexão: `@supabase/supabase-js`

---

## Funcionalidades implementadas ✅

### Infraestrutura
- [x] Projeto React/Vite + TypeScript + Tailwind configurado
- [x] Supabase conectado (auth, RLS, tabelas)
- [x] Schema v2 aplicado (PK composta produtos, configuracoes, índices, updated_at triggers)
- [x] Zustand store com persist (localStorage) e sync com Supabase
- [x] `withRetry` + `notifySyncError` para resiliência de rede
- [x] Seed automático para novos usuários
- [x] `loadAndHydrate` — carrega dados do Supabase ao login
- [x] Dark mode (useLayoutEffect + getState) — corrigido em 2026-06-20
- [x] Atalhos de teclado (d/v/e/f/k/c + ⌘B + ?)
- [x] Sidebar colapsável (desktop) + drawer (mobile)
- [x] Toast de erro de sync

### Telas
- [x] Dashboard — KPIs, gráfico de vendas diário, status de estoque, curva ABC, próximas tarefas
- [x] Vendas — tabela com filtros, import CSV/XLSX (Shopee nativo + UpSeller), ação em lote, alterar status
- [x] Estoque — posição atual, compras, movimentações, ajustes manuais, alertas
- [x] Financeiro — DRE live, histórico mensal (CRUD), projeção
- [x] Despesas — CRUD completo, filtros, vínculo automático com compras
- [x] Kanban — drag-and-drop, prioridades, data de vencimento
- [x] Calculadora — modo Shopee + Avançado, precificações salvas
- [x] Configurações — alíquota DAS, marketing, categorias, reset seed, export

### Banco de dados
- [x] Tabelas: produtos, pedidos, compras, despesas, tarefas, historico_mensal, configuracoes
- [x] RLS em todas as tabelas (user_id)
- [x] PK composta em produtos (sku, user_id) — sem colisão entre usuários
- [x] Triggers `updated_at` em todas as tabelas

---

## Pendências do PLANO_MESTRE.md

### Fase 0 (em andamento)
- [ ] **0.1** Triggers de movimentação de estoque + tabela `movimentacoes_estoque`
- [ ] **0.2** Tabela `ajustes_estoque` + `addAjuste` persiste no Supabase
- [x] **0.3** `partialize` no persist (só UX prefs + cats/precificações temp) — 2026-06-20
- [x] **0.6** `resetOperationalData` no logout — 2026-06-20
- [ ] **0.4** Gate `isHydrated` (skeleton global)
- [ ] **0.5** Rollback otimista nas actions críticas

### Fase 1
- [ ] Centralizar `computeDRE` em `src/domain/dre.ts`
- [ ] Fechar mês (RPC Supabase + botão Financeiro)
- [ ] Correções de import (loja, DAS/Ads, Devolvido)
- [ ] Log de importações

### Fase 2
- [ ] Migrations versionadas (Supabase CLI)
- [ ] Multi-tenancy ajustes (resetToSeed → ativarModoDemo, mover cats/precificações para Supabase)
- [ ] Realtime multi-aba

### Fase 3
- [ ] Popup de ação rápida nos cards de estoque (Dashboard)
- [ ] Filtro por loja — header global
- [ ] Calendário no Kanban + mini-widget Dashboard
- [ ] Refatorar Estoque.tsx e Vendas.tsx
- [ ] Testes (parsers + DRE + E2E)
- [ ] CI/CD (GitHub Actions + Vercel)
- [ ] Performance (lazy xlsx)
- [ ] Design system / purple ban (Estoque, Financeiro, Despesas, Calculadora)

---

## Purple ban — locais pendentes
- [ ] `violet/purple` em Estoque (ajustes/movimentações)
- [ ] `violet/purple` em Financeiro
- [ ] `violet/purple` em Despesas
- [ ] `violet/purple` em Calculadora
