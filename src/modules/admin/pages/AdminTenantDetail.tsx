import { ArrowLeft, Check, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ModuleKey } from '../../../config/modules';
import { MODULE_CATALOG, MODULE_GROUPS } from '../../../config/modules';
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
  active_modules: number;
}

interface AuditRow {
  id: string;
  action: string;
  target_user: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  ecommerce: 'E-commerce',
  varejo: 'Varejo',
  atacado: 'Atacado',
  servicos: 'Serviços',
  industria: 'Indústria',
};

const TABS = ['Perfil', 'Módulos', 'Auditoria'] as const;
type Tab = (typeof TABS)[number];

function ModuleToggle({
  moduleKey,
  enabled,
  onChange,
}: {
  moduleKey: ModuleKey;
  enabled: boolean;
  onChange: (key: ModuleKey, val: boolean) => void;
}) {
  const mod = MODULE_CATALOG.find((m) => m.key === moduleKey);
  if (!mod) return null;
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">{mod.icon ?? '📦'}</span>
        <span className="text-xs text-slate-300 truncate">{mod.label}</span>
      </div>
      <button
        onClick={() => onChange(moduleKey, !enabled)}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          enabled ? 'bg-core-green' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export default function AdminTenantDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('Perfil');
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [enabledModules, setEnabledModules] = useState<Set<ModuleKey>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<ModuleKey, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.from('admin_tenants_view').select('*').eq('user_id', userId).single(),
      supabase.from('tenant_modules').select('module_key, enabled').eq('user_id', userId),
      supabase
        .from('admin_audit_log')
        .select('*')
        .eq('target_user', userId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]).then(([{ data: t }, { data: mods }, { data: a }]) => {
      setTenant(t as TenantRow);
      const enabled = new Set<ModuleKey>(
        ((mods ?? []) as { module_key: ModuleKey; enabled: boolean }[])
          .filter((m) => m.enabled)
          .map((m) => m.module_key)
      );
      setEnabledModules(enabled);
      setAudit((a as AuditRow[]) ?? []);
      setLoading(false);
    });
  }, [userId]);

  function handleModuleChange(key: ModuleKey, val: boolean) {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      const original = enabledModules.has(key);
      if (val === original) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
      return next;
    });
  }

  function getEffectiveEnabled(key: ModuleKey): boolean {
    if (pendingChanges.has(key)) return pendingChanges.get(key)!;
    return enabledModules.has(key);
  }

  async function saveModules() {
    if (!userId || pendingChanges.size === 0) return;
    setSaving(true);
    const ops = Array.from(pendingChanges.entries()).map(([key, enabled]) =>
      supabase
        .from('tenant_modules')
        .upsert({ user_id: userId, module_key: key, enabled }, { onConflict: 'user_id,module_key' })
    );
    await Promise.all(ops);

    // Audit log
    await supabase.from('admin_audit_log').insert({
      action: 'update_modules',
      target_user: userId,
      payload: Object.fromEntries(pendingChanges),
    });

    // Apply changes
    const next = new Set(enabledModules);
    pendingChanges.forEach((val, key) => {
      if (val) next.add(key);
      else next.delete(key);
    });
    setEnabledModules(next);
    setPendingChanges(new Map());
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) {
    return <div className="p-6 text-slate-400 text-sm">Assinante não encontrado.</div>;
  }

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/admin/tenants')}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-sm font-bold text-slate-300">
          {tenant.email[0].toUpperCase()}
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-100">{tenant.email}</h1>
          <p className="text-slate-500 text-xs">{tenant.business_name || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 h-9 text-xs font-medium transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'text-core-green border-core-green'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {tab === 'Perfil' && (
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-5 space-y-4">
          <Grid label="Email" value={tenant.email} />
          <Grid label="Empresa" value={tenant.business_name || '—'} />
          <Grid label="Segmento" value={SEGMENT_LABELS[tenant.segment] ?? tenant.segment ?? '—'} />
          <Grid label="Plano" value={tenant.plan_id ?? '—'} />
          <Grid label="Status" value={tenant.subscription_status ?? '—'} />
          <Grid
            label="Onboarding"
            value={
              tenant.onboarding_done ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check size={12} /> Concluído
                </span>
              ) : (
                <span className="text-amber-400">Pendente</span>
              )
            }
          />
          <Grid
            label="Registrado em"
            value={new Date(tenant.registered_at).toLocaleString('pt-BR')}
          />
          <Grid
            label="Último acesso"
            value={
              tenant.last_sign_in_at
                ? new Date(tenant.last_sign_in_at).toLocaleString('pt-BR')
                : '—'
            }
          />
          <Grid label="Módulos ativos" value={tenant.active_modules} />
        </div>
      )}

      {/* Módulos */}
      {tab === 'Módulos' && (
        <div className="space-y-3">
          {pendingChanges.size > 0 && (
            <div className="flex items-center justify-between bg-amber-400/5 border border-amber-400/20 rounded-xl px-4 py-2.5">
              <span className="text-xs text-amber-300">
                {pendingChanges.size} alteração{pendingChanges.size > 1 ? 'ões' : ''} pendente
                {pendingChanges.size > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPendingChanges(new Map())}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <X size={12} /> Descartar
                </button>
                <button
                  onClick={saveModules}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-core-green text-slate-950 text-xs font-semibold rounded-lg hover:bg-core-green-h transition-colors disabled:opacity-50"
                >
                  <Save size={12} />
                  {saving ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {Object.entries(MODULE_GROUPS).map(([group, mods]) => (
            <div key={group} className="bg-slate-900 border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-3">
                {group}
              </h3>
              <div className="space-y-0.5">
                {mods.map((mod) => (
                  <ModuleToggle
                    key={mod.key}
                    moduleKey={mod.key}
                    enabled={getEffectiveEnabled(mod.key)}
                    onChange={handleModuleChange}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auditoria */}
      {tab === 'Auditoria' && (
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl overflow-hidden">
          {audit.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-slate-500 text-sm">
              Nenhuma ação registrada
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {audit.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="text-[10px] font-mono bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                    {a.action}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-slate-400 font-mono break-all">
                      {JSON.stringify(a.payload)}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-600 flex-shrink-0 whitespace-nowrap">
                    {new Date(a.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Grid({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-center border-b border-white/[0.04] pb-4 last:border-0 last:pb-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className="text-sm text-slate-300">{value}</span>
    </div>
  );
}
