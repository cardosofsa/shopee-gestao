import {
  LayoutDashboard, Sun, ShoppingCart, Package, ShoppingBag,
  UserRound, RotateCcw, FileUp, TrendingUp, FileBarChart2,
  Waves, Receipt, CreditCard, Crosshair, CalendarSearch,
  PieChart, BarChart3, CalendarRange, Lightbulb, Bell,
  Megaphone, Calculator, Tag, KanbanSquare, CalendarDays,
  Target, RefreshCw, Truck, FileText, Download,
  Settings, Sparkles, Users, Telescope, FlaskConical,
  HeartPulse, Activity, Layers,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type NavGroupKey =
  | 'root'
  | 'Operação'
  | 'Financeiro'
  | 'Inteligência'
  | 'Marketing'
  | 'Gestão'
  | 'Administração';

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
  { label: 'Dashboard', to: '/',     icon: LayoutDashboard, group: 'root', end: true, keywords: 'início home' },
  { label: 'Hoje',      to: '/hoje', icon: Sun,             group: 'root', keywords: 'briefing dia resumo diário' },

  // ── Operação ─────────────────────────────────────────────────────────────
  { label: 'Pedidos',     to: '/vendas',     icon: ShoppingCart, group: 'Operação', keywords: 'vendas orders' },
  { label: 'Estoque',     to: '/estoque',    icon: Package,      group: 'Operação', keywords: 'produto sku inventory' },
  { label: 'Compras',     to: '/compras',    icon: ShoppingBag,  group: 'Operação', keywords: 'cmv custo nota entrada' },
  { label: 'Clientes',    to: '/clientes',   icon: UserRound,    group: 'Operação', keywords: 'compradores crm' },
  { label: 'Devoluções',  to: '/devolucoes', icon: RotateCcw,    group: 'Operação', keywords: 'retorno taxa' },
  { label: 'Importar',    to: '/importar',   icon: FileUp,       group: 'Operação', keywords: 'csv xlsx upload' },

  // ── Financeiro ───────────────────────────────────────────────────────────
  { label: 'Financeiro',     to: '/financeiro',   icon: TrendingUp,    group: 'Financeiro', keywords: 'histórico mensal fechar mês pl' },
  { label: 'DRE',            to: '/dre',          icon: FileBarChart2, group: 'Financeiro', keywords: 'resultado demonstrativo' },
  { label: 'Fluxo de Caixa', to: '/fluxo-caixa',  icon: Waves,         group: 'Financeiro', keywords: 'cash flow saldo' },
  { label: 'Despesas',       to: '/despesas',     icon: Receipt,       group: 'Financeiro', keywords: 'custos gastos operacionais' },
  { label: 'Contas a Pagar', to: '/contas-pagar', icon: CreditCard,    group: 'Financeiro', keywords: 'bills vencimento pagamento' },
  { label: 'Break-Even',     to: '/break-even',   icon: Crosshair,     group: 'Financeiro', keywords: 'ponto equilíbrio' },

  // ── Inteligência ─────────────────────────────────────────────────────────
  { label: 'Análise',     to: '/analise',      icon: CalendarSearch, group: 'Inteligência', keywords: 'período data range' },
  { label: 'Curva ABC',   to: '/abc',          icon: PieChart,       group: 'Inteligência', keywords: 'ranking pareto curva' },
  { label: 'Comparativo', to: '/comparativo',  icon: BarChart3,      group: 'Inteligência', keywords: 'meses histórico' },
  { label: 'Sazonalidade',to: '/sazonalidade', icon: CalendarRange,  group: 'Inteligência', keywords: 'sazonal mês dia' },
  { label: 'Insights',    to: '/insights',     icon: Lightbulb,      group: 'Inteligência', keywords: 'análise automática' },
  { label: 'Alertas',     to: '/alertas',      icon: Bell,           group: 'Inteligência', badge: 'alertas', keywords: 'avisos crítico estoque' },

  // ── Marketing ────────────────────────────────────────────────────────────
  { label: 'ACOS / Ads',   to: '/ads',         icon: BarChart3,  group: 'Marketing', keywords: 'acos tacos investimento anúncios retorno marketing' },
  { label: 'Campanhas',    to: '/campanhas',   icon: Megaphone,  group: 'Marketing', keywords: 'promoção desconto' },
  { label: 'Calculadora',  to: '/calculadora', icon: Calculator, group: 'Marketing', keywords: 'calc margem markup preço' },
  { label: 'Precificação', to: '/precificacao',icon: Tag,        group: 'Marketing', keywords: 'preço salvo histórico' },

  // ── Gestão ───────────────────────────────────────────────────────────────
  { label: 'Tarefas',      to: '/kanban',       icon: KanbanSquare, group: 'Gestão', keywords: 'kanban todo list' },
  { label: 'Calendário',   to: '/calendario',   icon: CalendarDays, group: 'Gestão', keywords: 'agenda datas' },
  { label: 'Metas',        to: '/metas',        icon: Target,       group: 'Gestão', keywords: 'objetivo goal' },
  { label: 'Reposição',    to: '/reposicao',    icon: RefreshCw,    group: 'Gestão', keywords: 'comprar repor urgente' },
  { label: 'Fornecedores', to: '/fornecedores', icon: Truck,        group: 'Gestão', keywords: 'supplier vendor' },
  { label: 'Relatório',    to: '/relatorio',    icon: FileText,     group: 'Gestão', keywords: 'imprimir pdf executivo' },
  { label: 'Exportar',     to: '/exportar',     icon: Download,     group: 'Gestão', keywords: 'backup xlsx download' },

  // ── Administração ────────────────────────────────────────────────────────
  { label: 'Configurações', to: '/configs', icon: Settings, group: 'Administração', keywords: 'config das alíquota empresa' },
  { label: 'Planos',        to: '/planos',  icon: Sparkles, group: 'Administração', keywords: 'assinatura upgrade' },
  { label: 'Equipe',        to: '/equipe',  icon: Users,    group: 'Administração', keywords: 'time membros usuários' },

  // ── Command Palette only (sidebar: false) ────────────────────────────────
  { label: 'Metas por Produto', to: '/metas-produto', icon: Target,        group: 'Gestão',        sidebar: false, keywords: 'meta sku mensal progresso' },
  { label: 'Comparativo Anual', to: '/anual',          icon: CalendarRange, group: 'Inteligência',  sidebar: false, keywords: 'ano a ano yoy crescimento' },
  { label: 'Previsão',          to: '/previsao',        icon: Telescope,     group: 'Inteligência',  sidebar: false, keywords: 'forecast projeção tendência' },
  { label: 'Simulador',         to: '/simulador',       icon: FlaskConical,  group: 'Inteligência',  sidebar: false, keywords: 'cenário what-if' },
  { label: 'Saúde do Negócio',  to: '/saude',           icon: HeartPulse,    group: 'Inteligência',  sidebar: false, keywords: 'score saúde radar dimensão' },
  { label: 'Mapa de Calor',     to: '/mapa-calor',      icon: Activity,      group: 'Inteligência',  sidebar: false, keywords: 'heatmap dias semana calor' },
  { label: 'Categorias',        to: '/categorias',      icon: Layers,        group: 'Inteligência',  sidebar: false, keywords: 'categoria rentabilidade grupo' },
];

// Items visible in sidebar (sidebar !== false)
export const SIDEBAR_ITEMS = NAV_ITEMS.filter((i) => i.sidebar !== false);

// Groups for sidebar rendering (empty groups are filtered out)
const GROUP_ORDER: NavGroupKey[] = [
  'root', 'Operação', 'Financeiro', 'Inteligência', 'Marketing', 'Gestão', 'Administração',
];

export const SIDEBAR_GROUPS = GROUP_ORDER.map((key) => ({
  label: key === 'root' ? undefined : key,
  items: SIDEBAR_ITEMS.filter((i) => i.group === key),
})).filter((g) => g.items.length > 0);
