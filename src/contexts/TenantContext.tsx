import { createContext, useContext, useEffect, useState } from 'react';

import type { ModuleKey } from '../config/modules';
import type { SegmentKey, Terminologia } from '../config/segments';
import { SEGMENTS } from '../config/segments';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface TenantCtx {
  segment: SegmentKey;
  businessName: string;
  onboardingDone: boolean;
  activeModules: Set<ModuleKey>;
  terminologia: Terminologia;
  isModuleEnabled: (key: ModuleKey) => boolean;
  isLoading: boolean;
  refetch: () => void;
}

const defaultTerminologia: Terminologia = {
  pedido: 'Pedido',
  cliente: 'Cliente',
  produto: 'Produto',
  receita: 'Faturamento',
  loja: 'Loja',
};

const TenantContext = createContext<TenantCtx>({
  segment: 'ecommerce',
  businessName: '',
  onboardingDone: false,
  activeModules: new Set<ModuleKey>([...SEGMENTS.ecommerce.modulosPadrao]),
  terminologia: defaultTerminologia,
  isModuleEnabled: () => true,
  isLoading: true,
  refetch: () => {},
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [segment, setSegment] = useState<SegmentKey>('ecommerce');
  const [businessName, setBusinessName] = useState('');
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [activeModules, setActiveModules] = useState<Set<ModuleKey>>(
    new Set<ModuleKey>([...SEGMENTS.ecommerce.modulosPadrao])
  );
  const [terminologia, setTerminologia] = useState<Terminologia>(defaultTerminologia);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        if (!cancelled) setIsLoading(false);
        return;
      }
      setIsLoading(true);

      // 1. Busca tenant_profile
      const { data: profile } = await supabase
        .from('tenant_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();

      if (cancelled) return;

      const seg: SegmentKey = (profile?.segment as SegmentKey) ?? 'ecommerce';
      setSegment(seg);
      setBusinessName(profile?.business_name ?? '');
      setOnboardingDone(profile?.onboarding_done ?? false);
      setTerminologia({
        pedido: profile?.term_pedido ?? defaultTerminologia.pedido,
        cliente: profile?.term_cliente ?? defaultTerminologia.cliente,
        produto: profile?.term_produto ?? defaultTerminologia.produto,
        receita: profile?.term_receita ?? defaultTerminologia.receita,
        loja: profile?.term_loja ?? defaultTerminologia.loja,
      });

      // 2. Busca módulos ativos do banco
      const { data: modulesRows } = await supabase
        .from('tenant_modules')
        .select('module_key, enabled')
        .eq('user_id', user!.id);

      if (cancelled) return;

      if (modulesRows && modulesRows.length > 0) {
        // Banco tem configuração: usa ela
        const enabled = new Set(
          modulesRows.filter((r) => r.enabled).map((r) => r.module_key as ModuleKey)
        );
        setActiveModules(enabled);
      } else {
        // Sem configuração: usa padrão do segmento
        const defaults = SEGMENTS[seg]?.modulosPadrao ?? SEGMENTS.ecommerce.modulosPadrao;
        setActiveModules(new Set<ModuleKey>([...defaults]));
      }

      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [user, tick]);

  const isModuleEnabled = (key: ModuleKey) => activeModules.has(key);

  return (
    <TenantContext.Provider
      value={{
        segment,
        businessName,
        onboardingDone,
        activeModules,
        terminologia,
        isModuleEnabled,
        isLoading,
        refetch,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}
