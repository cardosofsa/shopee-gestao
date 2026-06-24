import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-xs mb-5">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight
                size={11}
                className="text-slate-300 dark:text-slate-600 flex-shrink-0"
              />
            )}
            {crumb.to && !isLast ? (
              <Link
                to={crumb.to}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span
                className={
                  isLast
                    ? 'text-slate-700 dark:text-slate-200 font-medium'
                    : 'text-slate-400 dark:text-slate-500'
                }
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
