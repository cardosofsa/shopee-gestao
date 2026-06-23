type BadgeVariant =
  | 'success'   // verde — concluído, entrada, positivo
  | 'warning'   // âmbar — atenção, enviado, estoque baixo
  | 'error'     // vermelho — erro, devolvido, ruptura
  | 'info'      // azul — processo, informativo
  | 'neutral'   // cinza — inativo, excesso, genérico
  | 'active';   // core-green — ativo, premium

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  warning: 'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/30  dark:text-amber-300  dark:border-amber-800',
  error:   'bg-red-50    text-red-700    border-red-200    dark:bg-red-900/30    dark:text-red-300    dark:border-red-800',
  info:    'bg-blue-50   text-blue-700   border-blue-200   dark:bg-blue-900/30   dark:text-blue-300   dark:border-blue-800',
  neutral: 'bg-slate-100 text-slate-600  border-slate-200  dark:bg-slate-700     dark:text-slate-300  dark:border-slate-600',
  active:  'bg-core-green/10 text-core-green border-core-green/20',
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ variant = 'neutral', children, className = '', dot = false }: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${VARIANTS[variant]} ${className}`}>
      {dot && (
        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0" />
      )}
      {children}
    </span>
  );
}

// Mapa de status de pedido para variante
export function statusPedidoBadge(status: string): BadgeVariant {
  switch (status) {
    case 'Concluído': return 'success';
    case 'Enviado':   return 'warning';
    case 'Devolvido': return 'error';
    default:          return 'info';
  }
}

// Mapa de status de estoque para variante
export function statusEstoqueBadge(status: string): BadgeVariant {
  switch (status) {
    case 'Estoque Estável': return 'success';
    case 'Estoque Acima':   return 'neutral';
    case 'Estoque Baixo':   return 'warning';
    case 'Comprar':         return 'error';
    default:                return 'neutral';
  }
}
