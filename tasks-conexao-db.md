# Tarefas — Conexão Frontend ↔ Banco de Dados

> Checklist executável por ordem de prioridade.
> Status: ✅ feito · 🔄 parcial · ⬜ pendente

---

## FASE 1 — Infraestrutura de Feedback

### T01 — Sistema de Toast / Notificação ✅
- [x] Componente customizado `src/components/Toast.tsx` (sem dependência externa)
- [x] `ToastProvider` em `App.tsx`
- [x] Suporte a `action: { label, onClick }` para undo flows
- [x] Suporte a `duration` customizado por toast
- [x] Store usa `notifySyncError` + rollback otimista em todos os `.catch`

### T02 — Loading States ✅
- [x] `isHydrated` no store — false até `loadAndHydrate` concluir
- [x] `LayoutSkeleton` em `Layout.tsx` exibido enquanto `!isHydrated` — cobre todas as páginas
- [x] Indicador de sync (spinner/check) no rodapé da sidebar via `SyncDot` + `setSyncStateListener`

---

## FASE 2 — Verificação Página por Página

### T03 — Dashboard ✅
- [x] KPIs calculados dos pedidos no store
- [x] Gráficos via Recharts
- [x] Alerta de estoque crítico
- [x] Quick-add (compra, venda, tarefa) com toast de feedback

### T04 — Vendas ✅
- [x] Listar / criar / editar / deletar pedidos (com toast)
- [x] Alterar status (+ lógica de estoque)
- [x] Bulk delete com undo (toast 5s + "Desfazer")
- [x] Bulk status change com toast
- [x] Importação CSV com dedup, preview de resultado e toast
- [x] Export XLSX filtrado com toast

### T05 — Estoque ✅
- [x] Listar produtos (DB via store)
- [x] Registrar compra → incrementa estoque + gera despesa (com toast)
- [x] Deletar compra → reverte estoque (com toast e modal de confirmação)
- [x] Ajuste manual de estoque com toast
- [x] Editar produto / custo com toast

### T06 — Financeiro ✅
- [x] DRE calculado de `pedidos` + `despesas` do store
- [x] Fechar mês → persiste snapshot em `historico_mensal` (com toast)
- [x] Re-fechar mês com valores atualizados (com toast)
- [x] Export XLSX do histórico (com toast)
- [x] Lançamento / edição / exclusão de mês manual (com toast)
- [x] Gráfico de evolução mensal usando `historico_mensal`

### T07 — Despesas ✅
- [x] Listar / criar / editar / deletar despesas (com toast)
- [x] Proteção de despesas geradas por compra

### T08 — Kanban ✅
- [x] Tarefas carregadas do DB via store
- [x] Drag & drop entre colunas (persiste no DB via `moveTarefa`)
- [x] Criar tarefa com toast
- [x] Deletar tarefa individual com toast
- [x] Limpar concluídas com toast

### T09 — Calculadora ✅
- [x] Fórmulas corretas (preço ideal, margem real)
- [x] Lê `configuracoes` do store (sincronizadas com DB)
- [x] Salvar / carregar / deletar precificações (com toast)

### T10 — Configurações ✅
- [x] `aliquotaDAS` e `percentualMarketing` salvos no Supabase
- [x] Cadastro de SKU com toast
- [x] Exclusão de SKU com modal de confirmação + toast (substituiu `confirm()`)
- [x] Categorias de despesas gerenciadas com toast
- [x] Verificação de conectividade com Supabase (badge online/offline)

---

## FASE 3 — Robustez e Validação

### T11 — Execução das Migrations ⬜ (manual — executar no Supabase Dashboard)
- [ ] `supabase/migration_v2.sql` — tabela `configuracoes`, PK composta `produtos`, `pedidos.created_at`
- [ ] `supabase/migration_v3.sql` — tabela `movimentacoes_estoque` (audit trail)
- [ ] `supabase/migration_v4.sql` — tabela `importacoes_log` (já usada em `src/lib/db.ts`)

> Todas são idempotentes. Rodar em ordem no SQL Editor do Supabase Dashboard.

### T12 — Validação de Conectividade ⬜
- [ ] Testar login/logout e recarregar — dados devem persistir
- [ ] Testar em duas abas — alterações em uma aparecem na outra após reload
- [ ] Simular falha de rede — verificar rollback otimista + toast de erro

### T13 — Importação de CSV real da Shopee ⬜
- [ ] Baixar CSV real do painel Shopee
- [ ] Verificar mapeamento de colunas em `src/import/`
- [ ] Testar com arquivo de +100 pedidos

### T14 — Triggers de Estoque no PostgreSQL ⬜ (opcional)
- [ ] Criar função `fn_atualizar_estoque_pedido()` em PL/pgSQL
- [ ] Criar trigger `AFTER UPDATE OF status ON pedidos`
- [ ] Remover lógica de estoque do store (passa a ser automática no DB)

---

## Ordem de Execução Recomendada

```
T11 (Migrations) → T12 (Validação) → T13 (CSV real) → T14 (Triggers, opcional)
```
