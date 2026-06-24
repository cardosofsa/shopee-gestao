import { Lock } from 'lucide-react';

import type { ModuleKey } from '../config/modules';
import { MODULE_BY_KEY } from '../config/modules';
import { useTenant } from '../contexts/TenantContext';

function ModuleDisabledScreen({ moduleKey }: { moduleKey: ModuleKey }) {
  const mod = MODULE_BY_KEY[moduleKey];
  return (
    <div className="flex-1 flex items-center justify-center p-8 min-h-[60vh]">
      <div className="max-w-sm w-full text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-slate-400" />
        </div>
        <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-base mb-1">
          {mod?.label ?? 'Módulo'} não disponível
        </h2>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">
          {mod?.description ?? 'Este módulo não está ativo no seu plano.'}
          {mod?.requiresPlan && <> Disponível nos planos {mod.requiresPlan.join(', ')}.</>}
        </p>
        <a
          href="/configs"
          className="inline-flex items-center gap-2 px-4 py-2 bg-core-green text-white text-sm font-medium rounded-xl hover:bg-core-green-h transition-colors"
        >
          Ver planos disponíveis
        </a>
      </div>
    </div>
  );
}

export function ModuleGuard({
  module: moduleKey,
  children,
  fallback,
}: {
  module: ModuleKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isModuleEnabled, isLoading } = useTenant();

  if (isLoading) return null;

  if (!isModuleEnabled(moduleKey)) {
    return fallback ? <>{fallback}</> : <ModuleDisabledScreen moduleKey={moduleKey} />;
  }

  return <>{children}</>;
}
