import type { StoreApi } from 'zustand';

import {
  dbCampanhas,
  dbConfiguracoes,
  dbContasPagar,
  dbDespesas,
  dbFornecedores,
  dbHistorico,
  dbMetasProduto,
  dbTarefas,
} from '../../lib/db';
import { syncFail, withRetry } from '../../lib/sync';
import type {
  Campanha,
  ColunaTarefa,
  Configuracoes,
  ContaPagar,
  Despesa,
  Fornecedor,
  HistoricoMensal,
  MetaProduto,
  Tarefa,
} from '../../types';
import type { AppState } from '../types';

type SetFn = StoreApi<AppState>['setState'];
type GetFn = StoreApi<AppState>['getState'];

export function createFinanceiroSlice(set: SetFn, get: GetFn) {
  return {
    // ── Despesas ───────────────────────────────────────────────────────────────
    addDespesa: (d: Omit<Despesa, 'id'>) => {
      const nova = { ...d, id: crypto.randomUUID() };
      set((s) => ({ despesas: [nova, ...s.despesas] }));
      const uid = get().userId;
      if (uid) withRetry(() => dbDespesas.insert(nova, uid), 'despesa').catch(syncFail('despesa'));
    },
    updateDespesa: (id: string, data: Partial<Omit<Despesa, 'id' | 'compraRef'>>) => {
      set((s) => ({ despesas: s.despesas.map((d) => (d.id === id ? { ...d, ...data } : d)) }));
      const uid = get().userId;
      const updated = get().despesas.find((d) => d.id === id);
      if (uid && updated)
        withRetry(() => dbDespesas.upsert(updated, uid), 'despesa').catch(syncFail('despesa'));
    },
    deleteDespesa: (id: string) => {
      set((s) => ({ despesas: s.despesas.filter((d) => d.id !== id) }));
      const uid = get().userId;
      if (uid) withRetry(() => dbDespesas.delete(id, uid), 'despesa').catch(syncFail('despesa'));
    },

    // ── Histórico mensal ───────────────────────────────────────────────────────
    addHistorico: (h: HistoricoMensal) => {
      set((s) => ({ historico: [...s.historico, h] }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbHistorico.upsert(h, uid), 'histórico').catch(syncFail('histórico'));
    },
    updateHistorico: (mesAno: string, data: Partial<HistoricoMensal>) => {
      set((s) => ({
        historico: s.historico.map((h) => (h.mesAno === mesAno ? { ...h, ...data } : h)),
      }));
      const uid = get().userId;
      const updated = get().historico.find((h) => h.mesAno === mesAno);
      if (uid && updated)
        withRetry(() => dbHistorico.upsert(updated, uid), 'histórico').catch(syncFail('histórico'));
    },
    deleteHistorico: (mesAno: string) => {
      set((s) => ({ historico: s.historico.filter((h) => h.mesAno !== mesAno) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbHistorico.delete(mesAno, uid), 'histórico').catch(syncFail('histórico'));
    },

    // ── Contas a pagar ─────────────────────────────────────────────────────────
    addContaPagar: (c: ContaPagar) => {
      set((s) => ({ contasPagar: [...s.contasPagar, c] }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbContasPagar.upsert(c, uid), 'conta a pagar').catch(
          syncFail('conta a pagar')
        );
    },
    updateContaPagar: (id: string, data: Partial<ContaPagar>) => {
      set((s) => ({
        contasPagar: s.contasPagar.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }));
      const uid = get().userId;
      const updated = get().contasPagar.find((c) => c.id === id);
      if (uid && updated)
        withRetry(() => dbContasPagar.upsert(updated, uid), 'conta a pagar').catch(
          syncFail('conta a pagar')
        );
    },
    deleteContaPagar: (id: string) => {
      set((s) => ({ contasPagar: s.contasPagar.filter((c) => c.id !== id) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbContasPagar.delete(id, uid), 'conta a pagar').catch(
          syncFail('conta a pagar')
        );
    },
    pagarConta: (id: string, pagoEm?: string) => {
      const pagoEmVal = pagoEm ?? new Date().toISOString().slice(0, 10);
      set((s) => ({
        contasPagar: s.contasPagar.map((c) =>
          c.id === id ? { ...c, status: 'pago', pagoEm: pagoEmVal } : c
        ),
      }));
      const uid = get().userId;
      const updated = get().contasPagar.find((c) => c.id === id);
      if (uid && updated)
        withRetry(() => dbContasPagar.upsert(updated, uid), 'conta a pagar').catch(
          syncFail('conta a pagar')
        );
    },

    // ── Fornecedores ───────────────────────────────────────────────────────────
    addFornecedor: (f: Fornecedor) => {
      set((s) => ({ fornecedores: [...s.fornecedores, f] }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbFornecedores.upsert(f, uid), 'fornecedor').catch(syncFail('fornecedor'));
    },
    updateFornecedor: (id: string, data: Partial<Fornecedor>) => {
      set((s) => ({
        fornecedores: s.fornecedores.map((f) => (f.id === id ? { ...f, ...data } : f)),
      }));
      const uid = get().userId;
      const updated = get().fornecedores.find((f) => f.id === id);
      if (uid && updated)
        withRetry(() => dbFornecedores.upsert(updated, uid), 'fornecedor').catch(
          syncFail('fornecedor')
        );
    },
    deleteFornecedor: (id: string) => {
      set((s) => ({ fornecedores: s.fornecedores.filter((f) => f.id !== id) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbFornecedores.delete(id, uid), 'fornecedor').catch(syncFail('fornecedor'));
    },

    // ── Campanhas ──────────────────────────────────────────────────────────────
    addCampanha: (c: Campanha) => {
      set((s) => ({ campanhas: [...s.campanhas, c] }));
      const uid = get().userId;
      if (uid) withRetry(() => dbCampanhas.upsert(c, uid), 'campanha').catch(syncFail('campanha'));
    },
    updateCampanha: (id: string, data: Partial<Campanha>) => {
      set((s) => ({
        campanhas: s.campanhas.map((c) => (c.id === id ? { ...c, ...data } : c)),
      }));
      const uid = get().userId;
      const updated = get().campanhas.find((c) => c.id === id);
      if (uid && updated)
        withRetry(() => dbCampanhas.upsert(updated, uid), 'campanha').catch(syncFail('campanha'));
    },
    deleteCampanha: (id: string) => {
      set((s) => ({ campanhas: s.campanhas.filter((c) => c.id !== id) }));
      const uid = get().userId;
      if (uid) withRetry(() => dbCampanhas.delete(id, uid), 'campanha').catch(syncFail('campanha'));
    },

    // ── Metas por produto ──────────────────────────────────────────────────────
    upsertMetaProduto: (m: MetaProduto) => {
      set((s) => {
        const rest = s.metasProduto.filter((x) => !(x.sku === m.sku && x.mesAno === m.mesAno));
        return { metasProduto: [...rest, m] };
      });
      const uid = get().userId;
      if (uid)
        withRetry(() => dbMetasProduto.upsert(m, uid), 'meta de produto').catch(
          syncFail('meta de produto')
        );
    },
    deleteMetaProduto: (sku: string, mesAno: string) => {
      set((s) => ({
        metasProduto: s.metasProduto.filter((x) => !(x.sku === sku && x.mesAno === mesAno)),
      }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbMetasProduto.delete(sku, mesAno, uid), 'meta de produto').catch(
          syncFail('meta de produto')
        );
    },

    // ── Tarefas ────────────────────────────────────────────────────────────────
    addTarefa: (t: Tarefa) => {
      set((s) => ({ tarefas: [...s.tarefas, t] }));
      const uid = get().userId;
      if (uid) withRetry(() => dbTarefas.insert(t, uid), 'tarefa').catch(syncFail('tarefa'));
    },
    updateTarefa: (id: string, data: Partial<Tarefa>) => {
      set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
      const uid = get().userId;
      if (uid) withRetry(() => dbTarefas.update(id, data, uid), 'tarefa').catch(syncFail('tarefa'));
    },
    deleteTarefa: (id: string) => {
      set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) }));
      const uid = get().userId;
      if (uid) withRetry(() => dbTarefas.delete(id, uid), 'tarefa').catch(syncFail('tarefa'));
    },
    moveTarefa: (id: string, coluna: ColunaTarefa) => {
      set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, coluna } : t)) }));
      const uid = get().userId;
      if (uid)
        withRetry(() => dbTarefas.update(id, { coluna }, uid), 'tarefa').catch(syncFail('tarefa'));
    },

    // ── Configurações ──────────────────────────────────────────────────────────
    updateConfiguracoes: (c: Partial<Configuracoes>) => {
      const next = { ...get().configuracoes, ...c };
      set({ configuracoes: next });
      const uid = get().userId;
      if (uid)
        withRetry(() => dbConfiguracoes.upsert(next, uid), 'configurações').catch(
          syncFail('configurações')
        );
    },
  };
}
