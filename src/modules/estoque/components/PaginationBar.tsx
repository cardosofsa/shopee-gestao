import { ChevronLeft, ChevronRight } from 'lucide-react';

function getPages(cur: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  const lo = Math.max(2, cur - 2),
    hi = Math.min(total - 1, cur + 2);
  if (lo > 2) pages.push('…');
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (hi < total - 1) pages.push('…');
  pages.push(total);
  return pages;
}

export function PaginationBar({
  page,
  total,
  pageSize,
  onPage,
  onPageSize,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (s: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-700 flex-wrap gap-3">
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <span>Por página:</span>
        <select
          className="select w-auto py-1 text-xs"
          value={pageSize}
          onChange={(e) => {
            onPageSize(Number(e.target.value));
            onPage(1);
          }}
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {total === 0
          ? 'Sem resultados'
          : `Mostrando ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          {getPages(page, totalPages).map((pg, i) =>
            pg === '…' ? (
              <span key={`e${i}`} className="px-1 text-slate-400 dark:text-slate-500 text-xs">
                …
              </span>
            ) : (
              <button
                key={pg}
                onClick={() => onPage(pg as number)}
                className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${page === pg ? 'bg-core-green text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                {pg}
              </button>
            )
          )}
          <button
            onClick={() => onPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
