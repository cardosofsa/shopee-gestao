import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Bell,
  Calculator,
  CalendarDays,
  CalendarRange,
  CalendarSearch,
  CreditCard,
  Crosshair,
  Download,
  FileText,
  FileUp,
  FlaskConical,
  HeartPulse,
  KanbanSquare,
  Layers,
  LayoutDashboard,
  Lightbulb,
  Megaphone,
  Package,
  Receipt,
  RefreshCw,
  RotateCcw,
  Settings,
  ShoppingCart,
  Tag,
  Target,
  Telescope,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Waves,
} from 'lucide-react';

export type NavGroupKey =
  | 'root'
  | 'Operação'
  | 'Financeiro'
  | 'Análise'
  | 'Marketing'
  | 'Gestão'
  | 'Dados';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  group: NavGroupKey;
  keywords?: string;
  /** false = Command Palette only, not rendered in sidebar */
  sidebar?: boolean;
  /** true = exact route match (NavLink end prop) */
  end?: boolean;
  /** badge key — resolved dynamically in Layout */
  badge?: 'alertas';
}

export const NAV_ITEMS: NavItem[] = [
  // ── Root ────────────────────────────────────────────────────────────────────
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    group: 'root',
    end: true,
    keywords: 'início home',
  },

  // ── Operação ─────────────────────────────────────────────────────────────
  {
    label: 'Pedidos',
    to: '/vendas',
    icon: ShoppingCart,
    group: 'Operação',
    keywords: 'vendas orders',
  },
  {
    label: 'Estoque',
    to: '/estoque',
    icon: Package,
    group: 'Operação',
    keywords: 'produto sku inventory',
  },
  {
    label: 'Clientes',
    to: '/clientes',
    icon: UserRound,
    group: 'Operação',
    keywords: 'compradores crm',
  },
  {
    label: 'Devoluções',
    to: '/devolucoes',
    icon: RotateCcw,
    group: 'Operação',
    keywords: 'retorno taxa',
  },
  {
    label: 'Reposição',
    to: '/reposicao',
    icon: RefreshCw,
    group: 'Operação',
    keywords: 'comprar repor urgente',
  },

  // ── Financeiro ───────────────────────────────────────────────────────────
  {
    label: 'Financeiro',
    to: '/financeiro',
    icon: TrendingUp,
    group: 'Financeiro',
    keywords: 'histórico mensal fechar mês pl dre',
  },
  {
    label: 'Despesas',
    to: '/despesas',
    icon: Receipt,
    group: 'Financeiro',
    keywords: 'custos gastos operacionais',
  },
  {
    label: 'Fluxo de Caixa',
    to: '/fluxo-caixa',
    icon: Waves,
    group: 'Financeiro',
    keywords: 'cash flow saldo',
  },
  {
    label: 'Contas a Pagar',
    to: '/contas-pagar',
    icon: CreditCard,
    group: 'Financeiro',
    keywords: 'bills vencimento pagamento',
  },
  {
    label: 'Break-Even',
    to: '/break-even',
    icon: Crosshair,
    group: 'Financeiro',
    keywords: 'ponto equilíbrio',
  },

  // ── Marketing ────────────────────────────────────────────────────────────
  {
    label: 'Campanhas',
    to: '/campanhas',
    icon: Megaphone,
    group: 'Marketing',
    keywords: 'promoção desconto ads acos',
  },
  {
    label: 'Precificação',
    to: '/precificacao',
    icon: Tag,
    group: 'Marketing',
    keywords: 'preço salvo histórico',
  },
  {
    label: 'Calculadora',
    to: '/calculadora',
    icon: Calculator,
    group: 'Marketing',
    keywords: 'calc margem markup preço',
  },

  // ── Análise ──────────────────────────────────────────────────────────────
  {
    label: 'Análise',
    to: '/analise',
    icon: CalendarSearch,
    group: 'Análise',
    keywords: 'período data range abc comparativo sazonalidade',
  },
  {
    label: 'Insights',
    to: '/insights',
    icon: Lightbulb,
    group: 'Análise',
    keywords: 'análise automática inteligência',
  },
  {
    label: 'Alertas',
    to: '/alertas',
    icon: Bell,
    group: 'Análise',
    badge: 'alertas',
    keywords: 'avisos crítico estoque',
  },

  // ── Gestão ───────────────────────────────────────────────────────────────
  {
    label: 'Metas',
    to: '/metas',
    icon: Target,
    group: 'Gestão',
    keywords: 'objetivo goal',
  },
  {
    label: 'Tarefas',
    to: '/kanban',
    icon: KanbanSquare,
    group: 'Gestão',
    keywords: 'kanban todo list',
  },
  {
    label: 'Calendário',
    to: '/calendario',
    icon: CalendarDays,
    group: 'Gestão',
    keywords: 'agenda datas',
  },
  {
    label: 'Fornecedores',
    to: '/fornecedores',
    icon: Truck,
    group: 'Gestão',
    keywords: 'supplier vendor',
  },
  {
    label: 'Equipe',
    to: '/equipe',
    icon: Users,
    group: 'Gestão',
    keywords: 'time membros usuários',
  },

  // ── Dados ─────────────────────────────────────────────────────────────────
  {
    label: 'Importar',
    to: '/importar',
    icon: FileUp,
    group: 'Dados',
    keywords: 'csv xlsx upload',
  },
  {
    label: 'Exportar',
    to: '/exportar',
    icon: Download,
    group: 'Dados',
    keywords: 'backup xlsx download',
  },
  {
    label: 'Relatório',
    to: '/relatorio',
    icon: FileText,
    group: 'Dados',
    keywords: 'imprimir pdf executivo',
  },

  // ── Command Palette only (sidebar: false) ────────────────────────────────
  {
    label: 'Configurações',
    to: '/configs',
    icon: Settings,
    group: 'Dados',
    sidebar: false,
    keywords: 'config das alíquota empresa configurações',
  },
  {
    label: 'Metas por Produto',
    to: '/metas-produto',
    icon: Target,
    group: 'Gestão',
    sidebar: false,
    keywords: 'meta sku mensal progresso',
  },
  {
    label: 'Comparativo Anual',
    to: '/anual',
    icon: CalendarRange,
    group: 'Análise',
    sidebar: false,
    keywords: 'ano a ano yoy crescimento',
  },
  {
    label: 'Previsão',
    to: '/previsao',
    icon: Telescope,
    group: 'Análise',
    sidebar: false,
    keywords: 'forecast projeção tendência',
  },
  {
    label: 'Simulador',
    to: '/simulador',
    icon: FlaskConical,
    group: 'Análise',
    sidebar: false,
    keywords: 'cenário what-if',
  },
  {
    label: 'Saúde do Negócio',
    to: '/saude',
    icon: HeartPulse,
    group: 'Análise',
    sidebar: false,
    keywords: 'score saúde radar dimensão',
  },
  {
    label: 'Mapa de Calor',
    to: '/mapa-calor',
    icon: Activity,
    group: 'Análise',
    sidebar: false,
    keywords: 'heatmap dias semana calor',
  },
  {
    label: 'Categorias',
    to: '/categorias',
    icon: Layers,
    group: 'Análise',
    sidebar: false,
    keywords: 'categoria rentabilidade grupo',
  },
];

// Items visible in sidebar (sidebar !== false)
export const SIDEBAR_ITEMS = NAV_ITEMS.filter((i) => i.sidebar !== false);

// Groups for sidebar rendering (empty groups are filtered out)
const GROUP_ORDER: NavGroupKey[] = [
  'root',
  'Operação',
  'Financeiro',
  'Marketing',
  'Análise',
  'Gestão',
  'Dados',
];

export const SIDEBAR_GROUPS = GROUP_ORDER.map((key) => ({
  label: key === 'root' ? undefined : key,
  items: SIDEBAR_ITEMS.filter((i) => i.group === key),
})).filter((g) => g.items.length > 0);
