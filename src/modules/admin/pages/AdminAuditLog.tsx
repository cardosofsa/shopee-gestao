import { Download, Filter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { supabase } from '../../../lib/supabase';

interface AuditRow {
  id: string;
  admin_id: string | null;
  action: string;
  target_user: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  update_modules: 'text-blue-400 bg-blue-400/10',
  update_plan: 'text-purple-400 bg-purple-400/10',
  disable_tenant: 'text-red-400 bg-red-400/10',
  enable_tenant: 'text-emerald-400 bg-emerald-400/10',
};

export default function AdminAuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data as AuditRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const actions = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.action)));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterAction && r.action !== filterAction) return false;
      if (filterUser && !r.target_user?.toLowerCase().includes(filterUser.toLowerCase()))
        return false;
      return true;
    });
  }, [rows, filterAction, filterUser]);

  function exportCSV() {
    const header = 'id,action,admin_id,target_user,payload,created_at\n';
    const body = filtered
      .map(
        (r) =>
          `${r.id},${r.action},${r.admin_id ?? ''},${r.target_user ?? ''},${JSON.stringify(r.payload)},${r.created_at}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Auditoria</h1>
          <p className="text-slate-500 text-sm mt-0.5">{filtered.length} registros</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`h-9 px-3 flex items-center gap-1.5 rounded-lg border text-xs font-medium transition-colors ${
              showFilters
                ? 'bg-core-green/10 border-core-green/30 text-core-green'
                : 'bg-slate-900 border-white/[0.06] text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter size={13} /> Filtros
          </button>
          <button
            onClick={exportCSV}
            disabled={filtered.length === 0}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-slate-900 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
          >
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-4 flex flex-wrap gap-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Ação
            </label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">Todas</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
              Usuário alvo
            </label>
            <input
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              placeholder="email ou user_id…"
              className="h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-200 focus:outline-none w-52 placeholder-slate-600"
            />
          </div>
        </div>
      )}

      {/* Log table */}
      <div className="bg-slate-900 border border-white/[0.06] rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Nenhum registro encontrado
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[180px_1fr_1fr_2fr_140px] border-b border-white/[0.06]">
              {['Data', 'Ação', 'Admin', 'Alvo / Payload', ''].map((h) => (
                <div
                  key={h}
                  className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </div>
              ))}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {filtered.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-[180px_1fr_1fr_2fr_140px] hover:bg-white/[0.02] transition-colors"
                >
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(row.created_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        ACTION_COLORS[row.action] ?? 'text-slate-400 bg-slate-800'
                      }`}
                    >
                      {row.action}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center min-w-0">
                    <span className="text-xs text-slate-500 truncate">{row.admin_id ?? '—'}</span>
                  </div>
                  <div className="px-4 py-3 flex items-start flex-col gap-0.5 min-w-0">
                    <span className="text-xs text-slate-300 truncate w-full">
                      {row.target_user ?? '—'}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono truncate w-full">
                      {JSON.stringify(row.payload)}
                    </span>
                  </div>
                  <div className="px-4 py-3 flex items-center">
                    <span className="text-[10px] font-mono text-slate-700 truncate">
                      {row.id.slice(0, 8)}…
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
