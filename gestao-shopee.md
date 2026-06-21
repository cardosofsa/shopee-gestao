# Gestão Shopee — Status do Projeto

Última atualização: 2026-06-21

---

## Tech Stack
- Frontend: React 19 + Vite 8 + TypeScript + Tailwind CSS 3.4
- Gráficos: Recharts + @dnd-kit
- Ícones: Lucide React
- Backend: Supabase (PostgreSQL + Auth + RLS + Realtime)
- Estado: Zustand 5 com persist middleware (partialize — só UX prefs)
- Conexão: `@supabase/supabase-js`

---

## Migrations (executar no Supabase Dashboard → SQL Editor)

| Migration | Conteúdo | Status |
|-----------|---------|--------|
| `migration_v2.sql` | PK composta produtos, tabela configuracoes, índices | ✅ Rodar |
| `migration_v3.sql` | movimentacoes_estoque, ajustes_estoque, triggers de estoque | ✅ Rodar |
| `migration_v4.sql` | importacoes_log | ✅ Rodar |
| `migration_v5.sql` | plans + subscriptions (Free padrão automático) | ✅ Rodar |
| `migration_v6.sql` | google_calendar_tokens | ✅ Rodar |
| `migration_v7.sql` | organizations, org_members, org_invites | ✅ Rodar |

---

## Implementado — Infraestrutura ✅

- [x] Projeto React/Vite + TypeScript + Tailwind configurado
- [x] Supabase conectado (auth, RLS, tabelas)
- [x] Schema v2 aplicado (PK composta produtos, configuracoes, índices, updated_at triggers)
- [x] Zustand store com partialize persist (só UX prefs) + sync com Supabase
- [x] `withRetry` + `notifySyncError` para resiliência de rede
- [x] Rollback otimista em todas as actions críticas (revert local + toast de erro)
- [x] Seed automático para novos usuários
- [x] `loadAndHydrate` — carrega dados do Supabase ao login (paralelo com subscription + org)
- [x] `resetOperationalData` — limpa store no logout (sem vazar dados entre usuários)
- [x] Dark mode (useLayoutEffect + getState)
- [x] Atalhos de teclado (d/v/e/f/k/c + ⌘B + ?)
- [x] Sidebar colapsável (desktop) + drawer (mobile)
- [x] Toast system (Toast.tsx) com suporte a action (undo), duration, type
- [x] `isHydrated` gate → LayoutSkeleton até dados do Supabase chegarem
- [x] Indicador de sync (spinner/check) na sidebar via SyncStateListener
- [x] Filtro global por loja no header (deriva das lojas dos produtos)
- [x] Supabase Realtime multi-aba (useRealtime.ts) — pedidos, produtos, tarefas

---

## Implementado — Banco de Dados ✅

- [x] Tabelas: produtos, pedidos, compras, despesas, tarefas, historico_mensal, configuracoes
- [x] RLS em todas as tabelas (user_id)
- [x] PK composta em produtos (sku, user_id) — sem colisão entre usuários
- [x] Triggers `updated_at` em todas as tabelas
- [x] `movimentacoes_estoque` — audit trail imutável de todas as movimentações
- [x] `ajustes_estoque` — ajustes manuais persistidos no Supabase
- [x] Trigger `trg_mov_pedido` — registra saída/entrada ao mudar status de pedido
- [x] Trigger `trg_mov_compra` — registra entrada ao registrar/editar/excluir compra
- [x] Trigger `trg_mov_ajuste` — registra ajuste manual
- [x] `importacoes_log` — histórico de imports CSV/XLSX
- [x] `plans` + `subscriptions` — planos e limites por usuário (Free padrão automático)
- [x] `google_calendar_tokens` — config de sync com Google Calendar
- [x] `organizations` + `org_members` + `org_invites` — CoWork multi-usuário

---

## Implementado — Telas ✅

- [x] Login — email/senha via Supabase Auth
- [x] Dashboard — KPIs, gráfico de vendas diário, status de estoque, curva ABC, próximas tarefas, popup de ação rápida nos cards de estoque
- [x] Vendas — tabela com filtros, import CSV/XLSX (Shopee nativo + UpSeller), ação em lote, alterar status, log de imports
- [x] Estoque — posição atual, compras, movimentações (audit trail), ajustes manuais, alertas
- [x] Financeiro — DRE live, fechar mês, histórico mensal (CRUD), projeção, gráfico anual com historico_mensal
- [x] Despesas — CRUD completo, filtros, vínculo automático com compras
- [x] Kanban — drag-and-drop, prioridades, data de vencimento
- [x] Calendário — visualização mensal de tarefas, exportar .ICS, integração Google Calendar (OAuth)
- [x] Calculadora — modo Shopee + Avançado, modo reverso, precificações salvas
- [x] Configurações — DAS, marketing, categorias, plano atual (uso + limites), integração Google Calendar
- [x] Planos — página de pricing com 6 tiers, enforcement de limites (80%/100%), toast com "Ver planos"
- [x] Equipe — criar org, convidar membros, roles (owner/admin/operador/viewer), convites por link

---

## Implementado — Domínio e qualidade ✅

- [x] `src/domain/dre.ts` — computeDRE centralizado (sem duplicação Financeiro/Dashboard)
- [x] `src/lib/gcal.ts` — ICS build/download + Google Calendar OAuth + push de tarefas
- [x] `src/lib/sync.ts` — withRetry, notifySyncError, SyncState, LimitListener
- [x] `src/hooks/useRealtime.ts` — Supabase Realtime subscribe
- [x] CI/CD — GitHub Actions (ci.yml: lint + tsc + test + build | e2e.yml: Playwright smoke)
- [x] Code splitting via React.lazy — bundle inicial ~145 kB gzip

---

## Pendências — Execução manual (você faz no Supabase Dashboard)

- [ ] Rodar migrations v2 → v7 em ordem no SQL Editor
- [ ] Ativar Google OAuth em Supabase → Authentication → Providers → Google (+ escopo `calendar`)
- [ ] Configurar secrets no GitHub (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) para o CI funcionar em produção
- [ ] Configurar Vercel com as variáveis de ambiente e conectar ao repositório

---

## Definition of Done — checklist (PLANO_MESTRE)

- [ ] Mudar status de pedido em 2 abas → estoque idêntico em ambas *(Realtime pronto; triggers prontos — validar após migrations)*
- [ ] Ajuste manual persiste após logout/login em outro browser *(migration_v3 necessária)*
- [ ] Import UpSeller 500 pedidos → preview → confirma → todos no banco
- [ ] DRE do mês atual bate com planilha original (±R$0,01)
- [ ] "Fechar mês" gera linha em `historico_mensal` correta
- [ ] Falha de rede durante save → toast + estado reconciliado (não fica errado)
- [ ] Build + testes + E2E smoke passam no CI *(CI configurado; precisa de secrets no GitHub)*
- [ ] Deploy cloud acessível com Google + email auth *(Vercel + Supabase — configurar)*

---

## Purple ban — pendentes (B6)

- [ ] `violet/purple` em Estoque (linha de ajustes/movimentações)
- [ ] `violet/purple` em Financeiro
- [ ] `violet/purple` em Despesas
- [ ] `violet/purple` em Calculadora
