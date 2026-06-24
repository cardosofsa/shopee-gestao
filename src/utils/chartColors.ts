/** Paleta canônica de cores para todos os gráficos Recharts do sistema. */
export const C = {
  // Cores semânticas principais
  primary: '#18B37A', // receita, lucro, positivo — core-green
  secondary: '#10b981', // lucro operacional, variante positiva
  blue: '#3b82f6', // comparativo B, projeção, forecast
  orange: '#f97316', // custo, shopee accent
  red: '#ef4444', // negativo, devolução, prejuízo
  amber: '#f59e0b', // atenção, margem baixa, warning
  slate: '#94a3b8', // neutro, comparativo, barra inativa

  // Grid e superfície
  grid: 'rgba(148,163,184,0.15)',
  gridLight: 'rgba(148,163,184,0.08)',
} as const;

/** Sequência de cores para gráficos de múltiplas séries (pie, bar agrupado). */
export const SERIES_COLORS = [
  C.primary,
  C.blue,
  C.orange,
  C.amber,
  C.slate,
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
] as const;

/** Props padrão de CartesianGrid — aplique em todos os BarChart/AreaChart/LineChart. */
export const GRID_PROPS = {
  strokeDasharray: '3 3',
  stroke: C.grid,
  vertical: false,
} as const;

/** Props padrão de eixos cartesianos. */
export const AXIS_PROPS = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: '#94a3b8' },
} as const;
