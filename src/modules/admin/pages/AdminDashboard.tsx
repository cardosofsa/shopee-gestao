import { Activity, DollarSign, TrendingDown, TrendingUp, Users, UserX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { MODULE_BY_KEY } from '../../../config/modules';
import { supabase } from '../../../lib/supabase';

interface ModuleUsageRow {
  module_key: string;
  usage_count: number;
}

interface AdminMetrics {
  mrr: number;
  churn_count: number;
  total_active: number;
  arpu: number;
}

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

interface AuditRow {
  id: string;
  action: string;
  target_user: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  ecommerce: '#10b981',
  varejo: '#3b82f6',
  atacado: '#f59e0b',
  servicos: '#8b5cf6',
  industria: '#ef4444',
};

const SEGMENT_LABELS: Record<string, string> = {
  ecommerce: 'E-commerce',
  varejo: 'Varejo',
  atacado: 'Atacado',
  servicos: 'Serviços',
  industria: 'Indústria',
};

function KPICard({
  label,
  value,
  icon: Icon,
  color = 'text-core-green',
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <Icon size={14} className={color} />
      </div>
      <p className="text-2xl font-bold text-slate-100">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsageRow[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: t }, { data: a }, { data: mu }, { data: m }] = await Promise.all([
        supabase.rpc('get_admin_tenants'),
        supabase
          .from('admin_audit_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase.rpc('get_module_usage'),
        supabase.rpc('get_admin_metrics'),
      ]);
      const rows = (t as TenantRow[]) ?? [];
      setTenants(rows);
      setAudit((a as AuditRow[]) ?? []);
      setModuleUsage((mu as ModuleUsageRow[]) ?? []);
      setMetrics(m as AdminMetrics | null);
      const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
      setActiveCount(rows.filter((r) => r.last_sign_in_at && r.last_sign_in_at > cutoff).length);
      setLoading(false);
    }
    load();
  }, []);

  const segmentData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tenants) counts[t.segment] = (counts[t.segment] ?? 0) + 1;
    return Object.entries(counts).map(([seg, count]) => ({
      name: SEGMENT_LABELS[seg] ?? seg,
      value: count,
      color: SEGMENT_COLORS[seg] ?? '#64748b',
    }));
  }, [tenants]);

  const planData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tenants) {
      const p = t.plan_id ?? 'sem_plano';
      counts[p] = (counts[p] ?? 0) + 1;
    }
    return Object.entries(counts).map(([plan, count]) => ({ plan, count }));
  }, [tenants]);

  const moduleRanking = useMemo(() => {
    const maxCount = moduleUsage[0]?.usage_count ?? 1;
    return moduleUsage.slice(0, 10).map((row) => ({
      key: row.module_key,
      label: MODULE_BY_KEY[row.module_key as keyof typeof MODULE_BY_KEY]?.label ?? row.module_key,
      count: row.usage_count,
      max: maxCount,
    }));
  }, [moduleUsage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Dashboard Admin</h1>
        <p className="text-slate-500 text-sm mt-0.5">Visão geral da plataforma CORE</p>
      </div>

      {/* KPIs — Assinantes */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard label="Total de Assinantes" value={tenants.length} icon={Users} />
        <KPICard
          label="Ativos (30 dias)"
          value={activeCount}
          icon={Activity}
          color="text-emerald-400"
        />
        <KPICard
          label="Onboarding Concluído"
          value={tenants.filter((t) => t.onboarding_done).length}
          icon={TrendingUp}
          color="text-blue-400"
        />
        <KPICard
          label="Sem Plano"
          value={tenants.filter((t) => !t.plan_id).length}
          icon={UserX}
          color="text-amber-400"
        />
      </div>

      {/* KPIs — Receita */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              MRR
            </span>
            <DollarSign size={14} className="text-core-green" />
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {metrics
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  metrics.mrr
                )
              : '—'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">Receita recorrente mensal</p>
        </div>
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Churn (30d)
            </span>
            <TrendingDown size={14} className="text-red-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">{metrics?.churn_count ?? '—'}</p>
          <p className="text-[11px] text-slate-600 mt-1">Cancelamentos no último mês</p>
        </div>
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              ARPU
            </span>
            <TrendingUp size={14} className="text-violet-400" />
          </div>
          <p className="text-2xl font-bold text-slate-100">
            {metrics
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  metrics.arpu
                )
              : '—'}
          </p>
          <p className="text-[11px] text-slate-600 mt-1">Receita média por assinante ativo</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Por segmento */}
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Assinantes por Segmento</h3>
          {segmentData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={segmentData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {segmentData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Por plano */}
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Assinantes por Plano</h3>
          {planData.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Nenhum dado</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={planData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="plan" tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Módulos mais usados */}
      <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Módulos mais utilizados</h3>
        <div className="space-y-2">
          {moduleRanking.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-4">Sem dados ainda</p>
          ) : (
            moduleRanking.map((m) => (
              <div key={m.key} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-28 flex-shrink-0 truncate">
                  {m.label}
                </span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-core-green rounded-full transition-all"
                    style={{ width: `${(m.count / m.max) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{m.count}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Últimos registros */}
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Últimos registros</h3>
          <div className="space-y-2">
            {tenants.slice(0, 8).map((t) => (
              <div key={t.user_id} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-slate-300">
                  {(t.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-300 truncate">{t.email}</p>
                  <p className="text-[10px] text-slate-600">
                    {t.plan_id ?? 'sem plano'} · {SEGMENT_LABELS[t.segment] ?? t.segment}
                  </p>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0">
                  {new Date(t.registered_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
              </div>
            ))}
            {tenants.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Nenhum assinante ainda</p>
            )}
          </div>
        </div>

        {/* Últimas ações admin */}
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">Últimas ações admin</h3>
          <div className="space-y-2">
            {audit.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                  {a.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-slate-500 truncate">{a.target_user ?? '—'}</p>
                </div>
                <span className="text-[10px] text-slate-600 flex-shrink-0">
                  {new Date(a.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
            {audit.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">Nenhuma ação registrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
