import { type CSSProperties } from 'react';

// ─── Base ─────────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      className={`bg-slate-200 dark:bg-slate-700/60 rounded animate-pulse ${className}`}
      style={style}
    />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700/50 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-28 mb-2" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

// ─── Table ────────────────────────────────────────────────────────────────────

export function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-700/50">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1" style={{ opacity: i === 0 ? 0.5 : 0.3 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 px-4 py-3.5 border-b border-slate-50 dark:border-slate-800/60"
          style={{ opacity: 1 - r * 0.07 }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3.5 flex-1"
              style={{ maxWidth: c === 0 ? '80px' : undefined }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Full page ────────────────────────────────────────────────────────────────

export function SkeletonPage({ kpis = 4, rows = 8 }: { kpis?: number; rows?: number }) {
  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-300">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-60" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      </div>

      {/* KPI grid */}
      {kpis > 0 && (
        <div
          className={`grid gap-4 ${kpis === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2 md:grid-cols-3'}`}
        >
          {Array.from({ length: kpis }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Main content block */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-40 rounded-lg" />
        </div>
        <SkeletonTable rows={rows} />
      </div>
    </div>
  );
}

// ─── List items ───────────────────────────────────────────────────────────────

export function SkeletonList({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <Skeleton className="h-10 w-10 rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
