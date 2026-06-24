import {
  CheckCircle2,
  ChevronDown,
  ChevronsLeft,
  Keyboard,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Shield,
  Star,
  Store,
  Sun,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useAdmin } from '../hooks/useAdmin';
import { useAlertas } from '../hooks/useAlertas';
import { useRealtime } from '../hooks/useRealtime';
import {
  setLimitListener,
  setSyncErrorListener,
  setSyncStateListener,
  type SyncState,
} from '../lib/sync';
import { type NavItem, SIDEBAR_GROUPS } from '../navigation';
import { useStore } from '../store';
import { CommandPalette } from './CommandPalette';
import { ToastProvider, useToast } from './Toast';

// NavItem with badge resolved to a number (after dynamic count is applied)
type ResolvedNavItem = Omit<NavItem, 'badge'> & { badge?: number };

const SHORTCUTS = [
  { key: '⌘B / Ctrl+B', desc: 'Colapsar/expandir sidebar' },
  { key: '⌘K / Ctrl+K', desc: 'Busca global (Command Palette)' },
  { key: '?', desc: 'Atalhos de teclado' },
  { key: 'Esc', desc: 'Fechar modal / painel' },
  { key: 'D', desc: 'Dashboard' },
  { key: 'V', desc: 'Vendas' },
  { key: 'E', desc: 'Estoque' },
  { key: 'F', desc: 'Financeiro' },
  { key: 'K', desc: 'Tarefas (Kanban)' },
  { key: 'C', desc: 'Calculadora' },
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

function LimitHandler() {
  const toast = useToast();
  const navigate = useNavigate();
  useEffect(() => {
    setLimitListener((msg, type, showUpgrade) =>
      toast(
        msg,
        type,
        showUpgrade
          ? { duration: 7000, action: { label: 'Ver planos', onClick: () => navigate('/planos') } }
          : { duration: 5000 }
      )
    );
    return () => setLimitListener(null);
  }, [toast, navigate]);
  return null;
}

function SyncDot({ state }: { state: SyncState }) {
  if (state === 'idle') return null;
  return state === 'syncing' ? (
    <Loader2 size={12} className="text-slate-500 animate-spin flex-shrink-0" />
  ) : (
    <CheckCircle2 size={12} className="text-core-green flex-shrink-0" />
  );
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
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <Keyboard size={16} className="text-core-green" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            Atalhos de teclado
          </h3>
        </div>
        <div className="space-y-2.5">
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-600 dark:text-slate-300">{desc}</span>
              <kbd className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-200 dark:border-slate-600 flex-shrink-0">
                {key}
              </kbd>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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
      <aside className="hidden md:flex flex-col flex-shrink-0 w-[260px] bg-core-black">
        <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/[0.06]">
          <div className="w-6 h-6 rounded-full border border-white/20 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-white/10 rounded animate-pulse w-16" />
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-9 bg-white/5 rounded-lg animate-pulse"
              style={{ opacity: 1 - i * 0.07 }}
            />
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-7 h-7 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Carregando…</p>
        </div>
      </div>
    </div>
  );
}

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  isFav,
  onNavigate,
  onToggleFav,
}: {
  item: ResolvedNavItem;
  collapsed: boolean;
  isFav?: boolean;
  onNavigate?: () => void;
  onToggleFav?: (to: string) => void;
}) {
  const { to, label, icon: Icon, end, badge } = item;
  return (
    <div className="relative group/nav">
      <NavLink
        to={to}
        end={end}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-150 ${
            collapsed ? 'justify-center w-10 h-9 mx-auto' : 'px-3 h-9 pr-8'
          } ${
            isActive
              ? 'bg-core-green text-white shadow-md shadow-core-green/20'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'
          }`
        }
      >
        <span className="relative flex-shrink-0">
          <Icon size={16} />
          {badge != null && badge > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="flex-1 flex items-center justify-between truncate">
            <span className="truncate">{label}</span>
            {badge != null && badge > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[9px] font-bold leading-none">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </span>
        )}
      </NavLink>

      {/* Star button — visible on hover (desktop only, non-collapsed) */}
      {!collapsed && onToggleFav && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFav(to);
          }}
          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-md transition-all duration-100 ${
            isFav
              ? 'text-amber-400 opacity-100'
              : 'text-slate-600 opacity-0 group-hover/nav:opacity-100 hover:text-amber-400'
          }`}
        >
          <Star size={11} fill={isFav ? 'currentColor' : 'none'} />
        </button>
      )}

      {collapsed && <Tip label={label} />}
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const alertas = useAlertas();
  const criticosCount = alertas.filter((a) => a.severidade === 'critico').length;
  const favoritas = useStore((s) => s.paginasFavoritas);
  const toggleFavorito = useStore((s) => s.toggleFavorito);
  const { isModuleEnabled, isLoading: tenantLoading } = useTenant();

  // Collapsible groups — persisted in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('sb-groups') ?? '{}');
    } catch {
      return {};
    }
  });
  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem('sb-groups', JSON.stringify(next));
      return next;
    });
  };

  // Build flat list of all nav items for favorites lookup
  const allItems = useMemo(() => SIDEBAR_GROUPS.flatMap((g) => g.items), []);

  const favItems = useMemo(
    () =>
      favoritas
        .map((to) => allItems.find((item) => item.to === to))
        .filter((item): item is (typeof allItems)[0] => item !== undefined)
        .map((item) => ({
          ...item,
          badge: undefined as number | undefined,
        })),
    [favoritas, allItems]
  );

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2">
      {/* Favorites section */}
      {!collapsed && favItems.length > 0 && (
        <div className="mb-1">
          <p className="px-3 pt-0.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none flex items-center gap-1.5">
            <Star size={9} fill="currentColor" className="text-amber-400" /> Favoritos
          </p>
          <div className="space-y-0.5">
            {favItems.map((item) => (
              <NavItem
                key={`fav-${item.to}`}
                item={item}
                collapsed={collapsed}
                isFav={true}
                onNavigate={onNavigate}
                onToggleFav={toggleFavorito}
              />
            ))}
          </div>
          <div className="w-full h-px bg-white/[0.06] my-2" />
        </div>
      )}

      {SIDEBAR_GROUPS.map((group, gi) => {
        // In icon-only mode (collapsed) groups are never collapsed
        const isGroupCollapsed = !collapsed && !!group.label && !!collapsedGroups[group.label];
        return (
          <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
            {group.label && !collapsed ? (
              <button
                onClick={() => toggleGroup(group.label!)}
                className="w-full flex items-center justify-between px-3 pt-0.5 pb-1 group/grp"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 select-none">
                  {group.label}
                </span>
                <ChevronDown
                  size={10}
                  className={`text-slate-600 group-hover/grp:text-slate-400 transition-all duration-200 ${isGroupCollapsed ? '-rotate-90' : ''}`}
                />
              </button>
            ) : null}
            {gi > 0 && collapsed && <div className="w-5 h-px bg-white/[0.08] mx-auto mb-2" />}
            {!isGroupCollapsed && (
              <div className="space-y-0.5">
                {group.items
                  .filter((item) => tenantLoading || !item.module || isModuleEnabled(item.module))
                  .map((item) => {
                    const resolved: ResolvedNavItem =
                      item.badge === 'alertas'
                        ? { ...item, badge: criticosCount || undefined }
                        : { ...item, badge: undefined };
                    return (
                      <NavItem
                        key={item.to}
                        item={resolved}
                        collapsed={collapsed}
                        isFav={favoritas.includes(item.to)}
                        onNavigate={onNavigate}
                        onToggleFav={toggleFavorito}
                      />
                    );
                  })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function SidebarFooter({
  collapsed,
  email,
  darkMode,
  syncState,
  onToggleDark,
  onShowShortcuts,
  onSignOut,
}: {
  collapsed: boolean;
  email: string;
  darkMode: boolean;
  syncState: SyncState;
  onToggleDark: () => void;
  onShowShortcuts: () => void;
  onSignOut: () => void;
}) {
  const initials = getInitials(email);
  const username = email.split('@')[0];
  const { isAdmin } = useAdmin();

  if (collapsed) {
    return (
      <div className="border-t border-white/[0.06] py-3 flex flex-col items-center gap-2">
        {isAdmin && (
          <div className="relative group">
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center justify-center w-10 h-9 rounded-lg transition-all duration-150 ${isActive ? 'text-amber-300 bg-amber-400/10' : 'text-amber-500/60 hover:text-amber-300 hover:bg-amber-400/10'}`
              }
            >
              <Shield size={15} />
            </NavLink>
            <Tip label="Admin Panel" />
          </div>
        )}
        {syncState !== 'idle' && (
          <div className="flex items-center justify-center w-10 h-5">
            <SyncDot state={syncState} />
          </div>
        )}
        <div className="relative group">
          <button
            onClick={onToggleDark}
            className="flex items-center justify-center w-10 h-9 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] transition-all duration-150"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <Tip label={darkMode ? 'Modo claro' : 'Modo escuro'} />
        </div>
        <div className="relative group">
          <NavLink
            to="/configs"
            className={({ isActive }) =>
              `flex items-center justify-center w-10 h-9 rounded-lg transition-all duration-150 ${isActive ? 'text-slate-100 bg-white/[0.06]' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.06]'}`
            }
          >
            <Settings size={15} />
          </NavLink>
          <Tip label="Configurações" />
        </div>
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
    <div className="border-t border-white/[0.06] px-3 py-3 space-y-1.5">
      {isAdmin && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 h-8 rounded-lg text-xs font-semibold transition-all duration-150 ${
              isActive
                ? 'bg-amber-400/10 text-amber-300'
                : 'text-amber-500/70 hover:text-amber-300 hover:bg-amber-400/10'
            }`
          }
        >
          <Shield size={13} />
          Admin Panel
        </NavLink>
      )}
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
        <div className="w-7 h-7 rounded-lg bg-white/[0.1] flex items-center justify-center flex-shrink-0 font-medium text-[11px] text-slate-300 ring-1 ring-white/[0.08]">
          {initials}
        </div>
        <p className="text-slate-300 text-xs truncate flex-1 leading-tight">{username}</p>
        <SyncDot state={syncState} />
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Modo claro' : 'Modo escuro'}
            className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:text-slate-200 hover:bg-white/[0.08] transition-all duration-150"
          >
            {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <NavLink
            to="/configs"
            title="Configurações"
            className={({ isActive }) =>
              `w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 ${isActive ? 'text-slate-200 bg-white/[0.08]' : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.08]'}`
            }
          >
            <Settings size={13} />
          </NavLink>
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
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const { user, signOut } = useAuth();
  const darkMode = useStore((s) => s.darkMode);
  const isHydrated = useStore((s) => s.isHydrated);
  const userId = useStore((s) => s.userId);
  const produtos = useStore((s) => s.produtos);
  const lojaFiltro = useStore((s) => s.lojaFiltro);
  const setLojaFiltro = useStore((s) => s.setLojaFiltro);
  const toggleDark = () => useStore.getState().toggleDarkMode();

  useRealtime(userId);

  const lojasDisponiveis = useMemo(
    () => [...new Set(produtos.map((p) => p.loja).filter((l) => l !== 'Ambas'))].sort(),
    [produtos]
  );

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('sb-collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>('idle');

  useEffect(() => {
    setSyncStateListener(setSyncState);
    return () => setSyncStateListener(null);
  }, []);

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
      d: '/',
      v: '/vendas',
      e: '/estoque',
      f: '/financeiro',
      k: '/kanban',
      c: '/calculadora',
    };
    const h = (ev: KeyboardEvent) => {
      const tag = (ev.target as HTMLElement).tagName;
      const inInput =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        (ev.target as HTMLElement).isContentEditable;
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'b') {
        ev.preventDefault();
        toggle();
        return;
      }
      if ((ev.metaKey || ev.ctrlKey) && ev.key === 'k') {
        ev.preventDefault();
        setShowPalette((v) => !v);
        return;
      }
      if (ev.key === '?' && !inInput) {
        setShowShortcuts((v) => !v);
        return;
      }
      if (ev.key === 'Escape') {
        setShowPalette(false);
        setShowShortcuts(false);
        setMobileOpen(false);
        return;
      }
      if (inInput) return;
      const path = NAV_KEYS[ev.key.toLowerCase()];
      if (path) window.location.href = path;
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    const h = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  if (!isHydrated) return <LayoutSkeleton />;

  const email = user?.email ?? '';

  return (
    <ToastProvider>
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}
        {showPalette && <CommandPalette onClose={() => setShowPalette(false)} />}

        {/* Mobile backdrop */}
        {mobileOpen && (
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-core-black flex flex-col transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 h-[60px] border-b border-white/[0.06] flex-shrink-0">
            <div className="w-7 h-7 rounded-full border border-white/40 flex items-center justify-center flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-light tracking-[0.28em] text-[13px] select-none">
                CORE
              </p>
              <p className="text-slate-500 text-[11px] truncate mt-0.5">{email}</p>
            </div>
          </div>

          <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />

          <SidebarFooter
            collapsed={false}
            email={email}
            darkMode={darkMode}
            syncState={syncState}
            onToggleDark={toggleDark}
            onShowShortcuts={() => setShowShortcuts(true)}
            onSignOut={signOut}
          />
        </aside>

        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex flex-col flex-shrink-0 bg-core-black relative transition-all duration-300 ease-in-out overflow-hidden ${collapsed ? 'w-[64px]' : 'w-[260px]'}`}
        >
          {/* Header */}
          {collapsed ? (
            <button
              onClick={toggle}
              title="Expandir sidebar (⌘B)"
              className="flex items-center justify-center h-[60px] border-b border-white/[0.06] flex-shrink-0 w-full hover:bg-white/[0.04] transition-colors group"
            >
              <div className="w-7 h-7 rounded-full border border-white/30 group-hover:border-white/60 transition-colors duration-150" />
            </button>
          ) : (
            <div className="flex items-center gap-3 px-4 h-[60px] border-b border-white/[0.06] flex-shrink-0">
              <div className="w-7 h-7 rounded-full border border-white/40 flex-shrink-0" />
              <div className="min-w-0 overflow-hidden flex-1">
                <p className="text-white font-light tracking-[0.28em] text-[13px] whitespace-nowrap select-none">
                  CORE
                </p>
                <p className="text-slate-500 text-[11px] whitespace-nowrap truncate mt-0.5">
                  Business OS
                </p>
              </div>
              <button
                onClick={toggle}
                title="Recolher sidebar (⌘B)"
                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-200 hover:bg-white/[0.06] transition-all duration-150 flex-shrink-0"
              >
                <ChevronsLeft size={15} />
              </button>
            </div>
          )}

          {/* Fake search — principal mecanismo de descoberta do ⌘K */}
          {collapsed ? (
            <button
              onClick={() => setShowPalette(true)}
              title="Busca global (⌘K)"
              className="mx-auto my-2 flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] transition-colors"
            >
              <Search size={15} />
            </button>
          ) : (
            <button
              onClick={() => setShowPalette(true)}
              className="mx-3 my-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] transition-colors group text-left"
            >
              <Search
                size={13}
                className="text-slate-500 group-hover:text-slate-300 flex-shrink-0 transition-colors"
              />
              <span className="flex-1 text-[12px] text-slate-500 group-hover:text-slate-300 transition-colors">
                Buscar…
              </span>
              <kbd className="text-[10px] px-1.5 py-0.5 border border-white/10 rounded text-slate-600 group-hover:text-slate-400 transition-colors">
                ⌘K
              </kbd>
            </button>
          )}

          <SidebarNav collapsed={collapsed} />

          <SidebarFooter
            collapsed={collapsed}
            email={email}
            darkMode={darkMode}
            syncState={syncState}
            onToggleDark={toggleDark}
            onShowShortcuts={() => setShowShortcuts(true)}
            onSignOut={signOut}
          />
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
            <div className="flex items-center gap-2.5 flex-1">
              <div className="w-6 h-6 rounded-full border border-slate-300 dark:border-slate-600 flex-shrink-0" />
              <span className="text-slate-800 dark:text-slate-100 font-light tracking-[0.25em] text-[13px] select-none">
                CORE
              </span>
            </div>
            <button
              onClick={() => setShowPalette(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-core-green/50 hover:text-core-green transition-colors"
            >
              <Search size={13} />
              <span className="hidden xs:inline">Buscar</span>
              <kbd className="hidden sm:inline text-[10px] px-1 border border-slate-200 dark:border-slate-700 rounded">
                ⌘K
              </kbd>
            </button>
            <button
              onClick={toggleDark}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
            >
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
                      ? 'bg-core-green text-white'
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
      <LimitHandler />
    </ToastProvider>
  );
}
