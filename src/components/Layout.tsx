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

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingCart },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/financeiro', label: 'Financeiro', icon: TrendingUp },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/kanban', label: 'Tarefas', icon: KanbanSquare },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/calculadora', label: 'Calculadora', icon: Calculator },
  { to: '/configs', label: 'Configurações', icon: Settings },
];

const SHORTCUTS = [
  { key: '⌘B / Ctrl+B', desc: 'Colapsar/expandir sidebar' },
  { key: '⌘K / Ctrl+K', desc: 'Ir para Dashboard' },
  { key: '?', desc: 'Atalhos de teclado' },
  { key: 'Esc', desc: 'Fechar modal / painel' },
  { key: 'D', desc: 'Dashboard' },
  { key: 'V', desc: 'Vendas' },
  { key: 'E', desc: 'Estoque' },
  { key: 'F', desc: 'Financeiro' },
  { key: 'K', desc: 'Tarefas (Kanban)' },
  { key: 'C', desc: 'Calculadora' },
];

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
    <div className="[@media(hover:none)]:hidden pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-[200] opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus-within:delay-0 transition-opacity duration-150 delay-100">
      <div className="relative bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl ring-1 ring-white/5">
        {label}
        <span className="absolute right-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-r-slate-800" />
      </div>
    </div>
  );
}

function ShortcutsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Keyboard size={16} className="text-shopee-500" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Atalhos de teclado</h3>
        </div>
        <div className="space-y-2">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
              <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-600">{key}</kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Fechar (Esc)
        </button>
      </div>
    </div>
  );
}

function LayoutSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[240px] bg-slate-900">
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5">
          <div className="w-9 h-9 bg-slate-700 rounded-xl animate-pulse" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-700 rounded animate-pulse w-3/4" />
            <div className="h-2.5 bg-slate-800 rounded animate-pulse w-1/2" />
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 bg-slate-800 rounded-xl animate-pulse mx-1" style={{ opacity: 1 - i * 0.08 }} />
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-shopee-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Carregando dados…</p>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const darkMode       = useStore((s) => s.darkMode);
  const isHydrated     = useStore((s) => s.isHydrated);
  const userId         = useStore((s) => s.userId);
  const produtos       = useStore((s) => s.produtos);
  const lojaFiltro     = useStore((s) => s.lojaFiltro);
  const setLojaFiltro  = useStore((s) => s.setLojaFiltro);
  const toggleDark     = () => useStore.getState().toggleDarkMode();

  useRealtime(userId);

  const lojasDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.loja).filter((l) => l !== 'Ambas'))].sort(),
    [produtos],
  );

  const [collapsed,       setCollapsed]       = useState(() => localStorage.getItem('sb-collapsed') === '1');
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [showShortcuts,   setShowShortcuts]   = useState(false);

  // Sincroniza a classe `dark` no <html> antes da pintura do browser.
  // useLayoutEffect (não useEffect) para evitar flash de modo errado.
  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem('sb-collapsed', next ? '1' : '0');
      return next;
    });

  // Keyboard shortcuts
  useEffect(() => {
    const NAV_KEYS: Record<string, string> = { d: '/', v: '/vendas', e: '/estoque', f: '/financeiro', k: '/kanban', c: '/calculadora' };
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

  const navItems = (compact: boolean, onNavigate?: () => void) =>
    nav.map(({ to, label, icon: Icon, end }) => (
      <div key={to} className="relative group">
        <NavLink
          to={to}
          end={end}
          onClick={onNavigate}
          title={compact ? label : undefined}
          className={({ isActive }) =>
            `flex items-center rounded-xl text-sm font-medium transition-all duration-200 ${
              compact
                ? 'flex-col justify-center items-center w-10 py-1.5 mx-auto gap-0.5'
                : 'gap-3 px-3 py-2.5'
            } ${
              isActive
                ? 'bg-shopee-500 text-white shadow-lg shadow-shopee-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`
          }
        >
          <Icon size={17} className="flex-shrink-0" />
          {compact
            ? <span className="text-[8px] font-medium leading-none text-current opacity-75 text-center w-full truncate px-0.5">{label}</span>
            : <span className="truncate">{label}</span>
          }
        </NavLink>
        {compact && <Tip label={label} />}
      </div>
    ));

  const darkBtn = (compact: boolean) => (
    <div className="relative group">
      <button
        onClick={toggleDark}
        title={darkMode ? 'Modo claro' : 'Modo escuro'}
        className={`flex items-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all duration-200 ${
          compact ? 'flex-col justify-center items-center w-10 py-1.5 gap-0.5' : 'gap-2.5 w-full px-3 py-2 text-sm'
        }`}
      >
        {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        {compact
          ? <span className="text-[8px] font-medium leading-none opacity-75 text-center w-full truncate px-0.5">{darkMode ? 'Claro' : 'Escuro'}</span>
          : (darkMode ? 'Modo claro' : 'Modo escuro')
        }
      </button>
      {compact && <Tip label={darkMode ? 'Modo claro' : 'Modo escuro'} />}
    </div>
  );

  return (
    <ToastProvider>
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">

      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 flex-shrink-0">
          <div className="w-9 h-9 bg-shopee-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-shopee-500/30">
            <Store size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm leading-tight">Gestão Shopee</p>
            <p className="text-slate-400 text-xs truncate">{user?.email}</p>
          </div>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {navItems(false, () => setMobileOpen(false))}
        </nav>
        <div className="border-t border-white/5 px-3 py-3 space-y-1">
          {darkBtn(false)}
          <button
            onClick={signOut}
            className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <LogOut size={15} /> Sair
          </button>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside className={`hidden md:flex flex-col flex-shrink-0 bg-slate-900 relative transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'w-[64px]' : 'w-[240px]'}`}>
        <div className={`flex items-center border-b border-white/5 h-16 flex-shrink-0 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-4 gap-3'}`}>
          <div className="w-9 h-9 bg-shopee-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-shopee-500/30">
            <Store size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0 overflow-hidden">
              <p className="text-white font-semibold text-sm leading-tight whitespace-nowrap">Gestão Shopee</p>
              <p className="text-slate-400 text-xs whitespace-nowrap truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems(collapsed)}
        </nav>

        <div className={`border-t border-white/5 transition-all duration-300 ${collapsed ? 'py-3 flex flex-col items-center gap-1' : 'px-3 py-3 space-y-1'}`}>
          {darkBtn(collapsed)}

          <div className="relative group">
            <button
              onClick={signOut}
              title={collapsed ? 'Sair' : undefined}
              className={`flex items-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 ${collapsed ? 'flex-col justify-center items-center w-10 py-1.5 gap-0.5' : 'gap-2.5 w-full px-3 py-2 text-sm'}`}
            >
              <LogOut size={15} />
              {collapsed
                ? <span className="text-[8px] font-medium leading-none opacity-75 text-center">Sair</span>
                : 'Sair'
              }
            </button>
            {collapsed && <Tip label="Sair" />}
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expandir sidebar (⌘B)' : 'Recolher sidebar (⌘B)'}
          className="absolute right-0 top-[72px] translate-x-1/2 w-[22px] h-[22px] bg-white dark:bg-slate-700 hover:bg-shopee-500 border border-slate-200 dark:border-slate-600 hover:border-shopee-500 rounded-full flex items-center justify-center transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-shopee-500/25 z-20 group/btn"
        >
          <ChevronRight size={11} className={`text-slate-500 dark:text-slate-300 group-hover/btn:text-white transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-6 h-6 bg-shopee-500 rounded-lg flex items-center justify-center">
              <Store size={13} className="text-white" />
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
