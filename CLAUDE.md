# CLAUDE.md — Guia de Contexto para Agentes IA

Este arquivo descreve as convenções, decisões de design e armadilhas do projeto **Core Gestor** para orientar agentes IA (Claude Code e similares).

---

## Identidade do produto

- **Nome:** Core Gestor
- **Tagline:** Business OS para E-commerce
- **URL produção:** https://app.coregestor.com.br
- **Landing page:** https://coregestor.com.br
- **Repo:** `shopee-gestao` (nome histórico do repositório — não representa mais o escopo)
- **localStorage keys:** `shopee-gestao-store`, `shopee-gestao-import-log` — **NÃO alterar** sem migração explícita (quebra dados de usuários existentes)

---

## Stack

React 19 + TypeScript strict + Vite + Tailwind + Zustand + Supabase + React Query

TypeScript config importante:

- `verbatimModuleSyntax: true` → sempre `import type` para tipos
- `noUnusedLocals: true` / `noUnusedParameters: true` → sem variáveis mortas
- `erasableSyntaxOnly: true` → sem `enum` ou `namespace`

---

## Convenções de código

### Imports

- Sempre `import type { X }` para tipos puros
- ESLint com `simple-import-sort` — imports são ordenados automaticamente no pre-commit

### Componentes React

- Functional components apenas
- Sem `React.FC` — use `function Foo(props: Props)`
- Sem `React.memo` a menos que haja profiling medindo ganho real

### Tailwind

- Paleta permitida: `slate`, `emerald`, `blue`, `sky`, `teal`, `amber`, `cyan`, `red`
- **Proibido:** `violet`, `purple`, `indigo` (conflito visual com brand) — exceto badges de plano em `Planos.tsx` e `Configs.tsx`
- Tokens custom: `core-green` (#18B37A), `core-green-h` (#0e9463), `core-black` (#111111)

### Comentários

- Nenhum por padrão. Apenas quando o **porquê** é não-óbvio (constraint oculto, workaround específico)
- Sem docstrings descritivas — nomes de função devem ser auto-explicativos

---

## Store Zustand (`src/store/index.ts`)

Store monolítico (~1100 linhas). Chave de persistência: `shopee-gestao-store`.

### Padrão de mutations

Todas as ações críticas (add/update/delete) seguem o padrão **otimista**:

1. Atualiza estado local imediatamente (com `set()`)
2. Chama Supabase com `withRetry()` em background
3. Em caso de falha: estado local é revertido + toast de erro via `notifySyncError()`

### `deleteProduto` — cascade delete

`deleteProduto(sku)` deleta produto **e** todos os pedidos e compras vinculados atomicamente. Não existe guard que bloqueia deleção por ter pedidos/compras vinculados.

### `updateProduto` — sincroniza pedidos

Quando `custoUnitario` muda, `updateProduto` recalcula `custoTotal`, `lucroOperacional` e margens em todos os pedidos daquele SKU no estado local e persiste no Supabase via `dbPedidos.upsertMany()`.

### Cuidado com React Query

`usePedidos()` (React Query) refaz fetch do Supabase e sobrescreve o estado via `useStore.setState({ pedidos: query.data })`. Isso pode regredir custos calculados localmente. Em Vendas.tsx existe `pedidosComCusto` useMemo que rederiva custos a partir dos produtos atuais para ser imune a esse problema.

---

## Hierarquia financeira (P&L)

```
faturamentoBruto
  − descontos
= receitaLiquida
  − CMV (custoTotal dos pedidos)
= lucroBruto
  − taxaShopee − dasImposto − adsMarketing
= lucroOperacional   ← já inclui DAS por pedido
  − despesasExternas (despesas lançadas no mês)
= lucroLíquido
```

**Regra crítica:** `pedido.lucroOperacional` já desconta DAS (dasImposto). Dashboard e DRE NÃO devem subtrair DAS novamente. A função `getKPIsMes(pedidos, mes, despesasExternas)` recebe `despesasExternas` opcionalmente e aplica apenas esse desconto adicional.

---

## Módulo de importação (`src/import/parsers/`)

Detecção automática de formato:

- `'ID do pedido'` em row[0] → Shopee nativo (`shopee.ts`)
- `'Nº de Pedido da Plataforma'` em row[0] → UpSeller (`upseller.ts`)
- else → genérico (`generico.ts`)

`lojaDefault` sempre usa `configuracoes.lojas[0]` — nunca hardcoded.

---

## DRE (`src/domain/dre.ts`)

`computeDRE(pedidos, despesas, historico, mes)` — função centralizada usada em Financeiro.tsx, Relatorio.tsx e testes.

Hierarquia: `faturamentoBruto → descontos → receitaLiquida → lucroBruto → lucroOperacional → lucroLiquido`

---

## CI/CD (`./github/workflows/ci.yml`)

### Jobs bloqueantes (falha = PR bloqueado)

1. `lint` — ESLint + Prettier + TypeScript
2. `checklist` — padrões IA obrigatórios
3. `unit-tests` — Vitest com cobertura
4. `security` — npm audit high+ e secret-scan no src/
5. `rls-validation` — políticas RLS do Supabase
6. `build` — build de produção + secret-scan no dist/

### Gate final

Job `gate` verifica que todos os 6 jobs acima passaram. Proteção de branch deve exigir `gate` para merge em main.

---

## Segurança

- Secrets em `.env.local` (nunca versionado)
- Supabase usa apenas `anon key` no cliente — sem `service_role` no frontend
- `scripts/secret-scan.mjs` verifica padrões de secrets em src/ e dist/ (CI bloqueante)
- RLS ativo em todas as tabelas operacionais (`user_id = auth.uid()`)

---

## Testes (`src/__tests__/`)

```
npm run test:coverage   # roda todos, gera relatório
```

Suites existentes: `store.test.ts`, `calculations.test.ts`, `dre.test.ts`, `parsers.test.ts`, `precificacao.test.ts`

Ao alterar lógica financeira: verificar e atualizar `calculations.test.ts` e `dre.test.ts`.

---

## Deploy

- **Vercel** com `vercel.json` → SPA rewrite para `index.html`
- Build command: `tsc -b && vite build`
- Variáveis necessárias: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Pre-commit hooks via `simple-git-hooks` + `lint-staged` (ESLint fix + Prettier)

---

## O que NÃO fazer

- Não adicionar `continue-on-error: true` em jobs de segurança CI
- Não mover dados de usuário para fora do Supabase sem considerar RLS
- Não subtrair DAS duas vezes no cálculo de lucro (já está em `lucroOperacional`)
- Não alterar chaves localStorage sem migração (perde dados de usuários)
- Não usar cores `violet`/`purple`/`indigo` fora dos arquivos de plano
- Não adicionar comentários descritivos — apenas WHY não-óbvio
