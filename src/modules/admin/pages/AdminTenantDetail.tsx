import { ArrowLeft, Check, Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { ModuleKey } from '../../../config/modules';
import { MODULE_CATALOG, MODULE_GROUPS } from '../../../config/modules';
import type { SegmentKey } from '../../../config/segments';
import { SEGMENTS } from '../../../config/segments';
import { useAuth } from '../../../contexts/AuthContext';
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

interface PlanOption {
  id: string;
  nome: string;
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
  const isCore = mod.isCore;
  return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg hover:bg-white/[0.03] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm">{mod.icon ?? '📦'}</span>
        <span className="text-xs text-slate-300 truncate">{mod.label}</span>
        {isCore && (
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-800 px-1 py-0.5 rounded">
            core
          </span>
        )}
      </div>
      <button
        onClick={() => !isCore && onChange(moduleKey, !enabled)}
        disabled={isCore}
        title={isCore ? 'Módulo obrigatório — não pode ser desativado' : undefined}
        className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
          isCore ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
        } ${enabled ? 'bg-core-green' : 'bg-slate-700'}`}
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
  const { user: adminUser } = useAuth();
  const [tab, setTab] = useState<Tab>('Perfil');
  const [tenant, setTenant] = useState<TenantRow | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [enabledModules, setEnabledModules] = useState<Set<ModuleKey>>(new Set());
  const [pendingChanges, setPendingChanges] = useState<Map<ModuleKey, boolean>>(new Map());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Profile editing state (GAP-02)
  const [profileDraft, setProfileDraft] = useState<{
    segment: string;
    plan_id: string | null;
  } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [plans, setPlans] = useState<PlanOption[]>([]);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      supabase.rpc('get_admin_tenant', { p_user_id: userId }),
      supabase.from('tenant_modules').select('module_key, enabled').eq('user_id', userId),
      supabase
        .from('admin_audit_log')
        .select('*')
        .eq('target_user', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('plans').select('id, nome').order('price_brl', { ascending: true }),
    ]).then(([{ data: tenantData }, { data: mods }, { data: a }, { data: p }]) => {
      const t = (tenantData as TenantRow[])?.[0] ?? null;
      setTenant(t);
      const enabled = new Set<ModuleKey>(
        ((mods ?? []) as { module_key: ModuleKey; enabled: boolean }[])
          .filter((m) => m.enabled)
          .map((m) => m.module_key)
      );
      setEnabledModules(enabled);
      setAudit((a as AuditRow[]) ?? []);
      setPlans((p as PlanOption[]) ?? []);
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
    if (!userId || pendingChanges.size === 0 || !adminUser) return;
    setSaving(true);
    const now = new Date().toISOString();
    const ops = Array.from(pendingChanges.entries()).map(([key, enabled]) =>
      supabase.from('tenant_modules').upsert(
        {
          user_id: userId,
          module_key: key,
          enabled,
          updated_by: adminUser.id,
          updated_at: now,
        },
        { onConflict: 'user_id,module_key' }
      )
    );
    await Promise.all(ops);

    await supabase.from('admin_audit_log').insert({
      admin_id: adminUser.id,
      action: 'update_modules',
      target_user: userId,
      payload: Object.fromEntries(pendingChanges),
    });

    const next = new Set(enabledModules);
    pendingChanges.forEach((val, key) => {
      if (val) next.add(key);
      else next.delete(key);
    });
    setEnabledModules(next);
    setPendingChanges(new Map());
    setSaving(false);
  }

  // GAP-02: save profile changes (segment + plan)
  async function saveProfile() {
    if (!userId || !tenant || !profileDraft || !adminUser) return;
    setProfileSaving(true);

    if (profileDraft.segment !== tenant.segment) {
      await supabase
        .from('tenant_profiles')
        .update({ segment: profileDraft.segment })
        .eq('user_id', userId);
    }

    if (profileDraft.plan_id !== tenant.plan_id) {
      await supabase
        .from('subscriptions')
        .upsert({ user_id: userId, plan_id: profileDraft.plan_id }, { onConflict: 'user_id' });
    }

    await supabase.from('admin_audit_log').insert({
      admin_id: adminUser.id,
      action: 'update_profile',
      target_user: userId,
      payload: {
        old: { segment: tenant.segment, plan_id: tenant.plan_id },
        new: profileDraft,
      },
    });

    setTenant((t) => (t ? { ...t, ...profileDraft } : t));
    setProfileDraft(null);
    setProfileSaving(false);
  }

  async function applySegmentDefaults() {
    if (!userId || !profileDraft || !adminUser) return;
    const seg = profileDraft.segment as SegmentKey;
    const defaults = SEGMENTS[seg]?.modulosPadrao ?? SEGMENTS.ecommerce.modulosPadrao;
    const now = new Date().toISOString();
    const rows = [...defaults].map((key) => ({
      user_id: userId,
      module_key: key,
      enabled: true,
      updated_by: adminUser.id,
      updated_at: now,
    }));
    await supabase.from('tenant_modules').upsert(rows, { onConflict: 'user_id,module_key' });
    await supabase.from('admin_audit_log').insert({
      admin_id: adminUser.id,
      action: 'apply_segment_defaults',
      target_user: userId,
      payload: { segment: seg, defaults },
    });
    const next = new Set<ModuleKey>([...defaults]);
    setEnabledModules(next);
    setPendingChanges(new Map());
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

  const editingProfile = profileDraft !== null;

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
          {/* Edit / Save toolbar */}
          <div className="flex items-center justify-end gap-2 pb-2 border-b border-white/[0.04]">
            {editingProfile ? (
              <>
                <button
                  onClick={() => setProfileDraft(null)}
                  className="h-7 px-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.05] transition-colors"
                >
                  <X size={11} /> Cancelar
                </button>
                <button
                  onClick={saveProfile}
                  disabled={profileSaving}
                  className="h-7 px-3 flex items-center gap-1.5 text-xs bg-core-green text-slate-950 font-semibold rounded-lg hover:bg-core-green-h transition-colors disabled:opacity-50"
                >
                  <Save size={11} />
                  {profileSaving ? 'Salvando…' : 'Salvar'}
                </button>
              </>
            ) : (
              <button
                onClick={() =>
                  setProfileDraft({ segment: tenant.segment, plan_id: tenant.plan_id })
                }
                className="h-7 px-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <Edit2 size={11} /> Editar
              </button>
            )}
          </div>

          <Grid label="Email" value={tenant.email} />
          <Grid label="Empresa" value={tenant.business_name || '—'} />

          <Grid
            label="Segmento"
            value={
              editingProfile ? (
                <select
                  value={profileDraft.segment}
                  onChange={(e) => setProfileDraft((d) => d && { ...d, segment: e.target.value })}
                  className="h-8 bg-slate-800 border border-white/[0.08] rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-core-green/40"
                >
                  {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                (SEGMENT_LABELS[tenant.segment] ?? tenant.segment ?? '—')
              )
            }
          />

          <Grid
            label="Plano"
            value={
              editingProfile ? (
                <select
                  value={profileDraft.plan_id ?? ''}
                  onChange={(e) =>
                    setProfileDraft((d) => d && { ...d, plan_id: e.target.value || null })
                  }
                  className="h-8 bg-slate-800 border border-white/[0.08] rounded-lg px-2 text-xs text-slate-200 focus:outline-none focus:border-core-green/40"
                >
                  <option value="">— sem plano —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              ) : (
                (tenant.plan_id ?? '—')
              )
            }
          />

          {editingProfile && (
            <div className="pt-1">
              <button
                onClick={applySegmentDefaults}
                className="h-7 px-3 text-xs text-amber-400 hover:text-amber-300 border border-amber-400/20 hover:border-amber-400/40 rounded-lg transition-colors"
              >
                Aplicar módulos padrão do segmento
              </button>
              <p className="text-[10px] text-slate-600 mt-1 ml-1">
                Substitui os módulos ativos pelos padrões de{' '}
                {SEGMENT_LABELS[profileDraft.segment] ?? profileDraft.segment}.
              </p>
            </div>
          )}

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
