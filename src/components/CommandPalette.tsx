import {
  ArrowRight,
  Download,
  FileUp,
  Lightbulb,
  Package,
  Receipt,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { NAV_ITEMS } from '../navigation';
import { useStore } from '../store';

// ─── Types ────────────────────────────────────────────────────────────────────

type ResultKind = 'action' | 'page' | 'produto' | 'pedido';

interface Result {
  id: string;
  kind: ResultKind;
  label: string;
  sub?: string;
  icon: React.ElementType;
  to: string;
}

interface Section {
  key: string;
  title: string;
  items: Result[];
}

// ─── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS: (Result & { keywords: string })[] = [
  {
    id: 'a-importar',
    kind: 'action',
    label: 'Importar pedidos',
    sub: 'Carregar CSV ou XLSX',
    icon: FileUp,
    to: '/importar',
    keywords: 'importar csv xlsx upload arquivo',
  },
  {
    id: 'a-fechar-mes',
    kind: 'action',
    label: 'Fechar mês',
    sub: 'Registrar resultado mensal',
    icon: TrendingUp,
    to: '/financeiro',
    keywords: 'fechar mês histórico resultado pl financeiro',
  },
  {
    id: 'a-despesa',
    kind: 'action',
    label: 'Adicionar despesa',
    sub: 'Registrar custo operacional',
    icon: Receipt,
    to: '/despesas',
    keywords: 'despesa custo gasto adicionar novo',
  },
  {
    id: 'a-compra',
    kind: 'action',
    label: 'Registrar compra',
    sub: 'Entrada de estoque e CMV',
    icon: ShoppingBag,
    to: '/compras',
    keywords: 'compra entrada estoque cmv nota nf',
  },
  {
    id: 'a-insights',
    kind: 'action',
    label: 'Ver insights',
    sub: 'Análise automática do negócio',
    icon: Lightbulb,
    to: '/insights',
    keywords: 'insights análise automática alerta',
  },
  {
    id: 'a-reposicao',
    kind: 'action',
    label: 'Reposição urgente',
    sub: 'Produtos abaixo do estoque mínimo',
    icon: RefreshCw,
    to: '/reposicao',
    keywords: 'reposição estoque mínimo urgente baixo',
  },
  {
    id: 'a-exportar',
    kind: 'action',
    label: 'Exportar dados',
    sub: 'Backup em XLSX',
    icon: Download,
    to: '/exportar',
    keywords: 'exportar backup xlsx download',
  },
  {
    id: 'a-configs',
    kind: 'action',
    label: 'Configurações',
    sub: 'DAS, margem, empresa, lojas',
    icon: Settings,
    to: '/configs',
    keywords: 'config configurações das alíquota empresa loja',
  },
];

// ─── Fuzzy score ──────────────────────────────────────────────────────────────

function score(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  if (q.split(' ').every((w) => t.includes(w))) return 40;
  return 0;
}

// ─── Kind badge meta ──────────────────────────────────────────────────────────

const KIND_BADGE: Record<ResultKind, { label: string; cls: string }> = {
  action: { label: 'ação', cls: 'bg-core-green/10 text-core-green' },
  page: {
    label: 'página',
    cls: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
  },
  produto: {
    label: 'produto',
    cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  pedido: {
    label: 'pedido',
    cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
};

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({
  result,
  selected,
  onSelect,
}: {
  result: Result;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = result.icon;
  const badge = KIND_BADGE[result.kind];
  return (
    <button
      onMouseDown={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
        selected
          ? 'bg-core-green/10 dark:bg-core-green/10'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
          selected
            ? 'bg-core-green text-white'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
        }`}
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${selected ? 'text-core-green' : 'text-slate-700 dark:text-slate-200'}`}
        >
          {result.label}
        </p>
        {result.sub && (
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{result.sub}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badge.cls}`}>
          {badge.label}
        </span>
        {selected && <ArrowRight size={12} className="text-core-green" />}
      </div>
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-3 pb-1">
      <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
        {title}
      </span>
      <span className="text-[10px] text-slate-300 dark:text-slate-600">{count}</span>
    </div>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────

export function CommandPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const pedidosAll = useStore((s) => s.pedidos);
  const produtosAll = useStore((s) => s.produtos);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Build sections ─────────────────────────────────────────────────────────
  const sections = useMemo<Section[]>(() => {
    const q = query.trim();

    const actions: Result[] = QUICK_ACTIONS.map((a) => ({
      s: Math.max(score(a.label, q), score(a.keywords, q)),
      r: { id: a.id, kind: a.kind, label: a.label, sub: a.sub, icon: a.icon, to: a.to } as Result,
    }))
      .filter(({ s }) => !q || s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 4)
      .map(({ r }) => r);

    const pages: Result[] = NAV_ITEMS.map((p) => ({
      s: Math.max(score(p.label, q), score(p.keywords ?? '', q)),
      r: {
        id: `page-${p.to}`,
        kind: 'page' as ResultKind,
        label: p.label,
        icon: p.icon,
        to: p.to,
      } as Result,
    }))
      .filter(({ s }) => !q || s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, q ? 5 : 8)
      .map(({ r }) => r);

    if (!q) {
      const out: Section[] = [];
      if (actions.length) out.push({ key: 'actions', title: 'Ações rápidas', items: actions });
      if (pages.length) out.push({ key: 'pages', title: 'Páginas', items: pages });
      return out;
    }

    const prods: Result[] = produtosAll
      .filter((p) => `${p.sku} ${p.nome}`.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 4)
      .map((p) => ({
        id: `prod-${p.sku}`,
        kind: 'produto' as ResultKind,
        label: p.nome,
        sub: `SKU: ${p.sku} · Estoque: ${p.estoqueAtual}`,
        icon: Package,
        to: `/estoque/${p.sku}`,
      }));

    const peds: Result[] = pedidosAll
      .filter((p) => p.numeroPedido.toLowerCase().includes(q.toLowerCase()))
      .slice(0, 3)
      .map((p) => ({
        id: `ped-${p.id}`,
        kind: 'pedido' as ResultKind,
        label: p.numeroPedido,
        sub: `${p.produto} · ${p.data} · ${p.status}`,
        icon: ShoppingCart,
        to: '/vendas',
      }));

    const out: Section[] = [];
    if (actions.length) out.push({ key: 'actions', title: 'Ações', items: actions });
    if (pages.length) out.push({ key: 'pages', title: 'Páginas', items: pages });
    if (prods.length) out.push({ key: 'prods', title: 'Produtos', items: prods });
    if (peds.length) out.push({ key: 'peds', title: 'Pedidos', items: peds });
    return out;
  }, [query, produtosAll, pedidosAll]);

  // Flat for keyboard navigation
  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    setSelected(0);
  }, [flat]);

  const go = useCallback(
    (r: Result) => {
      navigate(r.to);
      onClose();
    },
    [navigate, onClose]
  );

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, flat.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (flat[selected]) go(flat[selected]);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [flat, selected, go, onClose]
  );

  // Track global index across sections while rendering
  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar páginas, ações, produtos, pedidos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto pb-1">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 dark:text-slate-500">
              <Search size={22} className="opacity-40" />
              <p className="text-sm">Nenhum resultado para &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.key}>
                <SectionHeader title={section.title} count={section.items.length} />
                {section.items.map((r) => {
                  const idx = globalIdx++;
                  return (
                    <Row
                      key={r.id}
                      result={r}
                      selected={idx === selected}
                      onSelect={() => {
                        setSelected(idx);
                        go(r);
                      }}
                    />
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[9px]">
              ↑↓
            </kbd>
            navegar
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[9px]">
              ↵
            </kbd>
            abrir
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <kbd className="px-1 py-0.5 border border-slate-200 dark:border-slate-700 rounded text-[9px]">
              ESC
            </kbd>
            fechar
          </span>
          {flat.length > 0 && (
            <span className="ml-auto text-[10px] text-slate-300 dark:text-slate-600">
              {flat.length} resultado{flat.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Dica de descoberta — fundo, abaixo do painel */}
      {!query && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-[11px] text-white/40 pointer-events-none select-none">
          <Zap size={10} />
          <kbd className="px-1 border border-white/20 rounded text-[10px]">⌘K</kbd>
          abre esta palette em qualquer tela
        </div>
      )}
    </div>
  );
}
