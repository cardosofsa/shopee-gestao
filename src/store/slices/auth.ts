import type { StoreApi } from 'zustand';

import {
  dbOrganizations,
  dbOrgMembers,
  dbSubscriptions,
  loadUserData,
  seedUserData,
} from '../../lib/db';
import type { Organization, OrgMember, Subscription } from '../../types';
import {
  type AppState,
  COMPRAS_SEED,
  DEFAULT_CATEGORIAS_DESP,
  DEFAULT_CONFIGURACOES,
  PRODUTOS_SEED,
  TAREFAS_SEED,
} from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

export function createAuthSlice(set: SetFn, get: GetFn) {
  return {
    setUserId: (id: string | null) => set({ userId: id }),
    setSubscription: (s: Subscription | null) => set({ subscription: s }),
    setOrganization: (org: Organization | null) => set({ organization: org }),
    setOrgMembers: (members: OrgMember[]) => set({ orgMembers: members }),

    hydrate: (data: {
      produtos: AppState['produtos'];
      pedidos: AppState['pedidos'];
      compras: AppState['compras'];
      despesas: AppState['despesas'];
      tarefas: AppState['tarefas'];
      historico: AppState['historico'];
      configuracoes: AppState['configuracoes'] | null;
      contasPagar?: AppState['contasPagar'];
      fornecedores?: AppState['fornecedores'];
      campanhas?: AppState['campanhas'];
      metasProduto?: AppState['metasProduto'];
    }) =>
      set({
        produtos: data.produtos,
        pedidos: data.pedidos,
        compras: data.compras,
        despesas: data.despesas,
        tarefas: data.tarefas.length > 0 ? data.tarefas : TAREFAS_SEED,
        historico: data.historico,
        configuracoes: data.configuracoes ?? DEFAULT_CONFIGURACOES,
        contasPagar: data.contasPagar ?? [],
        fornecedores: data.fornecedores ?? [],
        campanhas: data.campanhas ?? [],
        metasProduto: data.metasProduto ?? [],
        isHydrated: true,
      }),

    loadAndHydrate: async (userId: string) => {
      set({ userId, isHydrated: false });
      const [data, subscription, orgOwned, orgMember] = await Promise.all([
        loadUserData(userId),
        dbSubscriptions.getOrDefault(userId),
        dbOrganizations.getOwned(userId),
        dbOrganizations.getMembership(userId),
      ]);
      const organization = orgOwned ?? orgMember;
      let orgMembers: OrgMember[] = [];
      if (organization) {
        orgMembers = await dbOrgMembers.getByOrg(organization.id).catch(() => []);
      }
      set({ subscription, organization, orgMembers });
      const isNew = data.produtos.length === 0;
      if (isNew) {
        await seedUserData(userId, {
          produtos: PRODUTOS_SEED,
          compras: COMPRAS_SEED,
          tarefas: TAREFAS_SEED,
          configuracoes: DEFAULT_CONFIGURACOES,
        });
        set({
          produtos: PRODUTOS_SEED,
          pedidos: [],
          compras: COMPRAS_SEED,
          despesas: [],
          tarefas: TAREFAS_SEED,
          historico: [],
          configuracoes: DEFAULT_CONFIGURACOES,
          isHydrated: true,
        });
      } else {
        get().hydrate(data);
      }
    },

    loadOrganization: async (userId: string) => {
      const [owned, member] = await Promise.all([
        dbOrganizations.getOwned(userId),
        dbOrganizations.getMembership(userId),
      ]);
      const org = owned ?? member;
      let members: OrgMember[] = [];
      if (org) members = await dbOrgMembers.getByOrg(org.id).catch(() => []);
      set({ organization: org, orgMembers: members });
    },

    resetToSeed: () =>
      set({
        produtos: PRODUTOS_SEED,
        pedidos: [],
        compras: COMPRAS_SEED,
        ajustes: [],
        despesas: [],
        tarefas: TAREFAS_SEED,
        historico: [],
        configuracoes: DEFAULT_CONFIGURACOES,
        categoriasDesp: DEFAULT_CATEGORIAS_DESP,
      }),

    resetOperationalData: () =>
      set({
        produtos: [],
        pedidos: [],
        compras: [],
        ajustes: [],
        despesas: [],
        tarefas: [],
        historico: [],
        configuracoes: DEFAULT_CONFIGURACOES,
        userId: null,
        isHydrated: false,
        lojaFiltro: null,
        subscription: null,
        organization: null,
        orgMembers: [],
      }),

    clearSelectedData: (opts: {
      vendas?: boolean;
      estoque?: boolean;
      financeiro?: boolean;
      tarefas?: boolean;
      campanhas?: boolean;
      metas?: boolean;
    }) =>
      set({
        ...(opts.vendas ? { pedidos: [] } : {}),
        ...(opts.estoque ? { produtos: [], compras: [], ajustes: [] } : {}),
        ...(opts.financeiro ? { despesas: [], contasPagar: [], historico: [] } : {}),
        ...(opts.tarefas ? { tarefas: [] } : {}),
        ...(opts.campanhas ? { campanhas: [] } : {}),
        ...(opts.metas ? { metasProduto: [], fornecedores: [] } : {}),
      }),
  };
}
