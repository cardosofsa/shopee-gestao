import { X } from 'lucide-react';
import { STATUS_OPTIONS, STATUS_STYLE } from '../types';
import type { Filters } from '../types';

export function FilterPanel({ open, filters, skus, onChange, onClear }: {
  open: boolean;
  filters: Filters;
  skus: string[];
  onChange: (f: Filters) => void;
  onClear: () => void;
}) {
  const tog = <T,>(set: Set<T>, val: T): Set<T> => {
    const n = new Set(set); n.has(val) ? n.delete(val) : n.add(val); return n;
  };

  return (
    <div className={`overflow-hidden transition-all duration-200 ease-in-out ${open ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}>
      <div className="card p-4 mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Período</p>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">De</label>
              <input type="date" className="input text-xs py-1.5" value={filters.dateFrom}
                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400 mb-0.5 block">Até</label>
              <input type="date" className="input text-xs py-1.5" value={filters.dateTo}
                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Status</p>
          <div className="space-y-2">
            {STATUS_OPTIONS.map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#18B37A] w-3.5 h-3.5"
                  checked={filters.statuses.has(s)}
                  onChange={() => onChange({ ...filters, statuses: tog(filters.statuses, s) })} />
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[s].badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[s].dot}`} />{s}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Loja</p>
          <div className="space-y-2">
            {['Cardoso e-Shop', 'Projetando'].map((l) => (
              <label key={l} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#18B37A] w-3.5 h-3.5"
                  checked={filters.lojas.has(l)}
                  onChange={() => onChange({ ...filters, lojas: tog(filters.lojas, l) })} />
                <span className="text-sm text-slate-700 dark:text-slate-300">{l}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">SKU</p>
          <div className="max-h-[130px] overflow-y-auto space-y-2 pr-1">
            {skus.map((k) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[#18B37A] w-3.5 h-3.5"
                  checked={filters.skus.has(k)}
                  onChange={() => onChange({ ...filters, skus: tog(filters.skus, k) })} />
                <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{k}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-2 px-1">
        <button onClick={onClear}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1">
          <X size={11} /> Limpar todos os filtros
        </button>
      </div>
    </div>
  );
}
