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

// ─── Seed data ────────────────────────────────────────────────────────────────

export const DEFAULT_CONFIGURACOES: Configuracoes = {
  aliquotaDAS: 0,
  percentualMarketing: 2,
  lojas: ['Minha Loja'],
};

export const DEFAULT_CATEGORIAS_DESP = [
  'Embalagem',
  'Combustível',
  'Insumos',
  'Mercadoria',
  'Marketing',
  'Outro',
];

export const PRODUTOS_SEED: Produto[] = [
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

export const COMPRAS_SEED: Compra[] = [
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

export const TAREFAS_SEED: Tarefa[] = [
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

// ─── AppState ─────────────────────────────────────────────────────────────────

export interface AppState {
  // Operational state (from Supabase)
  produtos: Produto[];
  pedidos: Pedido[];
  compras: Compra[];
  ajustes: AjusteEstoque[];
  despesas: Despesa[];
  tarefas: Tarefa[];
  historico: HistoricoMensal[];
  configuracoes: Configuracoes;
  contasPagar: ContaPagar[];
  fornecedores: Fornecedor[];
  campanhas: Campanha[];
  metasProduto: MetaProduto[];

  // Auth / session
  userId: string | null;
  isHydrated: boolean;
  subscription: Subscription | null;
  organization: Organization | null;
  orgMembers: OrgMember[];

  // UI preferences (persisted in localStorage)
  darkMode: boolean;
  onboardingCompleted: boolean;
  paginasFavoritas: string[];
  lojaFiltro: string | null;
  precificacoesSalvas: PrecificacaoSalva[];
  calculadoraDraft: CalculadoraDraft | null;
  categoriasDesp: string[];
  categoriasProd: string[];
  orcamentosDesp: Record<string, number>;

  // ── Auth actions ────────────────────────────────────────────────────────────
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
  setSubscription: (s: Subscription | null) => void;
  setOrganization: (org: Organization | null) => void;
  setOrgMembers: (members: OrgMember[]) => void;
  loadOrganization: (userId: string) => Promise<void>;
  resetToSeed: () => void;
  resetOperationalData: () => void;
  clearSelectedData: (opts: {
    vendas?: boolean;
    estoque?: boolean;
    financeiro?: boolean;
    tarefas?: boolean;
    campanhas?: boolean;
    metas?: boolean;
  }) => void;

  // ── Pedidos actions ─────────────────────────────────────────────────────────
  addPedido: (p: Pedido) => void;
  addPedidos: (ps: Pedido[]) => void;
  updatePedido: (id: string, updated: Pedido) => void;
  updatePedidoStatus: (id: string, status: Pedido['status']) => void;
  updatePedidosStatus: (ids: string[], status: Pedido['status']) => void;
  deletePedido: (id: string) => void;
  deletePedidos: (ids: string[]) => void;

  // ── Produtos actions ────────────────────────────────────────────────────────
  addProduto: (p: Produto) => void;
  updateProduto: (sku: string, data: Partial<Produto>) => void;
  deleteProduto: (sku: string) => void;
  updateEstoque: (sku: string, delta: number) => void;

  // ── Ajustes actions ─────────────────────────────────────────────────────────
  addAjuste: (a: AjusteEstoque) => void;

  // ── Compras actions ─────────────────────────────────────────────────────────
  addCompra: (c: Compra) => void;
  updateCompra: (id: string, data: Partial<Compra>) => void;
  deleteCompra: (id: string) => void;

  // ── Financeiro actions ──────────────────────────────────────────────────────
  addDespesa: (d: Omit<Despesa, 'id'>) => void;
  updateDespesa: (id: string, data: Partial<Omit<Despesa, 'id' | 'compraRef'>>) => void;
  deleteDespesa: (id: string) => void;
  addHistorico: (h: HistoricoMensal) => void;
  updateHistorico: (mesAno: string, data: Partial<HistoricoMensal>) => void;
  deleteHistorico: (mesAno: string) => void;
  addContaPagar: (c: ContaPagar) => void;
  updateContaPagar: (id: string, data: Partial<ContaPagar>) => void;
  deleteContaPagar: (id: string) => void;
  pagarConta: (id: string, pagoEm?: string) => void;
  addFornecedor: (f: Fornecedor) => void;
  updateFornecedor: (id: string, data: Partial<Fornecedor>) => void;
  deleteFornecedor: (id: string) => void;
  addCampanha: (c: Campanha) => void;
  updateCampanha: (id: string, data: Partial<Campanha>) => void;
  deleteCampanha: (id: string) => void;
  upsertMetaProduto: (m: MetaProduto) => void;
  deleteMetaProduto: (sku: string, mesAno: string) => void;

  // ── Tarefas actions ─────────────────────────────────────────────────────────
  addTarefa: (t: Tarefa) => void;
  updateTarefa: (id: string, data: Partial<Tarefa>) => void;
  deleteTarefa: (id: string) => void;
  moveTarefa: (id: string, coluna: ColunaTarefa) => void;

  // ── UI actions ──────────────────────────────────────────────────────────────
  toggleDarkMode: () => void;
  setOnboardingCompleted: () => void;
  toggleFavorito: (to: string) => void;
  setLojaFiltro: (loja: string | null) => void;
  savePrecificacao: (p: PrecificacaoSalva) => void;
  deletePrecificacao: (id: string) => void;
  setCalculadoraDraft: (d: CalculadoraDraft) => void;
  updateCategoriasDesp: (cats: string[]) => void;
  updateCategoriasProd: (cats: string[]) => void;
  updateConfiguracoes: (c: Partial<Configuracoes>) => void;
  setOrcamentoDesp: (categoria: string, valor: number) => void;
}
