import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Produto, Pedido, Compra, Despesa, Tarefa, HistoricoMensal, Configuracoes, ColunaTarefa } from '../types';
import { dbPedidos, dbProdutos, dbCompras, dbDespesas, dbTarefas, dbHistorico, dbConfiguracoes, loadUserData, seedUserData } from '../lib/db';

const DEFAULT_CONFIGURACOES: Configuracoes = { aliquotaDAS: 0, percentualMarketing: 2 };

const PRODUTOS_SEED: Produto[] = [
  { sku: 'ALF-118', nome: 'Alfazema 118ml', categoria: 'Perfumaria', loja: 'Cardoso e-Shop', custoUnitario: 6.08, estoqueSeguranca: 50, estoqueAtual: 266, ativo: true },
  { sku: 'ALF-500', nome: 'Alfazema 500ml', categoria: 'Perfumaria', loja: 'Cardoso e-Shop', custoUnitario: 4.70, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true },
  { sku: 'FITA-PCX', nome: 'Fita Antifuro PCX', categoria: 'Moto/Bike', loja: 'Ambas', custoUnitario: 10.00, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true },
  { sku: 'FITA-BIKE', nome: 'Fita Antifuro Bike', categoria: 'Moto/Bike', loja: 'Ambas', custoUnitario: 10.00, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true },
  { sku: 'FITA-MOTO', nome: 'Fita Antifuro Moto', categoria: 'Moto/Bike', loja: 'Ambas', custoUnitario: 28.00, estoqueSeguranca: 15, estoqueAtual: 10, ativo: true },
  { sku: 'CJ13-3', nome: 'Carregador Veicular TIPO-C', categoria: 'Eletrônico', loja: 'Cardoso e-Shop', custoUnitario: 18.50, estoqueSeguranca: 5, estoqueAtual: 0, ativo: true },
  { sku: 'CJ13-2', nome: 'Carregador Veicular IOS', categoria: 'Eletrônico', loja: 'Cardoso e-Shop', custoUnitario: 18.50, estoqueSeguranca: 5, estoqueAtual: 1, ativo: true },
  { sku: 'L14-4', nome: 'Base Carregador Veicular', categoria: 'Eletrônico', loja: 'Cardoso e-Shop', custoUnitario: 14.50, estoqueSeguranca: 5, estoqueAtual: 1, ativo: true },
  { sku: 'CANMAD', nome: 'Canivete Madeira', categoria: 'Acessórios', loja: 'Cardoso e-Shop', custoUnitario: 12.00, estoqueSeguranca: 5, estoqueAtual: 0, ativo: true },
  { sku: 'BAINHAC', nome: 'Bainha de Couro', categoria: 'Acessórios', loja: 'Ambas', custoUnitario: 3.00, estoqueSeguranca: 10, estoqueAtual: 0, ativo: true },
  { sku: 'BAINHAC-PREMIUM', nome: 'Bainha de Couro Premium', categoria: 'Acessórios', loja: 'Cardoso e-Shop', custoUnitario: 5.00, estoqueSeguranca: 5, estoqueAtual: 0, ativo: true },
  { sku: 'CANMAD-BAINHAC', nome: 'Kit Canivete + Bainha', categoria: 'Kit/Combo', loja: 'Cardoso e-Shop', custoUnitario: 15.00, estoqueSeguranca: 5, estoqueAtual: 0, ativo: true },
];


const COMPRAS_SEED: Compra[] = [
  { id: 'c1', sku: 'ALF-118', produto: 'Alfazema 118ml', data: '2026-06-18', quantidadeEntrada: 240, custoUnitario: 6.08, custoTotal: 1459.20, fornecedor: 'Binho Cosméticos', nfRef: '852', pagamento: 'Pix', parcelas: 1, valorParcela: 1459.20, loja: 'Cardoso e-Shop', observacoes: '' },
  { id: 'c2', sku: 'ALF-118', produto: 'Alfazema 118ml', data: '2026-06-17', quantidadeEntrada: 267, custoUnitario: 6.08, custoTotal: 1623.14, fornecedor: 'Binho Cosméticos', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 1623.14, loja: 'Cardoso e-Shop', observacoes: '' },
  { id: 'c3', sku: 'ALF-500', produto: 'Alfazema 500ml', data: '2026-06-18', quantidadeEntrada: 36, custoUnitario: 4.70, custoTotal: 169.20, fornecedor: 'Binho Cosméticos', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 169.20, loja: 'Cardoso e-Shop', observacoes: '' },
  { id: 'c4', sku: 'FITA-PCX', produto: 'Fita Antifuro PCX', data: '2026-06-18', quantidadeEntrada: 16, custoUnitario: 10.00, custoTotal: 160.00, fornecedor: 'Lindomar', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 160.00, loja: 'Ambas', observacoes: '' },
  { id: 'c5', sku: 'FITA-BIKE', produto: 'Fita Antifuro Bike', data: '2026-06-18', quantidadeEntrada: 9, custoUnitario: 10.00, custoTotal: 90.00, fornecedor: 'Lindomar', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 90.00, loja: 'Ambas', observacoes: '' },
  { id: 'c6', sku: 'FITA-MOTO', produto: 'Fita Antifuro Moto', data: '2026-06-18', quantidadeEntrada: 21, custoUnitario: 28.00, custoTotal: 588.00, fornecedor: 'Lindomar', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 588.00, loja: 'Ambas', observacoes: '' },
  { id: 'c7', sku: 'CJ13-3', produto: 'Carregador Veicular TIPO-C', data: '2026-06-18', quantidadeEntrada: 2, custoUnitario: 18.50, custoTotal: 37.00, fornecedor: 'Tony', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 37.00, loja: 'Cardoso e-Shop', observacoes: '' },
  { id: 'c8', sku: 'BAINHAC', produto: 'Bainha de Couro', data: '2026-06-18', quantidadeEntrada: 17, custoUnitario: 3.00, custoTotal: 51.00, fornecedor: 'Sertão', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 51.00, loja: 'Ambas', observacoes: '' },
  { id: 'c9', sku: 'CANMAD-BAINHAC', produto: 'Kit Canivete + Bainha', data: '2026-06-18', quantidadeEntrada: 3, custoUnitario: 15.00, custoTotal: 45.00, fornecedor: 'Helen', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 45.00, loja: 'Cardoso e-Shop', observacoes: '' },
  { id: 'c10', sku: 'FITA-MOTO', produto: 'Fita Antifuro Moto', data: '2026-06-18', quantidadeEntrada: 10, custoUnitario: 28.00, custoTotal: 280.00, fornecedor: 'Lindomar', nfRef: '00', pagamento: 'Pix', parcelas: 1, valorParcela: 280.00, loja: 'Ambas', observacoes: '' },
];

const TAREFAS_SEED: Tarefa[] = [
  { id: 't1', titulo: 'Embalar pedidos do dia', descricao: 'Embalar todos os pedidos com status Enviado', coluna: 'todo', posicao: 0, prioridade: 'alta', criadoEm: '2026-06-18T08:00:00Z' },
  { id: 't2', titulo: 'Comprar fita adesiva', descricao: 'Estoque de fita adesiva acabando', coluna: 'todo', posicao: 1, prioridade: 'media', criadoEm: '2026-06-18T08:00:00Z' },
  { id: 't3', titulo: 'Atualizar anúncio ALF-118', descricao: 'Foto nova do produto chegou', coluna: 'in_progress', posicao: 0, prioridade: 'media', criadoEm: '2026-06-17T10:00:00Z' },
  { id: 't4', titulo: 'Repor FITA-MOTO', descricao: 'Estoque crítico - contatar Lindomar', coluna: 'in_progress', posicao: 1, prioridade: 'alta', criadoEm: '2026-06-17T09:00:00Z' },
  { id: 't5', titulo: 'Cadastrar novo SKU carregador', descricao: 'Carregador USB-C 65W chegou', coluna: 'done', posicao: 0, prioridade: 'baixa', criadoEm: '2026-06-16T14:00:00Z' },
];

interface AppState {
  produtos: Produto[];
  pedidos: Pedido[];
  compras: Compra[];
  despesas: Despesa[];
  tarefas: Tarefa[];
  historico: HistoricoMensal[];
  configuracoes: Configuracoes;
  userId: string | null;
  isHydrated: boolean;

  // Auth / Supabase
  setUserId: (id: string | null) => void;
  hydrate: (data: { produtos: Produto[]; pedidos: Pedido[]; compras: Compra[]; despesas: Despesa[]; tarefas: Tarefa[]; historico: HistoricoMensal[]; configuracoes: Configuracoes | null }) => void;
  loadAndHydrate: (userId: string) => Promise<void>;

  // Actions - Pedidos
  addPedido: (p: Pedido) => void;
  addPedidos: (ps: Pedido[]) => void;
  updatePedidoStatus: (id: string, status: Pedido['status']) => void;
  deletePedido: (id: string) => void;

  // Actions - Produtos
  addProduto: (p: Produto) => void;
  updateProduto: (sku: string, data: Partial<Produto>) => void;
  deleteProduto: (sku: string) => void;
  updateEstoque: (sku: string, delta: number) => void;

  // Actions - Compras
  addCompra: (c: Compra) => void;
  deleteCompra: (id: string) => void;

  // Actions - Despesas
  addDespesa: (d: Omit<Despesa, 'id'>) => void;
  deleteDespesa: (id: string) => void;

  // Actions - Tarefas
  addTarefa: (t: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  moveTarefa: (id: string, coluna: ColunaTarefa) => void;

  // Actions - Historico
  addHistorico: (h: HistoricoMensal) => void;
  updateHistorico: (mesAno: string, data: Partial<HistoricoMensal>) => void;

  // Actions - Config
  updateConfiguracoes: (c: Partial<Configuracoes>) => void;

  // Seed
  resetToSeed: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      produtos: PRODUTOS_SEED,
      pedidos: [],
      compras: COMPRAS_SEED,
      despesas: [],
      tarefas: TAREFAS_SEED,
      historico: [],
      configuracoes: DEFAULT_CONFIGURACOES,
      userId: null,
      isHydrated: false,

      setUserId: (id) => set({ userId: id }),

      hydrate: (data) => set({
        produtos: data.produtos.length > 0 ? data.produtos : PRODUTOS_SEED,
        pedidos: data.pedidos,
        compras: data.compras.length > 0 ? data.compras : COMPRAS_SEED,
        despesas: data.despesas,
        tarefas: data.tarefas.length > 0 ? data.tarefas : TAREFAS_SEED,
        historico: data.historico,
        configuracoes: data.configuracoes ?? DEFAULT_CONFIGURACOES,
        isHydrated: true,
      }),

      loadAndHydrate: async (userId) => {
        set({ userId, isHydrated: false });
        const data = await loadUserData(userId);
        const isNew = data.produtos.length === 0;
        if (isNew) {
          await seedUserData(userId, {
            produtos: PRODUTOS_SEED,
            compras: COMPRAS_SEED, tarefas: TAREFAS_SEED,
            configuracoes: DEFAULT_CONFIGURACOES,
          });
          set({
            produtos: PRODUTOS_SEED, pedidos: [], compras: COMPRAS_SEED,
            despesas: [], tarefas: TAREFAS_SEED, historico: [],
            configuracoes: DEFAULT_CONFIGURACOES, isHydrated: true,
          });
        } else {
          get().hydrate(data);
        }
      },

      addPedido: (p) => {
        set((s) => ({ pedidos: [p, ...s.pedidos] }));
        const uid = get().userId;
        if (uid) dbPedidos.upsert(p, uid).catch(console.error);
      },
      addPedidos: (ps) => {
        set((s) => ({ pedidos: [...ps, ...s.pedidos] }));
        const uid = get().userId;
        if (uid) dbPedidos.upsertMany(ps, uid).catch(console.error);
      },
      updatePedidoStatus: (id, status) => {
        const { pedidos, updateEstoque } = get();
        const pedido = pedidos.find((p) => p.id === id);
        if (!pedido) return;
        const prevStatus = pedido.status;
        const unidades = pedido.unidadesEstoque;
        if (pedido.loja !== 'Projetando') {
          if ((status === 'Enviado' || status === 'Concluído') && prevStatus === 'Em processo') updateEstoque(pedido.sku, -unidades);
          if (status === 'Devolvido' && (prevStatus === 'Enviado' || prevStatus === 'Concluído')) updateEstoque(pedido.sku, unidades);
        }
        set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, status } : p)) }));
        const uid = get().userId;
        if (uid) dbPedidos.updateStatus(id, status, uid).catch(console.error);
      },
      deletePedido: (id) => {
        set((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) }));
        const uid = get().userId;
        if (uid) dbPedidos.delete(id, uid).catch(console.error);
      },

      addProduto: (p) => {
        set((s) => ({ produtos: [...s.produtos, p] }));
        const uid = get().userId;
        if (uid) dbProdutos.upsert(p, uid).catch(console.error);
      },
      updateProduto: (sku, data) => {
        set((s) => ({ produtos: s.produtos.map((p) => (p.sku === sku ? { ...p, ...data } : p)) }));
        const uid = get().userId;
        const updated = get().produtos.find((p) => p.sku === sku);
        if (uid && updated) dbProdutos.upsert(updated, uid).catch(console.error);
      },
      deleteProduto: (sku) => {
        set((s) => ({ produtos: s.produtos.filter((p) => p.sku !== sku) }));
        const uid = get().userId;
        if (uid) dbProdutos.delete(sku, uid).catch(console.error);
      },
      updateEstoque: (sku, delta) => {
        const cur = get().produtos.find((p) => p.sku === sku);
        const newVal = Math.max(0, (cur?.estoqueAtual ?? 0) + delta);
        set((s) => ({ produtos: s.produtos.map((p) => p.sku === sku ? { ...p, estoqueAtual: newVal } : p) }));
        const uid = get().userId;
        if (uid) dbProdutos.updateEstoque(sku, newVal, uid).catch(console.error);
      },

      addCompra: (c) => {
        const despesa: Despesa = {
          id: crypto.randomUUID(),
          data: c.data,
          categoria: 'Mercadoria',
          descricao: `${c.produto} — ${c.quantidadeEntrada} un. (${c.fornecedor || 'sem fornecedor'})`,
          valor: c.custoTotal,
          loja: (c.loja as Despesa['loja']) || 'Ambas',
          compraRef: c.id,
        };
        set((s) => ({ compras: [c, ...s.compras], despesas: [despesa, ...s.despesas] }));
        get().updateEstoque(c.sku, c.quantidadeEntrada);
        const uid = get().userId;
        if (uid) {
          dbCompras.insert(c, uid).catch(console.error);
          dbDespesas.insert(despesa, uid).catch(console.error);
        }
      },
      deleteCompra: (id) => {
        const compra = get().compras.find((c) => c.id === id);
        if (compra) get().updateEstoque(compra.sku, -compra.quantidadeEntrada);
        set((s) => ({ compras: s.compras.filter((c) => c.id !== id), despesas: s.despesas.filter((d) => d.compraRef !== id) }));
        const uid = get().userId;
        if (uid) {
          dbCompras.delete(id, uid).catch(console.error);
          dbDespesas.deleteByCompraRef(id, uid).catch(console.error);
        }
      },

      addDespesa: (d) => {
        const nova = { ...d, id: crypto.randomUUID() };
        set((s) => ({ despesas: [nova, ...s.despesas] }));
        const uid = get().userId;
        if (uid) dbDespesas.insert(nova, uid).catch(console.error);
      },
      deleteDespesa: (id) => {
        set((s) => ({ despesas: s.despesas.filter((d) => d.id !== id) }));
        const uid = get().userId;
        if (uid) dbDespesas.delete(id, uid).catch(console.error);
      },

      addTarefa: (t) => {
        set((s) => ({ tarefas: [...s.tarefas, t] }));
        const uid = get().userId;
        if (uid) dbTarefas.insert(t, uid).catch(console.error);
      },
      updateTarefa: (id, data) => {
        set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
        const uid = get().userId;
        if (uid) dbTarefas.update(id, data, uid).catch(console.error);
      },
      deleteTarefa: (id) => {
        set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) }));
        const uid = get().userId;
        if (uid) dbTarefas.delete(id, uid).catch(console.error);
      },
      moveTarefa: (id, coluna) => {
        set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, coluna } : t)) }));
        const uid = get().userId;
        if (uid) dbTarefas.update(id, { coluna }, uid).catch(console.error);
      },

      addHistorico: (h) => {
        set((s) => ({ historico: [...s.historico, h] }));
        const uid = get().userId;
        if (uid) dbHistorico.upsert(h, uid).catch(console.error);
      },
      updateHistorico: (mesAno, data) => {
        set((s) => ({ historico: s.historico.map((h) => (h.mesAno === mesAno ? { ...h, ...data } : h)) }));
        const uid = get().userId;
        const updated = get().historico.find((h) => h.mesAno === mesAno);
        if (uid && updated) dbHistorico.upsert(updated, uid).catch(console.error);
      },

      updateConfiguracoes: (c) => {
        const next = { ...get().configuracoes, ...c };
        set({ configuracoes: next });
        const uid = get().userId;
        if (uid) dbConfiguracoes.upsert(next, uid).catch(console.error);
      },

      resetToSeed: () =>
        set({
          produtos: PRODUTOS_SEED,
          pedidos: [],
          compras: COMPRAS_SEED,
          despesas: [],
          tarefas: TAREFAS_SEED,
          historico: [],
          configuracoes: DEFAULT_CONFIGURACOES,
        }),
    }),
    { name: 'shopee-gestao-store' }
  )
);
