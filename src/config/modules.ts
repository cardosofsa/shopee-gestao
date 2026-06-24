export type ModuleGroup = 'operacional' | 'financeiro' | 'inteligencia' | 'marketing' | 'gestao';

export type ModuleKey =
  // Operacional
  | 'pedidos'
  | 'estoque'
  | 'compras'
  | 'clientes'
  | 'devolucoes'
  | 'importar'
  | 'ordens_servico'
  // Financeiro
  | 'financeiro'
  | 'dre'
  | 'fluxo_caixa'
  | 'despesas'
  | 'contas_pagar'
  | 'break_even'
  // Inteligência
  | 'analise'
  | 'curva_abc'
  | 'comparativo'
  | 'sazonalidade'
  | 'insights'
  | 'alertas'
  // Marketing
  | 'campanhas'
  | 'ads'
  | 'calculadora'
  | 'precificacao'
  // Gestão
  | 'tarefas'
  | 'calendario'
  | 'metas'
  | 'reposicao'
  | 'fornecedores'
  | 'relatorio'
  | 'exportar';

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  icon: string;
  group: ModuleGroup;
  route: string;
  isCore: boolean;
  requiresPlan?: string[];
}

export const MODULE_CATALOG: ModuleDefinition[] = [
  // ── Operacional ─────────────────────────────────────────────────────────────
  {
    key: 'pedidos',
    label: 'Pedidos',
    description: 'Gestão de ordens de venda',
    icon: 'ShoppingCart',
    group: 'operacional',
    route: '/vendas',
    isCore: false,
  },
  {
    key: 'estoque',
    label: 'Estoque',
    description: 'Posição, compras, movimentações',
    icon: 'Package',
    group: 'operacional',
    route: '/estoque',
    isCore: false,
  },
  {
    key: 'compras',
    label: 'Compras',
    description: 'Entradas de mercadoria (tab do Estoque)',
    icon: 'ShoppingBag',
    group: 'operacional',
    route: '/estoque',
    isCore: false,
  },
  {
    key: 'clientes',
    label: 'Clientes',
    description: 'CRM básico de compradores',
    icon: 'UserRound',
    group: 'operacional',
    route: '/clientes',
    isCore: false,
  },
  {
    key: 'devolucoes',
    label: 'Devoluções',
    description: 'Gestão de retornos',
    icon: 'RotateCcw',
    group: 'operacional',
    route: '/devolucoes',
    isCore: false,
  },
  {
    key: 'importar',
    label: 'Importar',
    description: 'Upload CSV/XLSX',
    icon: 'FileUp',
    group: 'operacional',
    route: '/importar',
    isCore: false,
  },
  {
    key: 'ordens_servico',
    label: 'Ordens de Serviço',
    description: 'OS para assistências e serviços',
    icon: 'ClipboardList',
    group: 'operacional',
    route: '/os',
    isCore: false,
  },

  // ── Financeiro ───────────────────────────────────────────────────────────────
  {
    key: 'financeiro',
    label: 'Financeiro',
    description: 'Histórico mensal, metas financeiras',
    icon: 'TrendingUp',
    group: 'financeiro',
    route: '/financeiro',
    isCore: false,
  },
  {
    key: 'dre',
    label: 'DRE',
    description: 'Demonstrativo de resultado (modal em Financeiro)',
    icon: 'FileBarChart2',
    group: 'financeiro',
    route: '/financeiro',
    isCore: false,
    requiresPlan: ['pro', 'max'],
  },
  {
    key: 'fluxo_caixa',
    label: 'Fluxo de Caixa',
    description: 'Entradas e saídas',
    icon: 'Waves',
    group: 'financeiro',
    route: '/fluxo-caixa',
    isCore: false,
  },
  {
    key: 'despesas',
    label: 'Despesas',
    description: 'Lançamento de custos operacionais',
    icon: 'Receipt',
    group: 'financeiro',
    route: '/despesas',
    isCore: false,
  },
  {
    key: 'contas_pagar',
    label: 'Contas a Pagar',
    description: 'Vencimentos futuros',
    icon: 'CreditCard',
    group: 'financeiro',
    route: '/contas-pagar',
    isCore: false,
  },
  {
    key: 'break_even',
    label: 'Break-Even',
    description: 'Ponto de equilíbrio',
    icon: 'Crosshair',
    group: 'financeiro',
    route: '/break-even',
    isCore: false,
    requiresPlan: ['pro', 'max'],
  },

  // ── Inteligência ─────────────────────────────────────────────────────────────
  {
    key: 'analise',
    label: 'Análise',
    description: 'Análise por período, curva ABC, comparativo, sazonalidade',
    icon: 'CalendarSearch',
    group: 'inteligencia',
    route: '/analise',
    isCore: false,
  },
  {
    key: 'curva_abc',
    label: 'Curva ABC',
    description: 'Pareto de produtos (tab em Análise)',
    icon: 'BarChart2',
    group: 'inteligencia',
    route: '/analise',
    isCore: false,
  },
  {
    key: 'comparativo',
    label: 'Comparativo',
    description: 'Meses vs meses (tab em Análise)',
    icon: 'BarChart3',
    group: 'inteligencia',
    route: '/analise',
    isCore: false,
  },
  {
    key: 'sazonalidade',
    label: 'Sazonalidade',
    description: 'Padrões sazonais (tab em Análise)',
    icon: 'CalendarRange',
    group: 'inteligencia',
    route: '/analise',
    isCore: false,
  },
  {
    key: 'insights',
    label: 'Insights',
    description: 'Análise automática com IA',
    icon: 'Lightbulb',
    group: 'inteligencia',
    route: '/insights',
    isCore: false,
    requiresPlan: ['pro', 'max'],
  },
  {
    key: 'alertas',
    label: 'Alertas',
    description: 'Avisos críticos de estoque e metas',
    icon: 'Bell',
    group: 'inteligencia',
    route: '/alertas',
    isCore: false,
  },

  // ── Marketing ─────────────────────────────────────────────────────────────────
  {
    key: 'campanhas',
    label: 'Campanhas',
    description: 'Gestão de promoções e ACOS',
    icon: 'Megaphone',
    group: 'marketing',
    route: '/campanhas',
    isCore: false,
  },
  {
    key: 'ads',
    label: 'ACOS / Ads',
    description: 'Análise de anúncios (tab em Campanhas)',
    icon: 'Activity',
    group: 'marketing',
    route: '/campanhas',
    isCore: false,
  },
  {
    key: 'calculadora',
    label: 'Calculadora',
    description: 'Precificação e margem',
    icon: 'Calculator',
    group: 'marketing',
    route: '/calculadora',
    isCore: false,
  },
  {
    key: 'precificacao',
    label: 'Precificação',
    description: 'Histórico de preços por SKU',
    icon: 'Tag',
    group: 'marketing',
    route: '/precificacao',
    isCore: false,
  },

  // ── Gestão ───────────────────────────────────────────────────────────────────
  {
    key: 'tarefas',
    label: 'Tarefas',
    description: 'Kanban interno da equipe',
    icon: 'KanbanSquare',
    group: 'gestao',
    route: '/kanban',
    isCore: false,
  },
  {
    key: 'calendario',
    label: 'Calendário',
    description: 'Agenda e eventos',
    icon: 'CalendarDays',
    group: 'gestao',
    route: '/calendario',
    isCore: false,
  },
  {
    key: 'metas',
    label: 'Metas',
    description: 'Objetivos mensais de vendas',
    icon: 'Target',
    group: 'gestao',
    route: '/metas',
    isCore: false,
    requiresPlan: ['pro', 'max'],
  },
  {
    key: 'reposicao',
    label: 'Reposição',
    description: 'Alertas de compra urgente',
    icon: 'RefreshCw',
    group: 'gestao',
    route: '/reposicao',
    isCore: false,
  },
  {
    key: 'fornecedores',
    label: 'Fornecedores',
    description: 'Cadastro de fornecedores',
    icon: 'Truck',
    group: 'gestao',
    route: '/fornecedores',
    isCore: false,
  },
  {
    key: 'relatorio',
    label: 'Relatório',
    description: 'PDF executivo do negócio',
    icon: 'FileText',
    group: 'gestao',
    route: '/relatorio',
    isCore: false,
    requiresPlan: ['pro', 'max'],
  },
  {
    key: 'exportar',
    label: 'Exportar',
    description: 'Backup em XLSX',
    icon: 'Download',
    group: 'gestao',
    route: '/exportar',
    isCore: false,
  },
];

export const MODULE_BY_KEY = Object.fromEntries(MODULE_CATALOG.map((m) => [m.key, m])) as Record<
  ModuleKey,
  ModuleDefinition
>;

export const MODULE_GROUPS: Record<ModuleGroup, ModuleDefinition[]> = {
  operacional: MODULE_CATALOG.filter((m) => m.group === 'operacional'),
  financeiro: MODULE_CATALOG.filter((m) => m.group === 'financeiro'),
  inteligencia: MODULE_CATALOG.filter((m) => m.group === 'inteligencia'),
  marketing: MODULE_CATALOG.filter((m) => m.group === 'marketing'),
  gestao: MODULE_CATALOG.filter((m) => m.group === 'gestao'),
};
