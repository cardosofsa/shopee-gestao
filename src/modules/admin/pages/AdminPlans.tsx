import { Check, Edit2, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ModuleKey } from '../../../config/modules';
import { MODULE_CATALOG } from '../../../config/modules';
import { supabase } from '../../../lib/supabase';

interface Plan {
  id: string;
  nome: string;
  price_brl: number | null;
  price_per_module: number | null;
  modules_included: string[] | null;
  active: boolean;
  is_custom: boolean;
}

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('plans')
      .select('id, nome, price_brl, price_per_module, modules_included, active, is_custom')
      .order('price_brl', { ascending: true })
      .then(({ data }) => {
        setPlans((data as Plan[]) ?? []);
        setLoading(false);
      });
  }, []);

  function startEdit(plan: Plan) {
    setEditing(plan.id);
    setDraft({ ...plan });
  }

  function cancelEdit() {
    setEditing(null);
    setDraft({});
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('plans')
      .update({
        nome: draft.nome,
        price_brl: draft.price_brl,
        price_per_module: draft.price_per_module,
        modules_included: draft.modules_included,
        active: draft.active,
      })
      .eq('id', editing);

    if (!error) {
      setPlans((prev) => prev.map((p) => (p.id === editing ? ({ ...p, ...draft } as Plan) : p)));
      setEditing(null);
      setDraft({});
    }
    setSaving(false);
  }

  function toggleModule(key: ModuleKey) {
    const current = draft.modules_included ?? [];
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    setDraft((d) => ({ ...d, modules_included: next }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Planos</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Gerencie os planos disponíveis na plataforma
        </p>
      </div>

      {plans.length === 0 && (
        <div className="bg-slate-900 border border-white/[0.06] rounded-xl flex items-center justify-center h-32 text-slate-500 text-sm">
          Nenhum plano cadastrado. Execute a migration v13 no Supabase.
        </div>
      )}

      <div className="space-y-3">
        {plans.map((plan) => {
          const isEditing = editing === plan.id;
          const d = isEditing ? draft : plan;

          return (
            <div
              key={plan.id}
              className="bg-slate-900 border border-white/[0.06] rounded-xl p-5 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      value={d.nome ?? ''}
                      onChange={(e) => setDraft((prev) => ({ ...prev, nome: e.target.value }))}
                      className="w-full h-9 bg-slate-800 border border-white/[0.06] rounded-lg px-3 text-sm text-slate-100 focus:outline-none focus:border-core-green/40 font-semibold"
                    />
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-100">{plan.nome}</h3>
                      {plan.is_custom && (
                        <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 px-1.5 py-0.5 rounded font-semibold">
                          Personalizável
                        </span>
                      )}
                      {!plan.active && (
                        <span className="text-[10px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-white/[0.06]">
                          Inativo
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        onClick={cancelEdit}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        <X size={13} /> Cancelar
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={saving}
                        className="h-8 px-3 flex items-center gap-1.5 text-xs bg-core-green text-slate-950 font-semibold rounded-lg hover:bg-core-green-h transition-colors disabled:opacity-50"
                      >
                        <Save size={13} />
                        {saving ? 'Salvando…' : 'Salvar'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => startEdit(plan)}
                      className="h-8 px-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/[0.05] transition-colors"
                    >
                      <Edit2 size={13} /> Editar
                    </button>
                  )}
                </div>
              </div>

              {/* Price + active */}
              <div className="flex items-center gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                    Preço base (R$)
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={d.price_brl ?? ''}
                      onChange={(e) =>
                        setDraft((prev) => ({ ...prev, price_brl: parseFloat(e.target.value) }))
                      }
                      className="w-24 h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-100 focus:outline-none focus:border-core-green/40"
                    />
                  ) : (
                    <span className="text-sm font-bold text-slate-200">
                      {plan.price_brl != null
                        ? new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(plan.price_brl)
                        : '—'}
                    </span>
                  )}
                </div>

                {(plan.is_custom || isEditing) && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Por módulo (R$)
                    </span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={d.price_per_module ?? ''}
                        onChange={(e) =>
                          setDraft((prev) => ({
                            ...prev,
                            price_per_module: parseFloat(e.target.value),
                          }))
                        }
                        className="w-24 h-8 bg-slate-800 border border-white/[0.06] rounded-lg px-2 text-xs text-slate-100 focus:outline-none focus:border-core-green/40"
                      />
                    ) : (
                      <span className="text-sm font-bold text-violet-400">
                        {plan.price_per_module != null && plan.price_per_module > 0
                          ? `+ ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price_per_module)}/módulo`
                          : '—'}
                      </span>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-1">
                      Ativo
                    </span>
                    <button
                      onClick={() => setDraft((prev) => ({ ...prev, active: !prev.active }))}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        d.active ? 'bg-core-green' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          d.active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Modules */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                  Módulos incluídos ({(d.modules_included ?? []).length})
                </span>
                {isEditing ? (
                  <div className="grid grid-cols-3 gap-1">
                    {MODULE_CATALOG.map((mod) => {
                      const included = (d.modules_included ?? []).includes(mod.key);
                      return (
                        <button
                          key={mod.key}
                          onClick={() => toggleModule(mod.key)}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-colors ${
                            included
                              ? 'bg-core-green/10 text-slate-200 border border-core-green/20'
                              : 'bg-slate-800 text-slate-500 border border-transparent hover:border-white/[0.06]'
                          }`}
                        >
                          {included && (
                            <Check size={10} className="text-core-green flex-shrink-0" />
                          )}
                          <span className="truncate">{mod.label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {(plan.modules_included ?? []).slice(0, 8).map((key) => {
                      const mod = MODULE_CATALOG.find((m) => m.key === key);
                      return (
                        <span
                          key={key}
                          className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-white/[0.06]"
                        >
                          {mod?.label ?? key}
                        </span>
                      );
                    })}
                    {(plan.modules_included ?? []).length > 8 && (
                      <span className="text-[10px] text-slate-600">
                        +{(plan.modules_included ?? []).length - 8} mais
                      </span>
                    )}
                    {(plan.modules_included ?? []).length === 0 && (
                      <span className="text-xs text-slate-600">Nenhum módulo configurado</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
