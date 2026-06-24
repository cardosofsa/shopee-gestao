import { ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

import type { ModuleKey } from '../config/modules';
import { MODULE_CATALOG } from '../config/modules';
import type { SegmentKey } from '../config/segments';
import { SEGMENTS } from '../config/segments';
import { supabase } from '../lib/supabase';

const STEPS = ['Segmento', 'Empresa', 'Módulos', 'Pronto'] as const;
type Step = 0 | 1 | 2 | 3;

interface Props {
  userId: string;
  onComplete: () => void;
}

export function OnboardingWizard({ userId, onComplete }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [segment, setSegment] = useState<SegmentKey>('ecommerce');
  const [businessName, setBusinessName] = useState('');
  const [modules, setModules] = useState<Set<ModuleKey>>(
    new Set<ModuleKey>([...SEGMENTS.ecommerce.modulosPadrao])
  );
  const [saving, setSaving] = useState(false);

  function handleSegmentSelect(seg: SegmentKey) {
    setSegment(seg);
    setModules(new Set<ModuleKey>([...SEGMENTS[seg].modulosPadrao]));
  }

  function toggleModule(key: ModuleKey) {
    setModules((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function finish() {
    setSaving(true);
    await supabase.from('tenant_profiles').upsert({
      user_id: userId,
      segment,
      business_name: businessName.trim() || null,
      onboarding_done: true,
    });

    const moduleRows = Array.from(modules).map((key) => ({
      user_id: userId,
      module_key: key,
      enabled: true,
    }));
    if (moduleRows.length > 0) {
      await supabase
        .from('tenant_modules')
        .upsert(moduleRows, { onConflict: 'user_id,module_key' });
    }

    setSaving(false);
    setStep(3);
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-50 flex flex-col items-center justify-center p-4">
      {/* Progress */}
      <div className="w-full max-w-md mb-8">
        <div className="flex items-center gap-2 justify-center">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step
                    ? 'bg-core-green text-slate-950'
                    : i === step
                      ? 'bg-slate-700 text-slate-100 ring-2 ring-core-green'
                      : 'bg-slate-800 text-slate-500'
                }`}
              >
                {i < step ? <Check size={12} /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  i === step ? 'text-slate-200' : 'text-slate-600'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${i < step ? 'bg-core-green' : 'bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-md">
        {/* Step 0 — Segmento */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Qual é o seu negócio?</h2>
              <p className="text-slate-500 text-sm">
                Isso configura o vocabulário e os módulos padrão do sistema.
              </p>
            </div>
            <div className="space-y-2">
              {(Object.entries(SEGMENTS) as [SegmentKey, (typeof SEGMENTS)[SegmentKey]][]).map(
                ([key, seg]) => (
                  <button
                    key={key}
                    onClick={() => handleSegmentSelect(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                      segment === key
                        ? 'bg-core-green/10 border-core-green/40 text-slate-100'
                        : 'bg-slate-900 border-white/[0.06] text-slate-300 hover:border-white/[0.12]'
                    }`}
                  >
                    <span className="text-2xl">{seg.icon}</span>
                    <div>
                      <p className="text-sm font-semibold">{seg.label}</p>
                      <p className="text-xs text-slate-500">{seg.description}</p>
                    </div>
                    {segment === key && (
                      <Check size={14} className="text-core-green ml-auto flex-shrink-0" />
                    )}
                  </button>
                )
              )}
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full h-11 bg-core-green text-slate-950 font-semibold rounded-xl hover:bg-core-green-h transition-colors flex items-center justify-center gap-2 mt-4"
            >
              Continuar <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Step 1 — Empresa */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Nome da empresa</h2>
              <p className="text-slate-500 text-sm">Como você chama o seu negócio?</p>
            </div>
            <input
              autoFocus
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && setStep(2)}
              placeholder="Ex: Loja do João, Distribuidora XYZ…"
              className="w-full h-12 bg-slate-900 border border-white/[0.08] rounded-xl px-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-core-green/40 transition-colors"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setStep(0)}
                className="flex-1 h-11 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 h-11 bg-core-green text-slate-950 font-semibold rounded-xl hover:bg-core-green-h transition-colors flex items-center justify-center gap-2"
              >
                Continuar <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Módulos */}
        {step === 2 && (
          <div className="space-y-3">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold text-slate-100 mb-1">Recursos ativos</h2>
              <p className="text-slate-500 text-sm">
                Selecione o que deseja usar. Você pode mudar depois.
              </p>
            </div>
            <div className="bg-slate-900 border border-white/[0.06] rounded-xl p-3 max-h-72 overflow-y-auto space-y-0.5">
              {MODULE_CATALOG.slice(0, 16).map((mod) => {
                const active = modules.has(mod.key);
                return (
                  <button
                    key={mod.key}
                    onClick={() => toggleModule(mod.key)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-core-green/10 text-slate-200'
                        : 'text-slate-400 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-base flex-shrink-0">{mod.icon ?? '📦'}</span>
                    <span className="text-xs font-medium flex-1">{mod.label}</span>
                    {active && <Check size={12} className="text-core-green flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-600 text-center">
              {modules.size} módulo{modules.size !== 1 ? 's' : ''} selecionado
              {modules.size !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 h-11 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={finish}
                disabled={saving}
                className="flex-1 h-11 bg-core-green text-slate-950 font-semibold rounded-xl hover:bg-core-green-h transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  'Configurando…'
                ) : (
                  <>
                    Concluir <Check size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Pronto */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-core-green/10 border border-core-green/20 flex items-center justify-center mx-auto">
              <Check size={28} className="text-core-green" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 mb-1">Tudo pronto!</h2>
              <p className="text-slate-500 text-sm">
                {businessName
                  ? `Bem-vindo ao CORE, ${businessName}!`
                  : 'Seu espaço de trabalho está configurado.'}
              </p>
            </div>
            <button
              onClick={onComplete}
              className="w-full h-11 bg-core-green text-slate-950 font-semibold rounded-xl hover:bg-core-green-h transition-colors flex items-center justify-center gap-2"
            >
              Entrar no CORE <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
