import type { StoreApi } from 'zustand';

import type { CalculadoraDraft, PrecificacaoSalva } from '../../types';
import type { AppState } from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

export function createUISlice(set: SetFn, get: GetFn) {
  return {
    toggleDarkMode: () => {
      const next = !get().darkMode;
      set({ darkMode: next });
      document.documentElement.classList.toggle('dark', next);
    },
    setOnboardingCompleted: () => set({ onboardingCompleted: true }),
    toggleFavorito: (to: string) =>
      set((s) => ({
        paginasFavoritas: s.paginasFavoritas.includes(to)
          ? s.paginasFavoritas.filter((p) => p !== to)
          : [...s.paginasFavoritas, to],
      })),
    setLojaFiltro: (loja: string | null) => set({ lojaFiltro: loja }),
    savePrecificacao: (p: PrecificacaoSalva) =>
      set((s) => ({ precificacoesSalvas: [p, ...s.precificacoesSalvas] })),
    deletePrecificacao: (id: string) =>
      set((s) => ({ precificacoesSalvas: s.precificacoesSalvas.filter((p) => p.id !== id) })),
    setCalculadoraDraft: (d: CalculadoraDraft) => set({ calculadoraDraft: d }),
    updateCategoriasDesp: (cats: string[]) => set({ categoriasDesp: cats }),
    updateCategoriasProd: (cats: string[]) => set({ categoriasProd: cats }),
    setOrcamentoDesp: (categoria: string, valor: number) =>
      set((s) => ({ orcamentosDesp: { ...s.orcamentosDesp, [categoria]: valor } })),
  };
}
