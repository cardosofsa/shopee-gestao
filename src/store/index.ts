import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Produto, Pedido, Compra, AjusteEstoque, Despesa, Tarefa, HistoricoMensal, Configuracoes, ColunaTarefa, PrecificacaoSalva, CalculadoraDraft } from '../types';
import { dbPedidos, dbProdutos, dbCompras, dbDespesas, dbTarefas, dbHistorico, dbConfiguracoes, dbAjustes, loadUserData, seedUserData } from '../lib/db';
import { withRetry, notifySyncError } from '../lib/sync';

function syncFail(label: string) {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    notifySyncError(`Falha ao salvar ${label}: ${msg}`);
  };
}

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

const DEFAULT_CATEGORIAS_DESP = ['Embalagem', 'Combustível', 'Insumos', 'Mercadoria', 'Marketing', 'Outro'];

interface AppState {
  produtos: Produto[];
  pedidos: Pedido[];
  compras: Compra[];
  ajustes: AjusteEstoque[];
  despesas: Despesa[];
  tarefas: Tarefa[];
  historico: HistoricoMensal[];
  configuracoes: Configuracoes;
  categoriasDesp: string[];
  userId: string | null;
  isHydrated: boolean;

  // Auth / Supabase
  setUserId: (id: string | null) => void;
  hydrate: (data: { produtos: Produto[]; pedidos: Pedido[]; compras: Compra[]; despesas: Despesa[]; tarefas: Tarefa[]; historico: HistoricoMensal[]; configuracoes: Configuracoes | null }) => void;
  loadAndHydrate: (userId: string) => Promise<void>;

  // Actions - Pedidos
  addPedido: (p: Pedido) => void;
  addPedidos: (ps: Pedido[]) => void;
  updatePedido: (id: string, updated: Pedido) => void;
  updatePedidoStatus: (id: string, status: Pedido['status']) => void;
  updatePedidosStatus: (ids: string[], status: Pedido['status']) => void;
  deletePedido: (id: string) => void;
  deletePedidos: (ids: string[]) => void;

  // Actions - Produtos
  addProduto: (p: Produto) => void;
  updateProduto: (sku: string, data: Partial<Produto>) => void;
  deleteProduto: (sku: string) => void;
  updateEstoque: (sku: string, delta: number) => void;

  // Actions - Compras
  addCompra: (c: Compra) => void;
  updateCompra: (id: string, data: Partial<Compra>) => void;
  deleteCompra: (id: string) => void;

  // Actions - Ajustes
  addAjuste: (a: AjusteEstoque) => void;

  // Actions - Despesas
  addDespesa: (d: Omit<Despesa, 'id'>) => void;
  updateDespesa: (id: string, data: Partial<Omit<Despesa, 'id' | 'compraRef'>>) => void;
  deleteDespesa: (id: string) => void;

  // Actions - Tarefas
  addTarefa: (t: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  moveTarefa: (id: string, coluna: ColunaTarefa) => void;

  // Actions - Historico
  addHistorico: (h: HistoricoMensal) => void;
  updateHistorico: (mesAno: string, data: Partial<HistoricoMensal>) => void;
  deleteHistorico: (mesAno: string) => void;

  // Actions - Config
  updateConfiguracoes: (c: Partial<Configuracoes>) => void;
  updateCategoriasDesp: (cats: string[]) => void;

  // Actions - Categorias de Produto
  categoriasProd: string[];
  updateCategoriasProd: (cats: string[]) => void;

  // Actions - Precificações
  precificacoesSalvas: PrecificacaoSalva[];
  savePrecificacao: (p: PrecificacaoSalva) => void;
  deletePrecificacao: (id: string) => void;

  // Calculadora draft (persiste o formulário ativo entre navegações)
  calculadoraDraft: CalculadoraDraft | null;
  setCalculadoraDraft: (d: CalculadoraDraft) => void;

  // UX: onboarding e tema
  onboardingCompleted: boolean;
  setOnboardingCompleted: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Filtro global de loja
  lojaFiltro: string | null;
  setLojaFiltro: (loja: string | null) => void;

  // Seed
  resetToSeed: () => void;

  // Logout cleanup
  resetOperationalData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      produtos: PRODUTOS_SEED,
      pedidos: [],
      compras: COMPRAS_SEED,
      ajustes: [],
      despesas: [],
      tarefas: TAREFAS_SEED,
      historico: [],
      configuracoes: DEFAULT_CONFIGURACOES,
      categoriasDesp: DEFAULT_CATEGORIAS_DESP,
      userId: null,
      isHydrated: false,
      categoriasProd: ['Perfumaria', 'Moto/Bike', 'Eletrônico', 'Acessórios', 'Kit/Combo'],
      precificacoesSalvas: [],
      calculadoraDraft: null,
      onboardingCompleted: false,
      lojaFiltro: null,
      darkMode: false,

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
        const prev = get().pedidos;
        set((s) => ({ pedidos: [p, ...s.pedidos] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbPedidos.upsert(p, uid), 'pedido')
          .catch(() => { set({ pedidos: prev }); notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.'); });
      },
      addPedidos: (ps) => {
        const prev = get().pedidos;
        set((s) => ({ pedidos: [...ps, ...s.pedidos] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbPedidos.upsertMany(ps, uid), 'pedidos')
          .catch(() => { set({ pedidos: prev }); notifySyncError('Falha ao importar pedidos. Revertendo — tente novamente.'); });
      },
      updatePedido: (id, updated) => {
        const { pedidos, produtos } = get();
        const old = pedidos.find((p) => p.id === id);
        if (!old) return;
        const prevPedidos = pedidos;
        const prevProdutos = produtos;
        if (old.status !== updated.status && updated.loja !== 'Projetando') {
          const prev = old.status;
          const next = updated.status;
          const u = updated.unidadesEstoque;
          if ((next === 'Enviado' || next === 'Concluído') && prev === 'Em processo') get().updateEstoque(updated.sku, -u);
          if (next === 'Devolvido' && (prev === 'Enviado' || prev === 'Concluído')) get().updateEstoque(updated.sku, u);
        }
        set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? updated : p)) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbPedidos.upsert(updated, uid), 'pedido')
          .catch(() => { set({ pedidos: prevPedidos, produtos: prevProdutos }); notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.'); });
      },
      updatePedidoStatus: (id, status) => {
        const { pedidos, produtos } = get();
        const pedido = pedidos.find((p) => p.id === id);
        if (!pedido) return;
        const prevPedidos = pedidos;
        const prevProdutos = produtos;
        const prevStatus = pedido.status;
        const unidades = pedido.unidadesEstoque;
        if (pedido.loja !== 'Projetando') {
          if ((status === 'Enviado' || status === 'Concluído') && prevStatus === 'Em processo') get().updateEstoque(pedido.sku, -unidades);
          if (status === 'Devolvido' && (prevStatus === 'Enviado' || prevStatus === 'Concluído')) get().updateEstoque(pedido.sku, unidades);
        }
        set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, status } : p)) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbPedidos.updateStatus(id, status, uid), 'status do pedido')
          .catch(() => { set({ pedidos: prevPedidos, produtos: prevProdutos }); notifySyncError('Falha ao atualizar status. Revertendo — tente novamente.'); });
      },
      updatePedidosStatus: (ids, status) => {
        const { pedidos, produtos } = get();
        const prevPedidos = pedidos;
        const prevProdutos = produtos;
        const idsSet = new Set(ids);
        const stockDeltas = new Map<string, number>();
        ids.forEach((id) => {
          const p = pedidos.find((x) => x.id === id);
          if (!p || p.status === status || p.loja === 'Projetando') return;
          const delta = stockDeltas.get(p.sku) ?? 0;
          if ((status === 'Enviado' || status === 'Concluído') && p.status === 'Em processo')
            stockDeltas.set(p.sku, delta - p.unidadesEstoque);
          if (status === 'Devolvido' && (p.status === 'Enviado' || p.status === 'Concluído'))
            stockDeltas.set(p.sku, delta + p.unidadesEstoque);
        });
        set((s) => ({
          pedidos: s.pedidos.map((p) => idsSet.has(p.id) ? { ...p, status } : p),
          produtos: s.produtos.map((p) => {
            const d = stockDeltas.get(p.sku);
            return d !== undefined ? { ...p, estoqueAtual: Math.max(0, p.estoqueAtual + d) } : p;
          }),
        }));
        const uid = get().userId;
        if (uid) {
          Promise.all([
            ...ids.map((id) => withRetry(() => dbPedidos.updateStatus(id, status, uid), 'status')),
            ...Array.from(stockDeltas.entries()).map(([sku]) => {
              const prod = get().produtos.find((p) => p.sku === sku);
              return prod ? withRetry(() => dbProdutos.updateEstoque(sku, prod.estoqueAtual, uid), 'estoque') : Promise.resolve();
            }),
          ]).catch(() => { set({ pedidos: prevPedidos, produtos: prevProdutos }); notifySyncError('Falha ao atualizar status em lote. Revertendo — tente novamente.'); });
        }
      },
      deletePedido: (id) => {
        const prev = get().pedidos;
        set((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbPedidos.delete(id, uid), 'pedido')
          .catch(() => { set({ pedidos: prev }); notifySyncError('Falha ao excluir pedido. Revertendo — tente novamente.'); });
      },
      deletePedidos: (ids) => {
        const prev = get().pedidos;
        const idsSet = new Set(ids);
        set((s) => ({ pedidos: s.pedidos.filter((p) => !idsSet.has(p.id)) }));
        const uid = get().userId;
        if (uid) Promise.all(ids.map((id) => withRetry(() => dbPedidos.delete(id, uid), 'pedido')))
          .catch(() => { set({ pedidos: prev }); notifySyncError('Falha ao excluir pedidos. Revertendo — tente novamente.'); });
      },

      addProduto: (p) => {
        set((s) => ({ produtos: [...s.produtos, p] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbProdutos.upsert(p, uid), 'produto').catch(syncFail('produto'));
      },
      updateProduto: (sku, data) => {
        set((s) => ({ produtos: s.produtos.map((p) => (p.sku === sku ? { ...p, ...data } : p)) }));
        const uid = get().userId;
        const updated = get().produtos.find((p) => p.sku === sku);
        if (uid && updated) withRetry(() => dbProdutos.upsert(updated, uid), 'produto').catch(syncFail('produto'));
      },
      deleteProduto: (sku) => {
        const { pedidos, compras } = get();
        const temPedidos = pedidos.some((p) => p.sku === sku);
        const temCompras = compras.some((c) => c.sku === sku);
        if (temPedidos || temCompras) {
          const origem = [temPedidos && 'pedidos', temCompras && 'compras'].filter(Boolean).join(' e ');
          notifySyncError(`Não é possível excluir: o produto possui ${origem} vinculados.`);
          return;
        }
        set((s) => ({ produtos: s.produtos.filter((p) => p.sku !== sku) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbProdutos.delete(sku, uid), 'produto').catch(syncFail('produto'));
      },
      updateEstoque: (sku, delta) => {
        const cur = get().produtos.find((p) => p.sku === sku);
        const newVal = Math.max(0, (cur?.estoqueAtual ?? 0) + delta);
        set((s) => ({ produtos: s.produtos.map((p) => p.sku === sku ? { ...p, estoqueAtual: newVal } : p) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbProdutos.updateEstoque(sku, newVal, uid), 'estoque').catch(syncFail('estoque'));
      },

      addCompra: (c) => {
        const { compras, despesas, produtos } = get();
        const prevCompras = compras;
        const prevDespesas = despesas;
        const prevProdutos = produtos;
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
        if (uid) Promise.all([
          withRetry(() => dbCompras.insert(c, uid), 'compra'),
          withRetry(() => dbDespesas.insert(despesa, uid), 'despesa de compra'),
        ]).catch(() => { set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos }); notifySyncError('Falha ao registrar compra. Revertendo — tente novamente.'); });
      },
      deleteCompra: (id) => {
        const { compras, despesas, produtos } = get();
        const prevCompras = compras;
        const prevDespesas = despesas;
        const prevProdutos = produtos;
        const compra = compras.find((c) => c.id === id);
        if (compra) get().updateEstoque(compra.sku, -compra.quantidadeEntrada);
        set((s) => ({ compras: s.compras.filter((c) => c.id !== id), despesas: s.despesas.filter((d) => d.compraRef !== id) }));
        const uid = get().userId;
        if (uid) Promise.all([
          withRetry(() => dbCompras.delete(id, uid), 'compra'),
          withRetry(() => dbDespesas.deleteByCompraRef(id, uid), 'despesa'),
        ]).catch(() => { set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos }); notifySyncError('Falha ao excluir compra. Revertendo — tente novamente.'); });
      },

      updateCompra: (id, data) => {
        const { compras, produtos } = get();
        const old = compras.find((c) => c.id === id);
        if (!old) return;
        const prevCompras = compras;
        const prevProdutos = produtos;
        const merged: Compra = { ...old, ...data };
        merged.custoTotal   = merged.quantidadeEntrada * merged.custoUnitario;
        merged.valorParcela = merged.custoTotal / Math.max(1, merged.parcelas);
        if (merged.sku === old.sku) {
          const delta = merged.quantidadeEntrada - old.quantidadeEntrada;
          if (delta !== 0) get().updateEstoque(merged.sku, delta);
        } else {
          get().updateEstoque(old.sku, -old.quantidadeEntrada);
          get().updateEstoque(merged.sku, merged.quantidadeEntrada);
        }
        set((s) => ({ compras: s.compras.map((c) => c.id === id ? merged : c) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbCompras.upsert(merged, uid), 'compra')
          .catch(() => { set({ compras: prevCompras, produtos: prevProdutos }); notifySyncError('Falha ao atualizar compra. Revertendo — tente novamente.'); });
      },

      addAjuste: (a) => {
        const prevAjustes = get().ajustes;
        const prevProdutos = get().produtos;
        set((s) => ({ ajustes: [a, ...s.ajustes] }));
        const uid = get().userId;
        const delta = a.tipo === 'entrada' ? a.quantidade : -a.quantidade;
        if (uid) withRetry(
          () => dbAjustes.insert({ id: a.id, sku: a.sku, delta, motivo: a.motivo, criadoEm: a.criadoEm }, uid),
          'ajuste de estoque'
        ).catch(() => { set({ ajustes: prevAjustes, produtos: prevProdutos }); notifySyncError('Falha ao registrar ajuste. Revertendo — tente novamente.'); });
      },

      addDespesa: (d) => {
        const nova = { ...d, id: crypto.randomUUID() };
        set((s) => ({ despesas: [nova, ...s.despesas] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbDespesas.insert(nova, uid), 'despesa').catch(syncFail('despesa'));
      },
      updateDespesa: (id, data) => {
        set((s) => ({ despesas: s.despesas.map((d) => d.id === id ? { ...d, ...data } : d) }));
        const uid = get().userId;
        const updated = get().despesas.find((d) => d.id === id);
        if (uid && updated) withRetry(() => dbDespesas.upsert(updated, uid), 'despesa').catch(syncFail('despesa'));
      },
      deleteDespesa: (id) => {
        set((s) => ({ despesas: s.despesas.filter((d) => d.id !== id) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbDespesas.delete(id, uid), 'despesa').catch(syncFail('despesa'));
      },

      addTarefa: (t) => {
        set((s) => ({ tarefas: [...s.tarefas, t] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbTarefas.insert(t, uid), 'tarefa').catch(syncFail('tarefa'));
      },
      updateTarefa: (id, data) => {
        set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, ...data } : t)) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbTarefas.update(id, data, uid), 'tarefa').catch(syncFail('tarefa'));
      },
      deleteTarefa: (id) => {
        set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbTarefas.delete(id, uid), 'tarefa').catch(syncFail('tarefa'));
      },
      moveTarefa: (id, coluna) => {
        set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, coluna } : t)) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbTarefas.update(id, { coluna }, uid), 'tarefa').catch(syncFail('tarefa'));
      },

      addHistorico: (h) => {
        set((s) => ({ historico: [...s.historico, h] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbHistorico.upsert(h, uid), 'histórico').catch(syncFail('histórico'));
      },
      updateHistorico: (mesAno, data) => {
        set((s) => ({ historico: s.historico.map((h) => (h.mesAno === mesAno ? { ...h, ...data } : h)) }));
        const uid = get().userId;
        const updated = get().historico.find((h) => h.mesAno === mesAno);
        if (uid && updated) withRetry(() => dbHistorico.upsert(updated, uid), 'histórico').catch(syncFail('histórico'));
      },
      deleteHistorico: (mesAno) => {
        set((s) => ({ historico: s.historico.filter((h) => h.mesAno !== mesAno) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbHistorico.delete(mesAno, uid), 'histórico').catch(syncFail('histórico'));
      },

      updateConfiguracoes: (c) => {
        const next = { ...get().configuracoes, ...c };
        set({ configuracoes: next });
        const uid = get().userId;
        if (uid) withRetry(() => dbConfiguracoes.upsert(next, uid), 'configurações').catch(syncFail('configurações'));
      },
      updateCategoriasDesp: (cats) => set({ categoriasDesp: cats }),

      updateCategoriasProd: (cats) => set({ categoriasProd: cats }),

      savePrecificacao: (p) => set((s) => ({ precificacoesSalvas: [p, ...s.precificacoesSalvas] })),
      deletePrecificacao: (id) => set((s) => ({ precificacoesSalvas: s.precificacoesSalvas.filter((p) => p.id !== id) })),

      setCalculadoraDraft: (d) => set({ calculadoraDraft: d }),
      setOnboardingCompleted: () => set({ onboardingCompleted: true }),
      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.classList.toggle('dark', next);
      },

      setLojaFiltro: (loja) => set({ lojaFiltro: loja }),

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
        }),
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
            categoriasProd: s.categoriasProd ?? ['Perfumaria', 'Moto/Bike', 'Eletrônico', 'Acessórios', 'Kit/Combo'],
            precificacoesSalvas: s.precificacoesSalvas ?? [],
          };
        }
        if (fromVersion === 1) {
          // v1→v2: remover dados operacionais do localStorage (passam a vir só do Supabase)
          return {
            darkMode: s.darkMode ?? false,
            onboardingCompleted: s.onboardingCompleted ?? false,
            calculadoraDraft: s.calculadoraDraft ?? null,
            categoriasDesp: s.categoriasDesp ?? DEFAULT_CATEGORIAS_DESP,
            categoriasProd: s.categoriasProd ?? ['Perfumaria', 'Moto/Bike', 'Eletrônico', 'Acessórios', 'Kit/Combo'],
            precificacoesSalvas: s.precificacoesSalvas ?? [],
          };
        }
        return persisted as AppState;
      },
      // Persistir apenas preferências de UX.
      // Dados operacionais (produtos, pedidos, etc.) vêm exclusivamente do Supabase.
      // categoriasDesp, categoriasProd e precificacoesSalvas são temporários aqui
      // até serem migrados para o Supabase (PLANO_MESTRE item 9).
      partialize: (state) => ({
        darkMode:            state.darkMode,
        onboardingCompleted: state.onboardingCompleted,
        calculadoraDraft:    state.calculadoraDraft,
        categoriasDesp:      state.categoriasDesp,
        categoriasProd:      state.categoriasProd,
        precificacoesSalvas: state.precificacoesSalvas,
        lojaFiltro:          state.lojaFiltro,
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
              notifySyncError('Armazenamento local cheio. Exporte um backup e limpe dados antigos nas Configurações.');
            }
          }
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
);
