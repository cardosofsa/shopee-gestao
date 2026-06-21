# Design System — Shopee Gestão

Referência única de tokens visuais. Qualquer nova tela ou componente deve seguir esta paleta.

---

## Paleta de Cores

### Shopee (brand)
| Token | Classe Tailwind | Uso |
|-------|----------------|-----|
| Primary | `text-shopee-500`, `bg-shopee-500` | Botões primários, links, destaques |
| Light | `bg-shopee-50`, `text-shopee-600` | Badges, fundos de destaque suave |
| Dark | `text-shopee-700` | Texto sobre fundo claro shopee |

> Definido em `tailwind.config.js` como extensão de `colors.shopee`.

### Semântica de Status

| Significado | Cor | Classes exemplo |
|-------------|-----|----------------|
| Sucesso / Entrada / Positivo | **emerald** | `bg-emerald-50 text-emerald-700 border-emerald-200` |
| Saída / Pedido enviado | **sky** | `bg-sky-50 text-sky-700 border-sky-200` |
| Ajuste manual / Atenção | **amber** | `bg-amber-50 text-amber-700 border-amber-200` |
| Erro / Alerta crítico | **red** | `bg-red-50 text-red-500 border-red-200` |
| Neutro / Informativo | **slate** | `text-slate-500`, `border-slate-200` |

> **Regra:** `violet` e `purple` são banidos. Usar `amber` para ajustes, `sky` para saídas.

### Cores Proibidas
- `violet-*` — substituir por `amber-*`
- `purple-*` — substituir por `teal-*` (paletas de categoria) ou `amber-*` (semântica)

---

## Tipografia

| Uso | Classes |
|-----|---------|
| Título de página | `text-xl font-bold text-slate-900 dark:text-slate-100` |
| Título de seção | `text-sm font-semibold text-slate-700 dark:text-slate-300` |
| Label de campo | `text-xs text-slate-500 dark:text-slate-400` |
| Corpo / tabela | `text-sm text-slate-800 dark:text-slate-200` |
| Auxiliar / meta | `text-xs text-slate-400 dark:text-slate-500` |
| Código / SKU | `font-mono text-xs` |

---

## Espaçamentos

| Contexto | Token |
|----------|-------|
| Padding de página | `p-6` |
| Gap entre seções | `space-y-6` |
| Padding de card | `p-5` |
| Gap de itens em linha | `gap-3` ou `gap-2` |
| Padding de célula de tabela | `px-3 py-2.5` (body) · `px-3 py-3` (header) |

---

## Componentes Padrão

### Card
```tsx
<div className="card p-5">...</div>
```
Definido em `src/index.css` — borda, sombra suave, rounded-2xl.

### Botões
```tsx
<button className="btn-primary">Salvar</button>
<button className="btn-secondary">Cancelar</button>
<button className="btn-danger">Excluir</button>
```

### Input / Select
```tsx
<input className="input" />
<select className="select" />
```

### Badge de tipo
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-emerald-50 text-emerald-700 border-emerald-200">
  Entrada
</span>
```

### Modal de confirmação
Seguir o padrão de `ConfirmDeleteModal` em `src/pages/Estoque.tsx`:
- Overlay `bg-black/40`
- Card `rounded-2xl max-w-sm`
- Ícone colorido no centro
- Botões `btn-secondary` + `btn-danger`

---

## Dark Mode

Todas as classes de cor devem ter par `dark:`:
- Fundo: `bg-white dark:bg-slate-800`
- Borda: `border-slate-200 dark:border-slate-700`
- Texto principal: `text-slate-900 dark:text-slate-100`
- Texto secundário: `text-slate-500 dark:text-slate-400`

---

## Ícones

Biblioteca: **Lucide React** (`lucide-react`).  
Tamanhos padrão: `size={14}` em ações inline · `size={16}` em botões · `size={20}` em modais.
