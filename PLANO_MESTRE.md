# Plano Mestre — Gestão Shopee Impecável

> Documento vivo. Atualizar ao concluir cada fase.  
> Última revisão: 2026-06-20

---

## Contexto

| Dimensão | Hoje | Futuro |
|---|---|---|
| Usuários | Só você | SaaS com contas separadas |
| Volume | Operação real, escala moderada | Planos por tier (Free → CoWork Titanium) |
| Deploy | — | Nuvem como produto |
| Prioridade imediata | Sistema 100% funcional | Monetização depois |

**Princípio arquitetural:** Não basta "funcionar no seu PC" — a base precisa nascer **multi-tenant-safe**, mesmo antes de cobrar.

**Faseamento:**
- **Fase 0–2:** confiança nos dados (estoque, DRE, sync)
- **Fase 3:** polish de produto (UX, performance, testes)
- **Fase 4:** camada SaaS (planos, billing, onboarding de clientes)

---

## Bugs críticos pré-Fase 0 (resolver antes de qualquer fase)

Estes não são features — são regressions que precisam sumir primeiro:

| # | Bug | Impacto | Status |
|---|-----|---------|--------|
| B1 | Dark mode toggle (useLayoutEffect + getState) | UX | ✅ Corrigido |
| B2 | `ajustes[]` só no Zustand, nunca vai ao Supabase | Perda de dados | ⏳ Fase 0.2 |
| B3 | Store inteiro no localStorage → quota risk + dados stale | Estabilidade | ⏳ Fase 0.3 |
| B4 | Logout não limpa store → dados do usuário anterior flasham | Segurança/SaaS | ⏳ Fase 0.6 |
| B5 | `gestao-shopee.md` documenta tudo como `[ ]` mesmo o que já está feito | Dev experience | ⏳ pré-Fase 0 |
| B6 | `violet/purple` em Estoque, Financeiro, Despesas e Calculadora (purple ban quebrado) | Design | ⏳ Fase 3.2 |

---

## FASE 0 — Fundação de dados (prioridade #1)

**Objetivo:** uma fonte de verdade; regras críticas no Postgres.  
**Entregável:** estoque sempre bate entre Vendas, Estoque e Supabase Dashboard.

### 0.1 Triggers de estoque no banco

**Problema:** estoque muda no Zustand; o Supabase só recebe o valor final. Duas abas ou dois dispositivos divergem.

**Solução:**

```sql
-- Função central de movimentação
CREATE OR REPLACE FUNCTION aplicar_movimentacao_estoque(
  p_user_id   uuid,
  p_sku       text,
  p_delta     integer,   -- positivo = entrada, negativo = saída
  p_origem    text,      -- 'pedido' | 'compra' | 'ajuste'
  p_ref_id    text,      -- id do pedido/compra/ajuste
  p_motivo    text
) RETURNS void ...

-- Trigger em pedidos (apenas transições de status específicas)
-- Em processo → Enviado/Concluído: delta = -unidadesEstoque
-- Enviado/Concluído → Devolvido: delta = +unidadesEstoque

-- Trigger em compras
-- INSERT: delta = +quantidadeEntrada
-- UPDATE: delta = novaQtde - antigaQtde
-- DELETE: delta = -quantidadeEntrada

-- Tabela de audit trail (imutável)
CREATE TABLE movimentacoes_estoque (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users,
  sku         text NOT NULL,
  delta       integer NOT NULL,
  origem      text NOT NULL,
  ref_id      text,
  motivo      text,
  estoque_apos integer NOT NULL,
  created_at  timestamptz DEFAULT now()
);
```

> ⚠️ **Cuidado com double-counting:** o frontend atualmente faz o update de estoque otimisticamente via Zustand E depois salva o valor final no Supabase. Com triggers, o banco vai recalcular. A migração exige remover o update direto de `estoqueAtual` do frontend — ele passa a chamar a função RPC e ler o valor de volta.

**Benefício SaaS:** regra igual para todos os tenants; impossível "burlar" pelo frontend.

---

### 0.2 Persistir ajustes manuais

**Problema:** `ajustes[]` só no Zustand/localStorage — some ao trocar máquina, nunca vai ao Supabase.

**Solução:**

```sql
CREATE TABLE ajustes_estoque (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   uuid NOT NULL REFERENCES auth.users,
  sku       text NOT NULL,
  data      date NOT NULL,
  delta     integer NOT NULL,
  motivo    text,
  created_at timestamptz DEFAULT now()
);
```

- Trigger em `ajustes_estoque` (INSERT) chama `aplicar_movimentacao_estoque`
- Frontend: `addAjuste` passa a fazer `dbAjustes.insert()` ao invés de só setar Zustand
- `loadUserData` passa a incluir `ajustes` do Supabase

---

### 0.3 Corrigir persistência do Zustand (partialize)

**Problema:** store inteiro no localStorage = dados stale + risco de quota + bug de darkMode pós-rehydration.

**Solução:** persistir **apenas** preferências de UX via `partialize`:

```typescript
// store/index.ts — adicionar ao persist config
partialize: (state) => ({
  darkMode:            state.darkMode,
  onboardingCompleted: state.onboardingCompleted,
  calculadoraDraft:    state.calculadoraDraft,
  // NÃO persistir: produtos, pedidos, compras, despesas,
  // tarefas, historico, ajustes, configuracoes,
  // categoriasDesp, categoriasProd, precificacoesSalvas
}),
```

> 💡 **Observação:** `categoriasDesp`, `categoriasProd` e `precificacoesSalvas` hoje são persistidas via Zustand. Após o `partialize`, esses dados precisam ir para a tabela `configuracoes` no Supabase (ou nova tabela `precificacoes_salvas`). Sem isso, o usuário perde as customizações ao trocar de dispositivo.

> 💡 **Benefício colateral:** elimina a classe inteira de bugs onde dados de seed aparecem após login (os arrays do store iniciam vazios e são preenchidos pelo Supabase).

---

### 0.4 Gate `isHydrated`

**Problema:** flag existe mas nenhuma página usa — flash de seed/demo na tela enquanto Supabase carrega.

**Solução:** skeleton global no Layout até `isHydrated === true`.

```tsx
// Layout.tsx — antes do <Outlet />
const isHydrated = useStore((s) => s.isHydrated);

if (!isHydrated) {
  return <SkeletonLayout />;  // spinner/skeleton neutro
}
```

> Isso elimina o flash dos dados de seed (PRODUTOS_SEED, COMPRAS_SEED, TAREFAS_SEED) que aparecem por ~200ms enquanto o Supabase carrega.

---

### 0.5 Rollback otimista

**Problema:** UI mostra sucesso; sync pode falhar silenciosamente (toast existe, mas estado local fica errado).

**Solução:** em falha definitiva após retry → re-fetch do registro ou revert local.

```typescript
// Padrão a adotar em cada action crítica:
const prev = get().produtos.find(p => p.sku === sku);
set(optimisticUpdate);
try {
  await dbProdutos.upsert(updated, uid);
} catch {
  set({ produtos: restore(prev) });  // revert
  notifySyncError('...');
}
```

---

### 0.6 Limpar store no logout *(novo — não estava no plano original)*

**Problema:** ao fazer logout, o store Zustand mantém todos os dados do usuário. No próximo login (especialmente em SaaS com usuários diferentes), esses dados aparecem por um frame antes do Supabase carregar.

**Solução:**

```typescript
// AuthContext.tsx — signOut
signOut: async () => {
  await supabase.auth.signOut();
  // Resetar APENAS dados operacionais, manter UX prefs
  useStore.getState().resetOperationalData();
  setUser(null);
},

// store/index.ts — nova action
resetOperationalData: () => set({
  produtos: [],
  pedidos: [],
  compras: [],
  ajustes: [],
  despesas: [],
  tarefas: [],
  historico: [],
  configuracoes: DEFAULT_CONFIGURACOES,
  userId: null,
  isHydrated: false,
}),
```

---

## FASE 1 — Financeiro e importação confiáveis (prioridade #2)

**Entregável:** DRE bate com planilha; import previsível; histórico mensal automático.

### 1.1 Botão "Fechar mês"

**Problema:** DRE live existe (`computeDRE` em Financeiro), mas `historico_mensal` é preenchido manualmente.

**Solução:**

```sql
CREATE OR REPLACE FUNCTION fechar_mes(
  p_user_id uuid,
  p_mes_ano text   -- formato 'YYYY-MM'
) RETURNS void ...
-- Calcula DRE do mês e faz upsert em historico_mensal
```

- Botão "Fechar mês" na tela Financeiro com dialog de confirmação
- Dashboard usa `historico_mensal` para gráfico anual (12 pontos fixos, não agrupar pedidos)
- Permitir re-fechar mês (upsert) para corrigir lançamentos retroativos

> ⚠️ **Validação necessária:** garantir que os campos de `historico_mensal` cobrem todos os campos que o `computeDRE` calcula. Se houver divergência de schema, alinhar antes de implementar a RPC.

---

### 1.2 Import — correções de negócio

| Gap | Correção |
|-----|---------|
| Shopee nativo fixa loja `Cardoso e-Shop` | Detectar loja no export ou perguntar no modal de import |
| UpSeller zera taxas/DAS/Ads | Aplicar `configuracoes.aliquotaDAS` e `percentualMarketing` pós-import |
| `Devolvido` não mapeado | Adicionar ao `mapearStatus` nos parsers |
| Formato desconhecido | Etapa de mapeamento manual de colunas (fallback mode) |

> 💡 **Sugestão:** adicionar campo `fonteImport` no `Pedido` ('shopee_nativo' | 'upseller' | 'manual'). Isso permite filtrar e re-calcular impostos por fonte sem perder a rastreabilidade.

---

### 1.3 Centralizar `computeDRE`

**Problema:** lógica de DRE está em Financeiro (e parcialmente em Dashboard). Dois lugares = dois valores possíveis.

**Solução:** extrair para `src/domain/dre.ts`:

```typescript
// src/domain/dre.ts
export function computeDRE(
  pedidos: Pedido[],
  despesas: Despesa[],
  configuracoes: Configuracoes,
  mes: number,
  ano: number
): DREResult { ... }
```

Casos de borda a cobrir:
- Meses sem pedidos (retornar zeros, não undefined)
- Meses só com devoluções
- `custoUnitario` pode ter mudado desde a compra → usar custo registrado no pedido, não o atual do produto

---

### 1.4 Log de importações

```sql
CREATE TABLE importacoes_log (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL,
  arquivo       text,
  formato       text,   -- 'shopee_nativo' | 'upseller' | 'custom'
  linhas_total  integer,
  novos         integer,
  duplicados    integer,
  erros         integer,
  created_at    timestamptz DEFAULT now()
);
```

Exibir histórico de imports na página de Vendas (tab ou seção colapsável).

---

## FASE 2 — Arquitetura SaaS-ready (prioridade #3)

**Objetivo:** preparar multi-tenant antes de abrir para outros — sem billing ainda.  
**Entregável:** base pronta para 2º usuário de teste sem refatoração grande.

### 2.1 Multi-tenancy — ajustes necessários

RLS por `user_id` + PK composta em produtos — bom começo.

| Item | Ação |
|------|------|
| Seed por usuário | OK hoje; garantir que nunca vaza seed de outro user |
| `resetToSeed` | Deve limpar Supabase também — renomear para `ativarModoDemo()` |
| Configurações extras | `metaFaturamento`, categorias custom → colunas em `configuracoes` ou JSONB |
| Precificações salvas | Migrar de Zustand para nova tabela `precificacoes_salvas(user_id, ...)` |
| `categoriasDesp` / `categoriasProd` | Migrar de Zustand para `configuracoes` no Supabase |

> ⚠️ **`resetToSeed` atual é perigoso em SaaS:** limpa apenas o Zustand, não o Supabase. Um usuário poderia "resetar" e ficar com dados de seed no Zustand mas dados reais no Supabase, causando inconsistência.

---

### 2.2 Migrations versionadas

Migrar de SQL manual no Dashboard → `supabase/migrations/` + CLI.

```bash
supabase migration new criar_movimentacoes_estoque
supabase db push  # staging
supabase db push --linked  # produção
```

Essencial antes de ter clientes em produção. Um deploy manual errado em produção sem migrations é catastrófico.

---

### 2.3 Realtime (multi-aba / multi-dispositivo)

Subscribe Supabase Realtime em `pedidos`, `produtos`, `tarefas` filtrado por `user_id`.

```typescript
supabase
  .channel('user-data')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos',
      filter: `user_id=eq.${userId}` }, handlePedidosChange)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'produtos',
      filter: `user_id=eq.${userId}` }, handleProdutosChange)
  .subscribe()
```

Prioridade média agora; **crítica quando tiver equipe (CoWork)**. Sem Realtime, duas abas abertas mostram estoques divergentes.

---

### 2.4 Estrutura de planos (schema only, sem cobrança)

```sql
-- Conceito futuro (criar schema, não implementar lógica de billing)
CREATE TABLE plans (
  id                 text PRIMARY KEY,
  nome               text NOT NULL,
  limite_pedidos_mes integer,   -- NULL = ilimitado
  limite_skus        integer,
  limite_usuarios    integer,
  features           jsonb      -- { "dre": true, "import_auto": false, ... }
);

CREATE TABLE subscriptions (
  user_id            uuid PRIMARY KEY REFERENCES auth.users,
  plan_id            text REFERENCES plans,
  status             text DEFAULT 'active',
  pedidos_mes_atual  integer DEFAULT 0,
  periodo_inicio     date,
  periodo_fim        date
);
```

Não implementar billing ainda — apenas garantir que limites possam ser checados depois (ex.: import bloqueia se `pedidos_mes_atual > limite_pedidos_mes`).

---

## FASE 3 — Qualidade de produto (prioridade #4)

**Entregável:** sensação de produto profissional; regressões detectadas automaticamente.

### 3.1 Refatoração de páginas

Quebrar monolitos sem mudar UX:

| Arquivo atual | Decomposição |
|---|---|
| `Estoque.tsx` (~52KB) | tabs (`Posicao/`, `Compras/`, `Movimentacoes/`) + modais separados |
| `Vendas.tsx` (~70KB) | `import/parsers/shopee.ts`, `import/parsers/upseller.ts`, `import/parsers/custom.ts` |
| `Calculadora.tsx` | modos Shopee/Avançado separados |
| `Financeiro.tsx` | `DRELive/`, `HistoricoMensal/`, `Projecao/` |
| Componentes reutilizáveis | `components/ui/` → Button, Modal, KPICard, Badge, Table |

---

### 3.2 Design system e purple ban

**Problema:** `violet/purple` aparece em linhas de ajuste (Estoque/Movimentações) — cor fora da paleta Shopee.

**Solução:** substituir por tokens da paleta oficial:
- Ajustes manuais: `amber` (neutro/atenção)
- Entradas (compras): `emerald`
- Saídas (pedidos): `sky`
- Alertas críticos: `red`

Documentar tokens em `src/design-system.md` — referência única para paleta, espaçamentos, tipografia.

---

### 3.3 Performance

| Item | Ação |
|------|------|
| `xlsx` 421KB no bundle inicial | Lazy import só quando abre modal de importação |
| Gráfico anual lento (muitos pedidos) | Usar `historico_mensal` em vez de agrupar pedidos on-the-fly |
| Tabelas grandes (>500 linhas) | Virtualização com `react-window` ou paginação server-side |
| Re-renders excessivos | Revisar seletores Zustand granulares em cada página |

---

### 3.4 UX operacional

**Do plano original:**
- Indicador de sync no header (spinner/check enquanto saving)
- Undo em delete em lote (5s toast com cancelamento)
- Mobile: tabelas → cards em telas pequenas

**Adições sugeridas:**
- Seleção de linhas por checkbox em Vendas (ação em lote já existe, mas seleção é frágil)
- Visibilidade de colunas configurável em Vendas e Estoque
- Busca global `Cmd+K` (já existe atalho `d/v/e/f/k/c` — expandir para buscar SKU/pedido)
- Modo compacto de tabela (densidade de linhas)

---

### 3.7 Popup de ação rápida nos cards de estoque (Dashboard)

**Origem:** cards do widget "Status de Estoque" no Dashboard.

**Comportamento esperado:**
- Hover no card → elevação suave (shadow + scale leve), cursor pointer
- Click → modal centralizado com 3 ações:
  1. **Registrar compra** → abre modal de nova compra com SKU pré-preenchido
  2. **Registrar venda manual** → abre modal de novo pedido com produto pré-selecionado
  3. **Criar tarefa** → abre modal de nova tarefa com título sugerido ("Comprar [SKU]" ou "Verificar estoque [SKU]")
- Fechar: botão X no canto superior direito + tecla `Esc`
- Animação de entrada: fade + scale-up suave (150ms)

```tsx
// Estrutura sugerida
<StockCardPopup
  produto={produto}
  onClose={() => setSelected(null)}
  onCompra={() => { ... }}
  onVenda={() => { ... }}
  onTarefa={() => { ... }}
/>
```

**Onde implementar:** `src/pages/Dashboard.tsx` → extrair widget em `components/dashboard/StockStatusWidget.tsx`.

---

### 3.8 Filtro por loja (multi-loja)

**Contexto:** usuário pode ter mais de uma loja na Shopee (ex.: "Cardoso e-Shop" e outra). Pedidos já têm campo `loja`; o filtro precisa aparecer em todas as telas principais.

**Solução:**

```typescript
// store/index.ts — nova state
lojaFiltro: string | 'todas'  // default: 'todas'
setLojaFiltro: (loja: string | 'todas') => void
```

- **Header global** (ao lado do email no sidebar expandido ou no topo mobile) → dropdown com as lojas do usuário + "Todas as lojas"
- **Páginas afetadas:** Dashboard, Vendas, Estoque, Financeiro, Despesas
- **Persistência:** salvar `lojaFiltro` no `partialize` (preferência de sessão)
- **Lojas disponíveis:** derivar dos pedidos — `[...new Set(pedidos.map(p => p.loja))]`

> 💡 **Relação com import:** a correção do import (item 1.2) que detecta a loja automaticamente é pré-requisito para esse filtro ser útil. Se todos os pedidos vierem com loja errada (hardcoded "Cardoso e-Shop"), o filtro não agrega valor.

---

### 3.9 Calendário

**Objetivo:** visualização de tarefas com data + eventos operacionais (fechamento de mês, datas de import, vencimentos).

**Onde fica:** tab "Calendário" dentro da página Kanban (`/kanban`). Tabs: `Lista | Calendário`. Mini-widget no Dashboard ("Próximas tarefas") com as 3 próximas entradas com data.

**Funcionalidades (MVP):**
- Tarefas com `dataVencimento` aparecem como eventos no calendário
- Click em dia vazio → modal de nova tarefa com data pré-preenchida
- Click em evento → modal de edição da tarefa
- Navegar mês a mês (setas ‹ ›) + botão "Hoje"
- Badges de contagem em dias com múltiplos eventos
- Cores por status da tarefa (pendente → amber, em andamento → sky, concluído → emerald)

**Funcionalidades (futuras — não MVP):**
- Adicionar eventos de negócio (tipo "Fechar mês", "Reunião fornecedor") sem vínculo com tarefa
- Sincronização Google Calendar (OAuth, bidirecional) → **Fase 4, plano Max+**

**Sugestão de implementação:** biblioteca `react-big-calendar` (já usada em projetos similares) ou implementação manual com grid CSS simples (mais leve, sem dependência nova).

```typescript
// Extensão do tipo Tarefa existente
interface Tarefa {
  // ...campos atuais...
  dataVencimento?: string  // ISO date — verificar se já existe
  recorrencia?: 'diaria' | 'semanal' | 'mensal' | null  // opcional Fase 3+
}
```

> 💡 **Mini-widget Dashboard:** componente `ProximasTarefas` — lista as 3–5 tarefas com `dataVencimento` mais próximas. Link "Ver calendário" leva para `/kanban?tab=calendario`.

---

### 3.5 Testes

| Suite | Cobertura alvo |
|-------|----------------|
| Parsers de import | 100% dos formatos conhecidos (Shopee nativo, UpSeller, custom) |
| `domain/dre.ts` | Casos da planilha original (valores exatos) |
| Triggers SQL | Scripts de verificação no Supabase |
| `store/index.ts` actions | Actions críticas: addPedido, updatePedidoStatus, toggleDarkMode |
| E2E Playwright | Login → import → mudar status → verificar estoque |

---

### 3.6 CI/CD

```yaml
# GitHub Actions (sugerido)
push → lint → tsc --noEmit → vitest run → vite build → deploy preview (Vercel)
merge main → supabase db push (staging) → E2E smoke → deploy prod
```

---

## FASE 4 — SaaS e monetização (futuro)

Só depois das Fases 0–3 concluídas.

### 4.1 Planos sugeridos

| Plano | Pedidos/mês | SKUs | Usuários | Features |
|-------|------------|------|----------|----------|
| **Free** | 100 | 20 | 1 | Dashboard, Vendas, Estoque básico, Calculadora(Limitada) |
| **Starter** | 500 | 50 | 1 | + Calculadora, export CSV |
| **Pro** | 3.000 | ilimitado | 1 | + Financeiro/DRE, fechar mês, alertas |
| **Max** | 10.000 | ilimitado | 1 | + import automático, relatórios PDF |
| **CoWork Starter** | 5.000 | ilimitado | 3 | + Kanban compartilhado, roles |
| **CoWork Titanium** | ilimitado | ilimitado | 10+ | + API, multi-loja, suporte prioritário |

**Adições ao plano original:**
- Trial de 14 dias em todos os planos pagos (sem cartão)
- Export completo dos dados ao cancelar (LGPD)
- Enforcement gradual: aviso a 80% do limite, bloqueio a 100%

---

### 4.2 CoWork — multi-usuário na mesma loja

Hoje RLS é `auth.uid() = user_id`. CoWork exige:

```sql
CREATE TABLE organizations (
  id      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome    text NOT NULL,
  owner   uuid REFERENCES auth.users
);

CREATE TABLE org_members (
  org_id   uuid REFERENCES organizations,
  user_id  uuid REFERENCES auth.users,
  role     text NOT NULL,  -- 'owner' | 'admin' | 'operador' | 'viewer'
  PRIMARY KEY (org_id, user_id)
);
```

Refatoração significativa em todas as queries — motivo para deixar para Fase 4.

---

### 4.3 Onboarding SaaS

- Wizard: criar loja → importar primeira planilha → tour guiado
- Demo mode com seed isolado (sem misturar com dados reais)
- Página de pricing + checkout (Stripe)
- Email de boas-vindas com link de import

---

### 4.4 Integrações premium (Max+)

- Import automático UpSeller/Shopee API (cron diário via Edge Function)
- Alertas de ruptura de estoque por email/WhatsApp
- Export contábil (formato SPED/planilha contábil)

---

## Prioridade de implementação

Quando autorizado, esta seria a ordem de execução:

```
 0. [pré] Atualizar gestao-shopee.md (marcar o que já está feito)
 1. [F0] Triggers estoque + movimentacoes_estoque + ajustes_estoque
 2. [F0] partialize persist + 0.6 limpar store no logout
 3. [F0] isHydrated gate (skeleton global)
 4. [F0] Rollback otimista nas actions críticas
 5. [F1] Centralizar computeDRE (domain/dre.ts)
 6. [F1] Fechar mês (RPC + botão Financeiro)
 7. [F1] Correções de import (loja, DAS/Ads, Devolvido)         ← pré-req para filtro de loja
 8. [F2] Migrations versionadas (Supabase CLI)
 9. [F2] Multi-tenancy ajustes (resetToSeed → ativarModoDemo, mover configs para Supabase)
10. [F1] Log de importações
11. [F2] Realtime multi-aba
12. [F3] Popup de ação rápida nos cards de estoque (3.7)
13. [F3] Filtro por loja — header global + todas as páginas (3.8)
14. [F3] Calendário no Kanban + mini-widget Dashboard (3.9)
15. [F3] Refatorar Estoque e Vendas (import/parsers/)
16. [F3] Testes (parsers + DRE + E2E básico)
17. [F3] CI/CD + deploy cloud (Vercel + Supabase)
18. [F3] Performance (lazy xlsx, historico_mensal no gráfico)
19. [F3] UX operacional (sync indicator, undo delete)
20. [F3] Design system e purple ban (incluindo Financeiro, Despesas, Calculadora)
21. [F2] Schema subscriptions (sem billing)
22. [F4] Stripe + planos + enforcement
23. [F4] Google Calendar sync (OAuth) — plano Max+
24. [F4] CoWork (organizations + members)
```

> Items 1–4 podem ser paralelos entre si. Items 5–7 também. Item 13 depende do 7.

---

## Riscos se pular etapas

| Se pular... | Consequência |
|-------------|-------------|
| Triggers de estoque | Clientes SaaS reportam "estoque errado" — churn imediato |
| partialize persist | Bugs intermitentes impossíveis de reproduzir (dados stale) |
| Limpar store no logout | Em SaaS, usuário B vê dados do usuário A por frações de segundo |
| Fechar mês | DRE histórico inconsistente; gráfico anual lento com 10k pedidos |
| Migrations versionadas | Cada deploy manual vira pesadelo; impossível rollback |
| Testes de import | Um CSV novo da Shopee quebra tudo em produção silenciosamente |
| CoWork antes da Fase 0 | Refatoração dupla (RLS + estoque) — dobra o trabalho |

---

## Definition of Done — "100% funcional"

Antes de pensar em planos pagos, considerar pronto quando:

- [ ] Mudar status de pedido em 2 abas → estoque idêntico em ambas
- [ ] Ajuste manual persiste após logout/login em outro browser
- [ ] Import UpSeller 500 pedidos → preview → confirma → todos no banco
- [ ] DRE do mês atual bate com planilha original (±R$0,01)
- [ ] "Fechar mês" gera linha em `historico_mensal` correta
- [ ] Falha de rede durante save → toast + estado reconciliado (não fica errado)
- [ ] Build + testes + E2E smoke passam no CI
- [ ] Deploy cloud acessível com Google + email auth

---

## Infraestrutura cloud recomendada

```
┌─────────────┐    ┌──────────────────────────┐    ┌──────────────────┐
│   Vercel    │───▶│        Supabase           │───▶│   PostgreSQL     │
│ (Frontend)  │    │ Auth + RLS + Realtime     │    │ + Triggers       │
└─────────────┘    │ Storage* + Edge Funcs     │    │ + RPCs           │
                   └──────────────────────────┘    └──────────────────┘
```

`* Storage:` backups de XLSX importados (opcional, mas útil para auditoria)

**Custo estimado inicial:** Supabase Free/Pro + Vercel Hobby ≈ R$0–150/mês até ter clientes pagantes.

**Futuro:** Stripe webhooks → Edge Function → atualiza `subscriptions`.

---

## Documentação a manter sincronizada

Ao implementar cada fase, atualizar:

1. `gestao-shopee.md` — checklist de tarefas operacionais
2. `spec.md` seção 6 — remover itens já resolvidos
3. `CHANGELOG.md` — por release (criar se não existir)
4. `README.md` — setup dev + deploy
5. `PLANO_MESTRE.md` (este arquivo) — marcar fases concluídas
6. `docs/SAAS_ROADMAP.md` — criar na Fase 4 (planos, limites, pricing)
