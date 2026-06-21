import { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingCart, Package, KanbanSquare,
  TrendingUp, Calculator, Settings, Store, Receipt, LogOut,
  ChevronRight, Menu, Moon, Sun, Keyboard, CalendarDays,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ToastProvider, useToast } from './Toast';
import { setSyncErrorListener } from '../lib/sync';
import { useStore } from '../store';
import { useRealtime } from '../hooks/useRealtime';

// ─── Nav structure ────────────────────────────────────────────────────────────

type NavItemDef = { to: string; label: string; icon: React.ElementType; end?: boolean };
type NavGroup   = { label?: string; items: NavItemDef[] };

const NAV_GROUPS: NavGroup[] = [
  {
    items: [{ to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Operações',
    items: [
      { to: '/vendas',     label: 'Vendas',     icon: ShoppingCart },
      { to: '/estoque',    label: 'Estoque',    icon: Package },
      { to: '/financeiro', label: 'Financeiro', icon: TrendingUp },
      { to: '/despesas',   label: 'Despesas',   icon: Receipt },
    ],
  },
  {
    label: 'Ferramentas',
    items: [
      { to: '/kanban',      label: 'Tarefas',     icon: KanbanSquare },
      { to: '/calendario',  label: 'Calendário',  icon: CalendarDays },
      { to: '/calculadora', label: 'Calculadora', icon: Calculator },
    ],
  },
];

const CONFIG_ITEM = { to: '/configs', label: 'Configurações', icon: Settings };


const SHORTCUTS = [
  { key: '⌘B / Ctrl+B', desc: 'Colapsar/expandir sidebar' },
  { key: '⌘K / Ctrl+K', desc: 'Ir para Dashboard' },
  { key: '?',            desc: 'Atalhos de teclado' },
  { key: 'Esc',          desc: 'Fechar modal / painel' },
  { key: 'D',            desc: 'Dashboard' },
  { key: 'V',            desc: 'Vendas' },
  { key: 'E',            desc: 'Estoque' },
  { key: 'F',            desc: 'Financeiro' },
  { key: 'K',            desc: 'Tarefas (Kanban)' },
  { key: 'C',            desc: 'Calculadora' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(email: string) {
  const name = email.split('@')[0];
  const parts = name.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SyncErrorHandler() {
  const toast = useToast();
  useEffect(() => {
    setSyncErrorListener((msg) => toast(msg, 'error'));
    return () => setSyncErrorListener(() => {});
  }, [toast]);
  return null;
}

function Tip({ label }: { label: string }) {
  return (
    <div className="[@media(hover:none)]:hidden pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-[200] opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-75">
      <div className="relative bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl ring-1 ring-white/10">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-800" />
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-5">
          <Keyboard size={16} className="text-shopee-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Atalhos de teclado</h3>
        </div>
        <div className="space-y-2.5">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
              <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-600 flex-shrink-0">{key}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-6 w-full py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
          Fechar (Esc)
        </button>
      </div>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[260px] bg-[#0d1117]">
        <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/[0.06]">
          <div className="w-8 h-8 bg-white/10 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/10 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-white/5 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-9 bg-white/5 rounded-lg animate-pulse" style={{ opacity: 1 - i * 0.07 }} />
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-shopee-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Carregando…</p>
        </div>
      </div>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  item, collapsed, onNavigate,
}: {
  item: NavItemDef;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const { to, label, icon: Icon, end } = item;
  return (
    <div className="relative group">
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            collapsed ? 'justify-center w-10 h-9 mx-auto' : 'px-3 h-9'
          } ${
            isActive
              ? 'bg-shopee-500 text-white shadow-md shadow-shopee-500/25'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
          }`
        }
      >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </NavLink>
      {collapsed && <Tip label={label} />}
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarNav({
  collapsed, onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-0.5 scrollbar-thin">
      {NAV_GROUPS.map((group, gi) => (
        <div key={gi} className={gi > 0 ? 'pt-2' : ''}>
          {group.label && !collapsed && (
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
              {group.label}
            </p>
          )}
          {gi > 0 && collapsed && <div className="w-5 h-px bg-white/[0.08] mx-auto mb-1.5" />}
          {group.items.map((item) => (
            <NavItem key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({
  collapsed,
  email,
  darkMode,
  onToggleDark,
  onShowShortcuts,
  onSignOut,
}: {
  collapsed: boolean;
  email: string;
  darkMode: boolean;
  onToggleDark: () => void;
  onShowShortcuts: () => void;
  onSignOut: () => void;
}) {
  const initials = getInitials(email);
  const username = email.split('@')[0];

  if (collapsed) {
    return (
      <div className="border-t border-white/[0.06] py-3 flex flex-col items-center gap-2">
        {/* Config */}
        <div className="relative group">
          <NavLink
            to={CONFIG_ITEM.to}
            className={({ isActive }) =>
              `flex items-center justify-center w-10 h-9 rounded-lg transition-all duration-150 ${
                isActive
                  ? 'bg-shopee-500 text-white shadow-md shadow-shopee-500/25'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
              }`
            }
          >
            <Settings size={16} />
          </NavLink>
          <Tip label="Configurações" />
        </div>

        <div className="w-5 h-px bg-white/[0.08] mx-auto" />

        {/* Dark mode */}
        <div className="relative group">
          <button
            onClick={onToggleDark}
            className="flex items-center justify-center w-10 h-9 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all duration-150"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Tip label={darkMode ? 'Modo claro' : 'Modo escuro'} />
        </div>

        {/* User avatar */}
        <div className="relative group">
          <button
            onClick={onSignOut}
            className="w-10 h-10 rounded-xl bg-white/[0.06] hover:bg-red-500/15 text-slate-300 hover:text-red-400 flex items-center justify-center transition-all duration-150 font-bold text-xs ring-1 ring-white/10"
          >
            {initials}
          </button>
          <Tip label="Sair" />
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-white/[0.06]">
      {/* Config item */}
      <div className="px-3 pt-3 pb-2">
        <NavItem item={CONFIG_ITEM} collapsed={false} />
      </div>

      {/* User card */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-shopee-400 to-orange-600 flex items-center justify-center flex-shrink-0 font-bold text-[11px] text-white shadow-inner">
            {initials}
          </div>
          <p className="text-slate-300 text-xs truncate flex-1 leading-tight">{username}</p>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onToggleDark}
              title={darkMode ? 'Modo claro' : 'Modo escuro'}
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-150"
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <button
              onClick={onShowShortcuts}
              title="Atalhos"
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-150"
            >
              <Keyboard size={13} />
            </button>
            <button
              onClick={onSignOut}
              title="Sair"
              className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, signOut }  = useAuth();
  const darkMode           = useStore((s) => s.darkMode);
  const isHydrated         = useStore((s) => s.isHydrated);
  const userId             = useStore((s) => s.userId);
  const produtos           = useStore((s) => s.produtos);
  const lojaFiltro         = useStore((s) => s.lojaFiltro);
  const setLojaFiltro      = useStore((s) => s.setLojaFiltro);
  const toggleDark         = () => useStore.getState().toggleDarkMode();

  useRealtime(userId);

  const lojasDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.loja).filter((l) => l !== 'Ambas'))].sort(),
    [produtos],
  );

  const [collapsed,     setCollapsed]     = useState(() => localStorage.getItem('sb-collapsed') === '1');
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sb-collapsed', next ? '1' : '0');
      return next;
    });

  useEffect(() => {
    const NAV_KEYS: Record<string, string> = {
      d: '/', v: '/vendas', e: '/estoque',
      f: '/financeiro', k: '/kanban', c: '/calculadora',
    };
    const h = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (ev.target as HTMLElement).isContentEditable;
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'b') { ev.preventDefault(); toggle(); return; }
      if (ev.key === '?' && !inInput) { setShowShortcuts((v) => !v); return; }
      if (ev.key === 'Escape') { setShowShortcuts(false); setMobileOpen(false); return; }
      if (inInput) return;
      const path = NAV_KEYS[ev.key.toLowerCase()];
      if (path) window.location.href = path;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  if (!isHydrated) return <LayoutSkeleton />;

  const email = user?.email ?? '';

  return (
    <ToastProvider>
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-[#0d1117] flex flex-col transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/[0.06] flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-shopee-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-shopee-500/30 ring-1 ring-white/10">
            <Store size={15} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight tracking-tight">Gestão Shopee</p>
            <p className="text-slate-500 text-[11px] truncate mt-0.5">{email}</p>
          </div>
        </div>

        <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />

        <SidebarFooter
          collapsed={false}
          email={email}
          darkMode={darkMode}
          onToggleDark={toggleDark}
          onShowShortcuts={() => setShowShortcuts(true)}
          onSignOut={signOut}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-[#0d1117] relative transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'w-[64px]' : 'w-[260px]'}`}>

        {/* Header */}
        <div className={`flex items-center border-b border-white/[0.06] h-[60px] flex-shrink-0 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-5 gap-3'}`}>
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-shopee-400 to-orange-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-shopee-500/30 ring-1 ring-white/10">
            <Store size={15} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight tracking-tight whitespace-nowrap">Gestão Shopee</p>
              <p className="text-slate-500 text-[11px] whitespace-nowrap truncate mt-0.5">Painel do vendedor</p>
            </div>
          )}
        </div>

        <SidebarNav collapsed={collapsed} />

        <SidebarFooter
          collapsed={collapsed}
          email={email}
          darkMode={darkMode}
          onToggleDark={toggleDark}
          onShowShortcuts={() => setShowShortcuts(true)}
          onSignOut={signOut}
        />

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir (⌘B)' : 'Recolher (⌘B)'}
          className="absolute right-0 top-[70px] translate-x-1/2 w-5 h-5 bg-[#1c2230] hover:bg-shopee-500 border border-white/10 hover:border-shopee-500/50 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg z-20 group/btn"
        >
          <ChevronRight size={10} className={`text-slate-400 group-hover/btn:text-white transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-gradient-to-br from-shopee-400 to-orange-600 rounded-lg flex items-center justify-center">
              <Store size={12} className="text-white" />
            </div>
            <span className="text-slate-800 dark:text-slate-100 font-semibold text-sm">Gestão Shopee</span>
          </div>
          <button onClick={toggleDark} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors">
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setShowShortcuts(true)} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors">
            <Keyboard size={16} />
          </button>
        </header>

        {/* Filtro global de loja */}
        {isHydrated && lojasDisponiveis.length > 1 && (
          <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 h-10 flex items-center gap-2 flex-shrink-0">
            <Store size={12} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-0.5">Loja:</span>
            {[null, ...lojasDisponiveis].map((l) => (
              <button
                key={l ?? '__todas__'}
                onClick={() => setLojaFiltro(l)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors whitespace-nowrap ${
                  lojaFiltro === l
                    ? 'bg-shopee-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                }`}
              >
                {l ?? 'Todas'}
              </button>
            ))}
          </div>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
    <SyncErrorHandler />
    </ToastProvider>
  );
}
