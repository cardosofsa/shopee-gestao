import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  dbAjustes,
  dbCampanhas,
  dbCompras,
  dbConfiguracoes,
  dbContasPagar,
  dbDespesas,
  dbFornecedores,
  dbHistorico,
  dbMetasProduto,
  dbOrganizations,
  dbOrgMembers,
  dbPedidos,
  dbProdutos,
  dbSubscriptions,
  dbTarefas,
  loadUserData,
  seedUserData,
} from '../lib/db';
import { notifyLimitReached, notifySyncError, withRetry } from '../lib/sync';
import type {
  AjusteEstoque,
  CalculadoraDraft,
  Campanha,
  ColunaTarefa,
  Compra,
  Configuracoes,
  ContaPagar,
  Despesa,
  Fornecedor,
  HistoricoMensal,
  MetaProduto,
  Organization,
  OrgMember,
  Pedido,
  PrecificacaoSalva,
  Produto,
  Subscription,
  Tarefa,
} from '../types';

function syncFail(label: string) {
  return (err: unknown) => {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido';
    notifySyncError(`Falha ao salvar ${label}: ${msg}`);
  };
}

const DEFAULT_CONFIGURACOES: Configuracoes = {
  aliquotaDAS: 0,
  percentualMarketing: 2,
  lojas: ['Minha Loja'],
};

const PRODUTOS_SEED: Produto[] = [
  {
    sku: 'PROD-001',
    nome: 'Produto Exemplo A',
    categoria: 'Categoria 1',
    loja: 'Ambas',
    custoUnitario: 10.0,
    estoqueSeguranca: 20,
    estoqueAtual: 50,
    ativo: true,
  },
  {
    sku: 'PROD-002',
    nome: 'Produto Exemplo B',
    categoria: 'Categoria 1',
    loja: 'Ambas',
    custoUnitario: 25.0,
    estoqueSeguranca: 10,
    estoqueAtual: 30,
    ativo: true,
  },
  {
    sku: 'PROD-003',
    nome: 'Produto Exemplo C',
    categoria: 'Categoria 2',
    loja: 'Ambas',
    custoUnitario: 8.0,
    estoqueSeguranca: 15,
    estoqueAtual: 0,
    ativo: true,
  },
  {
    sku: 'KIT-001',
    nome: 'Kit Exemplo (A + B)',
    categoria: 'Kit/Combo',
    loja: 'Ambas',
    custoUnitario: 33.0,
    estoqueSeguranca: 5,
    estoqueAtual: 10,
    ativo: true,
  },
];

const COMPRAS_SEED: Compra[] = [
  {
    id: 'seed-c1',
    sku: 'PROD-001',
    produto: 'Produto Exemplo A',
    data: new Date().toISOString().slice(0, 10),
    quantidadeEntrada: 50,
    custoUnitario: 10.0,
    custoTotal: 500.0,
    fornecedor: 'Fornecedor Demo',
    nfRef: '',
    pagamento: 'Pix',
    parcelas: 1,
    valorParcela: 500.0,
    loja: 'Minha Loja',
    observacoes: '',
  },
  {
    id: 'seed-c2',
    sku: 'PROD-002',
    produto: 'Produto Exemplo B',
    data: new Date().toISOString().slice(0, 10),
    quantidadeEntrada: 30,
    custoUnitario: 25.0,
    custoTotal: 750.0,
    fornecedor: 'Fornecedor Demo',
    nfRef: '',
    pagamento: 'Pix',
    parcelas: 1,
    valorParcela: 750.0,
    loja: 'Minha Loja',
    observacoes: '',
  },
];

const TAREFAS_SEED: Tarefa[] = [
  {
    id: 'seed-t1',
    titulo: 'Embalar pedidos do dia',
    descricao: 'Separar e embalar pedidos com status Enviado',
    coluna: 'todo',
    posicao: 0,
    prioridade: 'alta',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'seed-t2',
    titulo: 'Verificar estoque mínimo',
    descricao: 'Conferir produtos abaixo do ponto de reposição',
    coluna: 'todo',
    posicao: 1,
    prioridade: 'media',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'seed-t3',
    titulo: 'Atualizar fotos dos anúncios',
    descricao: 'Melhorar imagens dos produtos principais',
    coluna: 'in_progress',
    posicao: 0,
    prioridade: 'media',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'seed-t4',
    titulo: 'Cadastrar produtos iniciais',
    descricao: 'Importar catálogo de produtos no sistema',
    coluna: 'done',
    posicao: 0,
    prioridade: 'alta',
    criadoEm: new Date().toISOString(),
  },
];

const DEFAULT_CATEGORIAS_DESP = [
  'Embalagem',
  'Combustível',
  'Insumos',
  'Mercadoria',
  'Marketing',
  'Outro',
];

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
  hydrate: (data: {
    produtos: Produto[];
    pedidos: Pedido[];
    compras: Compra[];
    despesas: Despesa[];
    tarefas: Tarefa[];
    historico: HistoricoMensal[];
    configuracoes: Configuracoes | null;
    contasPagar?: ContaPagar[];
    fornecedores?: Fornecedor[];
    campanhas?: Campanha[];
    metasProduto?: MetaProduto[];
  }) => void;
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

  // UX: páginas favoritas (persistidas)
  paginasFavoritas: string[];
  toggleFavorito: (to: string) => void;

  // Filtro global de loja
  lojaFiltro: string | null;
  setLojaFiltro: (loja: string | null) => void;

  // Plano / Subscription
  subscription: Subscription | null;
  setSubscription: (s: Subscription | null) => void;

  // CoWork
  organization: Organization | null;
  orgMembers: OrgMember[];
  setOrganization: (org: Organization | null) => void;
  setOrgMembers: (members: OrgMember[]) => void;
  loadOrganization: (userId: string) => Promise<void>;

  // Orçamentos por categoria de despesa
  orcamentosDesp: Record<string, number>;
  setOrcamentoDesp: (categoria: string, valor: number) => void;

  // Actions - Contas a Pagar
  contasPagar: ContaPagar[];
  addContaPagar: (c: ContaPagar) => void;
  updateContaPagar: (id: string, data: Partial<ContaPagar>) => void;
  deleteContaPagar: (id: string) => void;
  pagarConta: (id: string, pagoEm?: string) => void;

  // Actions - Fornecedores
  fornecedores: Fornecedor[];
  addFornecedor: (f: Fornecedor) => void;
  updateFornecedor: (id: string, data: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;

  // Actions - Campanhas
  campanhas: Campanha[];
  addCampanha: (c: Campanha) => void;
  updateCampanha: (id: string, data: Partial<Campanha>) => void;
  deleteCampanha: (id: string) => void;

  // Metas por produto
  metasProduto: MetaProduto[];
  upsertMetaProduto: (m: MetaProduto) => void;
  deleteMetaProduto: (sku: string, mesAno: string) => void;

  // Seed
  resetToSeed: () => void;

  // Logout cleanup
  resetOperationalData: () => void;

  // Selective data clear
  clearSelectedData: (opts: {
    vendas?: boolean;
    estoque?: boolean;
    financeiro?: boolean;
    tarefas?: boolean;
    campanhas?: boolean;
    metas?: boolean;
  }) => void;
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
      paginasFavoritas: [],
      lojaFiltro: null,
      subscription: null,
      organization: null,
      orgMembers: [],
      darkMode: false,
      orcamentosDesp: {},
      contasPagar: [],
      fornecedores: [],
      campanhas: [],
      metasProduto: [],

      setUserId: (id) => set({ userId: id }),

      hydrate: (data) =>
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

      loadAndHydrate: async (userId) => {
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

      addPedido: (p) => {
        const sub = get().subscription;
        if (sub?.plan.limitePedidosMes) {
          const mes = new Date().toISOString().slice(0, 7);
          const count = get().pedidos.filter((x) => x.data.startsWith(mes)).length;
          const limit = sub.plan.limitePedidosMes;
          if (count >= limit) {
            notifyLimitReached(
              `Limite de ${limit} pedidos/mês atingido. Faça upgrade para continuar.`,
              'error',
              true
            );
            return;
          }
          if (count >= Math.floor(limit * 0.8)) {
            notifyLimitReached(
              `${count} de ${limit} pedidos usados este mês (${Math.round((count / limit) * 100)}%). Considere fazer upgrade.`,
              'warning',
              true
            );
          }
        }
        const prev = get().pedidos;
        set((s) => ({ pedidos: [p, ...s.pedidos] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbPedidos.upsert(p, uid), 'pedido').catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.');
          });
      },
      addPedidos: (ps) => {
        const prev = get().pedidos;
        set((s) => ({ pedidos: [...ps, ...s.pedidos] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbPedidos.upsertMany(ps, uid), 'pedidos').catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao importar pedidos. Revertendo — tente novamente.');
          });
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
          if ((next === 'Enviado' || next === 'Concluído') && prev === 'Em processo')
            get().updateEstoque(updated.sku, -u);
          if (next === 'Devolvido' && (prev === 'Enviado' || prev === 'Concluído'))
            get().updateEstoque(updated.sku, u);
        }
        set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? updated : p)) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbPedidos.upsert(updated, uid), 'pedido').catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao salvar pedido. Revertendo — tente novamente.');
          });
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
          if ((status === 'Enviado' || status === 'Concluído') && prevStatus === 'Em processo')
            get().updateEstoque(pedido.sku, -unidades);
          if (status === 'Devolvido' && (prevStatus === 'Enviado' || prevStatus === 'Concluído'))
            get().updateEstoque(pedido.sku, unidades);
        }
        set((s) => ({ pedidos: s.pedidos.map((p) => (p.id === id ? { ...p, status } : p)) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbPedidos.updateStatus(id, status, uid), 'status do pedido').catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao atualizar status. Revertendo — tente novamente.');
          });
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
          pedidos: s.pedidos.map((p) => (idsSet.has(p.id) ? { ...p, status } : p)),
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
              return prod
                ? withRetry(() => dbProdutos.updateEstoque(sku, prod.estoqueAtual, uid), 'estoque')
                : Promise.resolve();
            }),
          ]).catch(() => {
            set({ pedidos: prevPedidos, produtos: prevProdutos });
            notifySyncError('Falha ao atualizar status em lote. Revertendo — tente novamente.');
          });
        }
      },
      deletePedido: (id) => {
        const prev = get().pedidos;
        set((s) => ({ pedidos: s.pedidos.filter((p) => p.id !== id) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbPedidos.delete(id, uid), 'pedido').catch(() => {
            set({ pedidos: prev });
            notifySyncError('Falha ao excluir pedido. Revertendo — tente novamente.');
          });
      },
      deletePedidos: (ids) => {
        const prev = get().pedidos;
        const idsSet = new Set(ids);
        set((s) => ({ pedidos: s.pedidos.filter((p) => !idsSet.has(p.id)) }));
        const uid = get().userId;
        if (uid)
          Promise.all(ids.map((id) => withRetry(() => dbPedidos.delete(id, uid), 'pedido'))).catch(
            () => {
              set({ pedidos: prev });
              notifySyncError('Falha ao excluir pedidos. Revertendo — tente novamente.');
            }
          );
      },

      addProduto: (p) => {
        const sub = get().subscription;
        if (sub?.plan.limiteSKUs) {
          const count = get().produtos.length;
          const limit = sub.plan.limiteSKUs;
          if (count >= limit) {
            notifyLimitReached(
              `Limite de ${limit} SKUs atingido. Faça upgrade para adicionar mais produtos.`,
              'error',
              true
            );
            return;
          }
          if (count >= Math.floor(limit * 0.8)) {
            notifyLimitReached(
              `${count} de ${limit} SKUs cadastrados (${Math.round((count / limit) * 100)}%). Considere fazer upgrade.`,
              'warning',
              true
            );
          }
        }
        set((s) => ({ produtos: [...s.produtos, p] }));
        const uid = get().userId;
        if (uid) withRetry(() => dbProdutos.upsert(p, uid), 'produto').catch(syncFail('produto'));
      },
      updateProduto: (sku, data) => {
        set((s) => ({ produtos: s.produtos.map((p) => (p.sku === sku ? { ...p, ...data } : p)) }));
        const uid = get().userId;
        const updated = get().produtos.find((p) => p.sku === sku);
        if (uid && updated)
          withRetry(() => dbProdutos.upsert(updated, uid), 'produto').catch(syncFail('produto'));
      },
      deleteProduto: (sku) => {
        const { pedidos, compras } = get();
        const pedidosIds = pedidos.filter((p) => p.sku === sku).map((p) => p.id);
        const comprasIds = compras.filter((c) => c.sku === sku).map((c) => c.id);
        set((s) => ({
          produtos: s.produtos.filter((p) => p.sku !== sku),
          pedidos: s.pedidos.filter((p) => p.sku !== sku),
          compras: s.compras.filter((c) => c.sku !== sku),
        }));
        const uid = get().userId;
        if (uid) {
          const ops: Promise<void>[] = [
            withRetry(() => dbProdutos.delete(sku, uid), 'produto'),
            ...pedidosIds.map((id) => withRetry(() => dbPedidos.delete(id, uid), 'pedido')),
            ...comprasIds.map((id) => withRetry(() => dbCompras.delete(id, uid), 'compra')),
          ];
          Promise.all(ops).catch(syncFail('produto'));
        }
      },
      updateEstoque: (sku, delta) => {
        const cur = get().produtos.find((p) => p.sku === sku);
        const newVal = Math.max(0, (cur?.estoqueAtual ?? 0) + delta);
        set((s) => ({
          produtos: s.produtos.map((p) => (p.sku === sku ? { ...p, estoqueAtual: newVal } : p)),
        }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbProdutos.updateEstoque(sku, newVal, uid), 'estoque').catch(
            syncFail('estoque')
          );
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
        if (uid)
          Promise.all([
            withRetry(() => dbCompras.insert(c, uid), 'compra'),
            withRetry(() => dbDespesas.insert(despesa, uid), 'despesa de compra'),
          ]).catch(() => {
            set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos });
            notifySyncError('Falha ao registrar compra. Revertendo — tente novamente.');
          });
      },
      deleteCompra: (id) => {
        const { compras, despesas, produtos } = get();
        const prevCompras = compras;
        const prevDespesas = despesas;
        const prevProdutos = produtos;
        const compra = compras.find((c) => c.id === id);
        if (compra) get().updateEstoque(compra.sku, -compra.quantidadeEntrada);
        set((s) => ({
          compras: s.compras.filter((c) => c.id !== id),
          despesas: s.despesas.filter((d) => d.compraRef !== id),
        }));
        const uid = get().userId;
        if (uid)
          Promise.all([
            withRetry(() => dbCompras.delete(id, uid), 'compra'),
            withRetry(() => dbDespesas.deleteByCompraRef(id, uid), 'despesa'),
          ]).catch(() => {
            set({ compras: prevCompras, despesas: prevDespesas, produtos: prevProdutos });
            notifySyncError('Falha ao excluir compra. Revertendo — tente novamente.');
          });
      },

      updateCompra: (id, data) => {
        const { compras, produtos } = get();
        const old = compras.find((c) => c.id === id);
        if (!old) return;
        const prevCompras = compras;
        const prevProdutos = produtos;
        const merged: Compra = { ...old, ...data };
        merged.custoTotal = merged.quantidadeEntrada * merged.custoUnitario;
        merged.valorParcela = merged.custoTotal / Math.max(1, merged.parcelas);
        if (merged.sku === old.sku) {
          const delta = merged.quantidadeEntrada - old.quantidadeEntrada;
          if (delta !== 0) get().updateEstoque(merged.sku, delta);
        } else {
          get().updateEstoque(old.sku, -old.quantidadeEntrada);
          get().updateEstoque(merged.sku, merged.quantidadeEntrada);
        }
        set((s) => ({ compras: s.compras.map((c) => (c.id === id ? merged : c)) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbCompras.upsert(merged, uid), 'compra').catch(() => {
            set({ compras: prevCompras, produtos: prevProdutos });
            notifySyncError('Falha ao atualizar compra. Revertendo — tente novamente.');
          });
      },

      addAjuste: (a) => {
        const prevAjustes = get().ajustes;
        const prevProdutos = get().produtos;
        const delta = a.tipo === 'entrada' ? a.quantidade : -a.quantidade;
        set((s) => ({ ajustes: [a, ...s.ajustes] }));
        get().updateEstoque(a.sku, delta);
        const uid = get().userId;
        if (uid)
          withRetry(
            () =>
              dbAjustes.insert(
                { id: a.id, sku: a.sku, delta, motivo: a.motivo, criadoEm: a.criadoEm },
                uid
              ),
            'ajuste de estoque'
          ).catch(() => {
            set({ ajustes: prevAjustes, produtos: prevProdutos });
            notifySyncError('Falha ao registrar ajuste. Revertendo — tente novamente.');
          });
      },

      addDespesa: (d) => {
        const nova = { ...d, id: crypto.randomUUID() };
        set((s) => ({ despesas: [nova, ...s.despesas] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbDespesas.insert(nova, uid), 'despesa').catch(syncFail('despesa'));
      },
      updateDespesa: (id, data) => {
        set((s) => ({ despesas: s.despesas.map((d) => (d.id === id ? { ...d, ...data } : d)) }));
        const uid = get().userId;
        const updated = get().despesas.find((d) => d.id === id);
        if (uid && updated)
          withRetry(() => dbDespesas.upsert(updated, uid), 'despesa').catch(syncFail('despesa'));
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
        if (uid)
          withRetry(() => dbTarefas.update(id, data, uid), 'tarefa').catch(syncFail('tarefa'));
      },
      deleteTarefa: (id) => {
        set((s) => ({ tarefas: s.tarefas.filter((t) => t.id !== id) }));
        const uid = get().userId;
        if (uid) withRetry(() => dbTarefas.delete(id, uid), 'tarefa').catch(syncFail('tarefa'));
      },
      moveTarefa: (id, coluna) => {
        set((s) => ({ tarefas: s.tarefas.map((t) => (t.id === id ? { ...t, coluna } : t)) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbTarefas.update(id, { coluna }, uid), 'tarefa').catch(
            syncFail('tarefa')
          );
      },

      addHistorico: (h) => {
        set((s) => ({ historico: [...s.historico, h] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbHistorico.upsert(h, uid), 'histórico').catch(syncFail('histórico'));
      },
      updateHistorico: (mesAno, data) => {
        set((s) => ({
          historico: s.historico.map((h) => (h.mesAno === mesAno ? { ...h, ...data } : h)),
        }));
        const uid = get().userId;
        const updated = get().historico.find((h) => h.mesAno === mesAno);
        if (uid && updated)
          withRetry(() => dbHistorico.upsert(updated, uid), 'histórico').catch(
            syncFail('histórico')
          );
      },
      deleteHistorico: (mesAno) => {
        set((s) => ({ historico: s.historico.filter((h) => h.mesAno !== mesAno) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbHistorico.delete(mesAno, uid), 'histórico').catch(
            syncFail('histórico')
          );
      },

      updateConfiguracoes: (c) => {
        const next = { ...get().configuracoes, ...c };
        set({ configuracoes: next });
        const uid = get().userId;
        if (uid)
          withRetry(() => dbConfiguracoes.upsert(next, uid), 'configurações').catch(
            syncFail('configurações')
          );
      },
      updateCategoriasDesp: (cats) => set({ categoriasDesp: cats }),

      updateCategoriasProd: (cats) => set({ categoriasProd: cats }),

      savePrecificacao: (p) => set((s) => ({ precificacoesSalvas: [p, ...s.precificacoesSalvas] })),
      deletePrecificacao: (id) =>
        set((s) => ({ precificacoesSalvas: s.precificacoesSalvas.filter((p) => p.id !== id) })),

      setCalculadoraDraft: (d) => set({ calculadoraDraft: d }),
      setOnboardingCompleted: () => set({ onboardingCompleted: true }),

      toggleFavorito: (to) =>
        set((s) => ({
          paginasFavoritas: s.paginasFavoritas.includes(to)
            ? s.paginasFavoritas.filter((p) => p !== to)
            : [...s.paginasFavoritas, to],
        })),

      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        document.documentElement.classList.toggle('dark', next);
      },

      setLojaFiltro: (loja) => set({ lojaFiltro: loja }),

      setSubscription: (s) => set({ subscription: s }),

      setOrganization: (org) => set({ organization: org }),
      setOrgMembers: (members) => set({ orgMembers: members }),
      loadOrganization: async (userId) => {
        const [owned, member] = await Promise.all([
          dbOrganizations.getOwned(userId),
          dbOrganizations.getMembership(userId),
        ]);
        const org = owned ?? member;
        let members: OrgMember[] = [];
        if (org) members = await dbOrgMembers.getByOrg(org.id).catch(() => []);
        set({ organization: org, orgMembers: members });
      },

      setOrcamentoDesp: (categoria, valor) =>
        set((s) => ({ orcamentosDesp: { ...s.orcamentosDesp, [categoria]: valor } })),

      addContaPagar: (c) => {
        set((s) => ({ contasPagar: [...s.contasPagar, c] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbContasPagar.upsert(c, uid), 'conta a pagar').catch(
            syncFail('conta a pagar')
          );
      },
      updateContaPagar: (id, data) => {
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
      deleteContaPagar: (id) => {
        set((s) => ({ contasPagar: s.contasPagar.filter((c) => c.id !== id) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbContasPagar.delete(id, uid), 'conta a pagar').catch(
            syncFail('conta a pagar')
          );
      },
      pagarConta: (id, pagoEm) => {
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

      addFornecedor: (f) => {
        set((s) => ({ fornecedores: [...s.fornecedores, f] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbFornecedores.upsert(f, uid), 'fornecedor').catch(
            syncFail('fornecedor')
          );
      },
      updateFornecedor: (id, data) => {
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
      deleteFornecedor: (id) => {
        set((s) => ({ fornecedores: s.fornecedores.filter((f) => f.id !== id) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbFornecedores.delete(id, uid), 'fornecedor').catch(
            syncFail('fornecedor')
          );
      },

      addCampanha: (c) => {
        set((s) => ({ campanhas: [...s.campanhas, c] }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbCampanhas.upsert(c, uid), 'campanha').catch(syncFail('campanha'));
      },
      updateCampanha: (id, data) => {
        set((s) => ({ campanhas: s.campanhas.map((c) => (c.id === id ? { ...c, ...data } : c)) }));
        const uid = get().userId;
        const updated = get().campanhas.find((c) => c.id === id);
        if (uid && updated)
          withRetry(() => dbCampanhas.upsert(updated, uid), 'campanha').catch(syncFail('campanha'));
      },
      deleteCampanha: (id) => {
        set((s) => ({ campanhas: s.campanhas.filter((c) => c.id !== id) }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbCampanhas.delete(id, uid), 'campanha').catch(syncFail('campanha'));
      },

      upsertMetaProduto: (m) => {
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
      deleteMetaProduto: (sku, mesAno) => {
        set((s) => ({
          metasProduto: s.metasProduto.filter((x) => !(x.sku === sku && x.mesAno === mesAno)),
        }));
        const uid = get().userId;
        if (uid)
          withRetry(() => dbMetasProduto.delete(sku, mesAno, uid), 'meta de produto').catch(
            syncFail('meta de produto')
          );
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

      clearSelectedData: (opts) =>
        set({
          ...(opts.vendas ? { pedidos: [] } : {}),
          ...(opts.estoque ? { produtos: [], compras: [], ajustes: [] } : {}),
          ...(opts.financeiro ? { despesas: [], contasPagar: [], historico: [] } : {}),
          ...(opts.tarefas ? { tarefas: [] } : {}),
          ...(opts.campanhas ? { campanhas: [] } : {}),
          ...(opts.metas ? { metasProduto: [], fornecedores: [] } : {}),
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
          // v1→v2: remover dados operacionais do localStorage (passam a vir só do Supabase)
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
      // Persistir apenas preferências de UX.
      // Dados operacionais (produtos, pedidos, etc.) vêm exclusivamente do Supabase.
      // categoriasDesp, categoriasProd e precificacoesSalvas são temporários aqui
      // até serem migrados para o Supabase (PLANO_MESTRE item 9).
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
