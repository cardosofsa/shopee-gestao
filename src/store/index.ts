import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { notifySyncError } from '../lib/sync';
import { createAuthSlice } from './slices/auth';
import { createComprasSlice } from './slices/compras';
import { createFinanceiroSlice } from './slices/financeiro';
import { createPedidosSlice } from './slices/pedidos';
import { createProdutosSlice } from './slices/produtos';
import { createUISlice } from './slices/ui';
import {
  type AppState,
  COMPRAS_SEED,
  DEFAULT_CATEGORIAS_DESP,
  DEFAULT_CONFIGURACOES,
  PRODUTOS_SEED,
  TAREFAS_SEED,
} from './types';

export type { AppState };

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────────
      // Operational (overwritten on loadAndHydrate)
      produtos: PRODUTOS_SEED,
      pedidos: [],
      compras: COMPRAS_SEED,
      ajustes: [],
      despesas: [],
      tarefas: TAREFAS_SEED,
      historico: [],
      contasPagar: [],
      fornecedores: [],
      campanhas: [],
      metasProduto: [],
      configuracoes: DEFAULT_CONFIGURACOES,
      // Auth
      userId: null,
      isHydrated: false,
      subscription: null,
      organization: null,
      orgMembers: [],
      // UI preferences (overridden from localStorage on rehydration)
      darkMode: false,
      onboardingCompleted: false,
      paginasFavoritas: [],
      lojaFiltro: null,
      precificacoesSalvas: [],
      calculadoraDraft: null,
      categoriasDesp: DEFAULT_CATEGORIAS_DESP,
      categoriasProd: ['Perfumaria', 'Moto/Bike', 'Eletrônico', 'Acessórios', 'Kit/Combo'],
      orcamentosDesp: {},

      // ── Slice actions ────────────────────────────────────────────────────────
      ...createAuthSlice(set, get),
      ...createPedidosSlice(set, get),
      ...createProdutosSlice(set, get),
      ...createComprasSlice(set, get),
      ...createFinanceiroSlice(set, get),
      ...createUISlice(set, get),
    }),
    {
      name: 'shopee-gestao-store',
      version: 2,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as Partial<AppState>;
        if (fromVersion === 0) {
          return {
            darkMode: s.darkMode ?? false,
            onboardingCompleted: s.onboardingCompleted ?? false,
            calculadoraDraft: s.calculadoraDraft ?? null,
            categoriasDesp: s.categoriasDesp ?? DEFAULT_CATEGORIAS_DESP,
            categoriasProd: s.categoriasProd ?? [
              'Perfumaria',
              'Moto/Bike',
              'Eletrônico',
              'Acessórios',
              'Kit/Combo',
            ],
            precificacoesSalvas: s.precificacoesSalvas ?? [],
          };
        }
        if (fromVersion === 1) {
          return {
            darkMode: s.darkMode ?? false,
            onboardingCompleted: s.onboardingCompleted ?? false,
            calculadoraDraft: s.calculadoraDraft ?? null,
            categoriasDesp: s.categoriasDesp ?? DEFAULT_CATEGORIAS_DESP,
            categoriasProd: s.categoriasProd ?? [
              'Perfumaria',
              'Moto/Bike',
              'Eletrônico',
              'Acessórios',
              'Kit/Combo',
            ],
            precificacoesSalvas: s.precificacoesSalvas ?? [],
          };
        }
        return persisted as AppState;
      },
      // Only UI preferences persist in localStorage; operational data comes from Supabase
      partialize: (state) => ({
        darkMode: state.darkMode,
        onboardingCompleted: state.onboardingCompleted,
        calculadoraDraft: state.calculadoraDraft,
        categoriasDesp: state.categoriasDesp,
        categoriasProd: state.categoriasProd,
        precificacoesSalvas: state.precificacoesSalvas,
        lojaFiltro: state.lojaFiltro,
        paginasFavoritas: state.paginasFavoritas,
      }),
      storage: {
        getItem: (key) => {
          try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch (err) {
            if (err instanceof DOMException && err.name === 'QuotaExceededError') {
              notifySyncError(
                'Armazenamento local cheio. Exporte um backup e limpe dados antigos nas Configurações.'
              );
            }
          }
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
