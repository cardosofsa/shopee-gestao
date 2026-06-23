type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<SpinnerSize, string> = {
  xs: 'w-3 h-3 border',
  sm: 'w-4 h-4 border',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
};

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${SIZES[size]} border-current border-t-transparent rounded-full animate-spin text-core-green ${className}`}
    />
  );
}

export function PageSpinner() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="md" />
        <p className="text-xs text-slate-400">Carregando…</p>
      </div>
    </div>
  );
}
