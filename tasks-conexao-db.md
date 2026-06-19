# Tarefas — Conexão Frontend ↔ Banco de Dados

> Checklist executável por ordem de prioridade.
> Status: ✅ feito · 🔄 parcial · ⬜ pendente

---

## FASE 1 — Infraestrutura de Feedback (crítico)

### T01 — Sistema de Toast / Notificação
**Problema:** Erros do Supabase são silenciados (`.catch(console.error)`). O usuário não sabe se algo falhou.

- [ ] Instalar `react-hot-toast` → `npm i react-hot-toast`
- [ ] Adicionar `<Toaster />` no `App.tsx` dentro de `<AuthProvider>`
- [ ] Criar helper `src/lib/notify.ts`:
  ```ts
  import toast from 'react-hot-toast';
  export const ok  = (msg: string) => toast.success(msg);
  export const err = (msg: string) => toast.error(msg);
  export const catching = (fn: () => Promise<void>, errMsg = 'Erro ao salvar') =>
    fn().catch(() => err(errMsg));
  ```
- [ ] Substituir cada `.catch(console.error)` no store por `.catch(() => err('...'))`
- [ ] Substituir `alert('Configurações salvas!')` em `Configs.tsx` por `ok('Configurações salvas!')`
- [ ] Substituir `confirm(...)` em `Configs.tsx` e `Estoque.tsx` por modal de confirmação simples

### T02 — Loading States por Página
**Problema:** `isHydrated` existe no store mas nenhuma página o usa para exibir skeleton.

- [ ] Criar componente `src/components/PageSkeleton.tsx` (3-4 retângulos animados)
- [ ] Usar `isHydrated` de `useStore` em cada página:
  ```tsx
  const isHydrated = useStore(s => s.isHydrated);
  if (!isHydrated) return <PageSkeleton />;
  ```
- [ ] Páginas que precisam: Dashboard, Vendas, Estoque, Financeiro, Despesas, Kanban, Configs

---

## FASE 2 — Verificação Página por Página

### T03 — Dashboard ✅ leitura OK · ⬜ UX pendente
Dados lidos do store (já sincronizado com DB via `loadAndHydrate`).

- [x] KPIs calculados dos pedidos no store
- [x] Gráficos via Recharts
- [x] Alerta de estoque crítico
- [ ] Skeleton enquanto `isHydrated = false`
- [ ] Filtro de loja (Cardoso e-Shop vs Projetando em separado)

---

### T04 — Vendas ✅ CRUD OK · 🔄 importação parcial
- [x] Listar pedidos do store (DB)
- [x] Alterar status (+ lógica de estoque)
- [x] Deletar pedido
- [ ] **Importação CSV — validar colunas obrigatórias antes de inserir:**
  - Campos necessários: `Nº Pedido`, `Data`, `SKU`, `Receita`
  - Exibir preview da 1ª linha após upload para o usuário confirmar mapeamento
  - Exibir toast com quantidade inserida ao final: `ok('87 pedidos importados')`
- [ ] Feedback de confirmação antes de deletar pedido (modal, não confirm())
- [ ] Loading spinner dentro do botão "Importar" durante processamento

---

### T05 — Estoque ✅ CRUD OK · 🔄 UX pendente
- [x] Listar produtos (do DB via store)
- [x] Registrar compra → incrementa estoque + gera despesa automaticamente
- [x] Deletar compra → reverte estoque
- [ ] Skeleton na tabela de produtos
- [ ] Feedback toast ao salvar compra (`ok('Compra registrada — estoque atualizado')`)
- [ ] Feedback ao deletar produto/compra

---

### T06 — Financeiro 🔄 DRE calculado · ⬜ histórico não persiste
**Situação atual:** DRE sempre calculado on-the-fly dos pedidos em memória. Meses passados funcionam corretamente desde que os pedidos estejam no DB.

- [x] DRE calculado de `pedidos` + `despesas` do store
- [x] Export `.xlsx` funcionando
- [ ] **Botão "Fechar Mês"** → persiste snapshot em `historico_mensal`:
  ```ts
  // Em Financeiro.tsx, ao clicar "Fechar Mês":
  addHistorico({ mesAno, faturamentoBruto, cmv, taxasShopee, ... })
  // Chama dbHistorico.upsert via store
  ```
- [ ] Carregar histórico fechado e exibir lista de meses anteriores fechados
- [ ] Gráfico de barras com evolução mensal (últimos 6 meses) usando `historico_mensal`
- [ ] Indicação visual "mês fechado" vs "mês em aberto"

---

### T07 — Despesas ✅ CRUD completo
- [x] Listar despesas (DB via store)
- [x] Criar despesa manual
- [x] Deletar despesa (com proteção de despesas geradas por compra)
- [ ] Toast de feedback ao criar/deletar
- [ ] Skeleton na tabela

---

### T08 — Kanban ✅ CRUD + D&D completos
- [x] Tarefas carregadas do DB via store
- [x] Drag & drop entre colunas (persiste no DB via `moveTarefa`)
- [x] Criar / editar / deletar tarefas
- [ ] Toast ao criar/deletar tarefa
- [ ] Skeleton nas colunas durante hydration

---

### T09 — Calculadora ✅ sem necessidade de DB
Ferramenta puramente frontend, sem persitência.
- [x] Fórmulas corretas (preço ideal, margem real)
- [x] Lê `configuracoes` do store (agora sincronizadas com DB)
- Nenhuma mudança necessária.

---

### T10 — Configurações ✅ configurações agora no DB
- [x] `aliquotaDAS` e `percentualMarketing` salvos no Supabase (tabela `configuracoes`)
- [x] Carregados no `loadAndHydrate`
- [x] Atualizados no Supabase via `updateConfiguracoes`
- [ ] Trocar `alert()` por toast
- [ ] Trocar `confirm()` por modal
- [ ] Toast ao salvar SKU e ao deletar

---

## FASE 3 — Robustez e Validação

### T11 — Execução da Migration v2
Antes de qualquer outro passo, garantir que o banco está atualizado:

- [ ] Rodar `supabase/migration_v2.sql` no **Supabase Dashboard > SQL Editor**
- [ ] Confirmar nos logs (`RAISE NOTICE`):
  - `configuracoes criada: true`
  - `produtos PK composta: true`
  - `pedidos.created_at ok: true`
- [ ] Testar login → verificar que `configuracoes` é criada para o usuário

### T12 — Validação de Conectividade
- [ ] Testar login/logout e recarregar página — dados devem persistir
- [ ] Testar em duas abas — alterações em uma devem aparecer na outra após reload
- [ ] Simular falha de rede: desligar Wi-Fi → ação → religar — verificar que reconecta

### T13 — Importação de CSV real da Shopee
- [ ] Baixar CSV de pedidos do painel Shopee (formato real)
- [ ] Verificar mapeamento de colunas em `Vendas.tsx`
- [ ] Ajustar nomes de campos se necessário (colunas Shopee podem mudar)
- [ ] Testar com arquivo de +100 pedidos (batching de 500)

### T14 — Triggers de Estoque no PostgreSQL (opcional, melhora confiabilidade)
**Situação atual:** lógica de estoque está no frontend (store). Se dois dispositivos alterarem status simultaneamente, pode dessincronizar.

- [ ] Criar função PL/pgSQL `fn_atualizar_estoque_pedido()` no Supabase
- [ ] Criar trigger `AFTER UPDATE OF status ON pedidos`
- [ ] Remover lógica de estoque do `updatePedidoStatus` no store (passará a ser automática)

---

## FASE 4 — Funcionalidades Futuras (backlog)

| Item | Prioridade | Descrição |
|------|-----------|-----------|
| Filtro de loja no Dashboard | Média | Separar KPIs Cardoso vs Projetando |
| Paginação em Vendas | Média | Para meses com 200+ pedidos |
| Supabase Realtime | Baixa | Sincronizar mudanças em tempo real entre abas/dispositivos |
| Export CSV pedidos | Baixa | Além do XLSX já existente |
| Gráfico de margem por produto | Baixa | Detalhe no Dashboard para top SKUs |

---

## Ordem de Execução Recomendada

```
T11 (Migration) → T01 (Toast) → T04 (CSV import) → T02 (Skeletons) →
T06 (Fechar Mês) → T13 (CSV real) → T14 (Triggers) → Fase 4
```
