import { ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '../../../lib/supabase';

interface TenantRow {
  user_id: string;
  email: string;
  registered_at: string;
  last_sign_in_at: string | null;
  segment: string;
  business_name: string;
  onboarding_done: boolean;
  plan_id: string | null;
  subscription_status: string | null;
  pedidos_mes_atual: number;
  total_pedidos: number;
  total_skus: number;
  active_modules: number;
}

const SEGMENT_LABELS: Record<string, string> = {
  ecommerce: 'E-commerce',
  varejo: 'Varejo',
  atacado: 'Atacado',
  servicos: 'Serviços',
  industria: 'Indústria',
};

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  canceled: 'bg-red-500/10 text-red-400 border-red-500/20',
  trialing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  past_due: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const PAGE_SIZE = 25;

export default function AdminTenants() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterOnboarding, setFilterOnboarding] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.rpc('get_admin_tenants').then(({ data }) => {
      setTenants((data as TenantRow[]) ?? []);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return tenants.filter((t) => {
      if (q && !t.email?.toLowerCase().includes(q) && !t.business_name?.toLowerCase().includes(q))
        return false;
      if (filterSegment && t.segment !== filterSegment) return false;
      if (filterStatus && t.subscription_status !== filterStatus) return false;
      if (filterOnboarding === 'done' && !t.onboarding_done) return false;
      if (filterOnboarding === 'pending' && t.onboarding_done) return false;
      return true;
    });
  }, [tenants, search, filterSegment, filterStatus, filterOnboarding]);

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const hasFilters = filterSegment || filterStatus || filterOnboarding;

  function clearFilters() {
    setFilterSegment('');
    setFilterStatus('');
    setFilterOnboarding('');
    setSearch('');
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Assinantes</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} encontrados</p>
        </div>
      </div>

      {/* Search + filters bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Buscar por email ou empresa…"
            className="w-full h-9 bg-slate-900 border border-white/[0.06] rounded-lg pl-8 pr-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
            showFilters || hasFilters
              ? 'bg-core-green/10 border-core-green/30 text-core-green'
              : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal size={13} />
          Filtros
          {hasFilters && (
            <span className="w-4 h-4 bg-core-green text-slate-950 rounded-full text-[9px] font-bold flex items-center justify-center">
              {[filterSegment, filterStatus, filterOnboarding].filter(Boolean).length}
            </span>
          )}
        </button>
        {(hasFilters || search) && (
          <button
            onClick={clearFilters}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.06] text-xs text-slate-500 hover:text-red-400 transition-colors"
          >
            <X size={13} />
            Limpar
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-4 flex flex-wrap gap-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Segmento
            </label>
            <select
              value={filterSegment}
              onChange={(e) => {
                setFilterSegment(e.target.value);
                setPage(0);
              }}
              className="h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Todos</option>
              {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Status assinatura
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
              className="h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="active">Ativo</option>
              <option value="trialing">Trial</option>
              <option value="past_due">Atraso</option>
              <option value="canceled">Cancelado</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Onboarding
            </label>
            <select
              value={filterOnboarding}
              onChange={(e) => {
                setFilterOnboarding(e.target.value);
                setPage(0);
              }}
              className="h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Todos</option>
              <option value="done">Concluído</option>
              <option value="pending">Pendente</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div
        ref={tableRef}
        className="bg-slate-900 border border-white/[0.06] rounded-xl overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Nenhum assinante encontrado
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[1fr_140px_120px_100px_80px_44px] gap-0 border-b border-white/[0.06]">
              {['Usuário', 'Segmento', 'Plano', 'Módulos', 'Status', ''].map((h) => (
                <div
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/[0.04]">
              {paginated.map((t) => (
                <div
                  key={t.user_id}
                  onClick={() => navigate(`/admin/tenants/${t.user_id}`)}
                  className="grid grid-cols-[1fr_140px_120px_100px_80px_44px] gap-0 hover:bg-white/[0.03] cursor-pointer transition-colors"
                >
                  <div className="px-4 py-3 flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-slate-300">
                      {(t.email ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-200 truncate">{t.email}</p>
                      <p className="text-[10px] text-slate-600 truncate">
                        {t.business_name || '—'}
                        {t.onboarding_done ? '' : ' · onboarding pendente'}
                      </p>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-xs text-slate-400">
                      {SEGMENT_LABELS[t.segment] ?? t.segment ?? '—'}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-xs text-slate-400">{t.plan_id ?? '—'}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-xs text-slate-400">{t.active_modules ?? 0}</span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    {t.subscription_status ? (
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          STATUS_BADGE[t.subscription_status] ??
                          'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {t.subscription_status}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-600">—</span>
                    )}
                  </div>
                  <div className="px-2 py-3 flex items-center justify-center">
                    <ChevronRight size={13} className="text-slate-600" />
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-white/[0.06] px-4 py-3 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{' '}
                  {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white/[0.05] transition-colors"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-white/[0.05] transition-colors"
                  >
                    Próximo
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
