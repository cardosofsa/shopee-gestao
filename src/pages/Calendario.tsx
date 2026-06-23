import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, KanbanSquare, AlertCircle, Download,
} from 'lucide-react';
import { useStore } from '../store';
import { useToast } from '../components/Toast';
import { downloadICS } from '../lib/gcal';
import type { Tarefa, PrioridadeTarefa } from '../types';

const TODAY = new Date().toISOString().slice(0, 10);
const DIAS  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIOR_CHIP: Record<PrioridadeTarefa, string> = {
  alta:  'bg-red-100    dark:bg-red-900/40    text-red-700    dark:text-red-300',
  media: 'bg-amber-100  dark:bg-amber-900/40  text-amber-700  dark:text-amber-300',
  baixa: 'bg-slate-100  dark:bg-slate-700     text-slate-600  dark:text-slate-300',
};

const PRIOR_DOT: Record<PrioridadeTarefa, string> = {
  alta:  'bg-red-500',
  media: 'bg-amber-500',
  baixa: 'bg-slate-400',
};

function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 2).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
}

// ─── CalendarGrid ─────────────────────────────────────────────────────────────

function CalendarGrid({ tarefas, viewMonth, filterPrior }: {
  tarefas: Tarefa[];
  viewMonth: string;
  filterPrior: 'todas' | PrioridadeTarefa;
}) {
  const [year, m0] = viewMonth.split('-').map(Number);
  const month     = m0 - 1;
  const offset    = new Date(year, month, 1).getDay();
  const days      = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((offset + days) / 7) * 7;

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Tarefa[]>();
    tarefas
      .filter((t) => filterPrior === 'todas' || t.prioridade === filterPrior)
      .forEach((t) => {
        if (!t.dataVencimento) return;
        const list = map.get(t.dataVencimento) ?? [];
        list.push(t);
        map.set(t.dataVencimento, list);
      });
    return map;
  }, [tarefas, filterPrior]);

  return (
    <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
      {DIAS.map((d) => (
        <div key={d} className="bg-slate-50 dark:bg-slate-800 py-2.5 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {d}
        </div>
      ))}

      {Array.from({ length: cellCount }, (_, i) => {
        const day    = i - offset + 1;
        const valid  = day >= 1 && day <= days;
        const date   = valid
          ? `${String(year).padStart(4,'0')}-${String(m0).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          : null;
        const tasks  = date ? (tasksByDate.get(date) ?? []) : [];
        const isToday = date === TODAY;

        return (
          <div key={i} className={`min-h-28 p-2 flex flex-col gap-1 ${valid ? 'bg-white dark:bg-slate-800' : 'bg-slate-50 dark:bg-slate-800/40'}`}>
            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full self-end flex-shrink-0 ${
              isToday ? 'bg-core-green text-white' :
              valid ? 'text-slate-700 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'
            }`}>
              {valid ? day : ''}
            </span>
            {tasks.slice(0, 3).map((t) => (
              <div key={t.id} title={t.titulo}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded truncate ${
                  t.coluna === 'done'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 line-through'
                    : PRIOR_CHIP[t.prioridade]
                }`}>
                {t.titulo}
              </div>
            ))}
            {tasks.length > 3 && (
              <span className="text-[10px] text-slate-400 pl-1">+{tasks.length - 3}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Calendario() {
  const toast   = useToast();
  const tarefas = useStore((s) => s.tarefas);

  const [viewMonth,    setViewMonth]    = useState(() => new Date().toISOString().slice(0, 7));
  const [filterPrior,  setFilterPrior]  = useState<'todas' | PrioridadeTarefa>('todas');

  const prevMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number);
    setViewMonth(new Date(y, m - 2, 1).toISOString().slice(0, 7));
  };
  const nextMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number);
    setViewMonth(new Date(y, m, 1).toISOString().slice(0, 7));
  };

  // KPIs
  const abertas   = tarefas.filter((t) => t.coluna !== 'done');
  const comData   = abertas.filter((t) => !!t.dataVencimento);
  const vencidas  = comData.filter((t) => t.dataVencimento! < TODAY);
  const semData   = abertas.filter((t) => !t.dataVencimento);

  // Agenda: próximos 7 dias
  const limit7d = useMemo(() => {
    return new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  }, []);

  const agenda = useMemo(() =>
    tarefas
      .filter((t) => t.coluna !== 'done' && t.dataVencimento && t.dataVencimento <= limit7d)
      .sort((a, b) => (a.dataVencimento ?? '').localeCompare(b.dataVencimento ?? '')),
    [tarefas, limit7d],
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Calendário</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Tarefas com data de vencimento</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={() => {
              const comData = tarefas.filter((t) => !!t.dataVencimento);
              if (comData.length === 0) { toast('Nenhuma tarefa com data de vencimento para exportar.', 'warning'); return; }
              downloadICS(tarefas);
              toast(`${comData.length} tarefa(s) exportadas como .ICS.`, 'success');
            }}
          >
            <Download size={14} /> Exportar .ICS
          </button>
          <Link to="/kanban" className="btn-secondary text-xs">
            <KanbanSquare size={14} /> Ver Kanban
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Com data',  val: comData.length,  color: 'text-slate-700 dark:text-slate-200' },
          { label: 'Vencidas',  val: vencidas.length, color: vencidas.length > 0 ? 'text-red-500' : 'text-slate-400' },
          { label: 'Sem data',  val: semData.length,  color: 'text-slate-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="card px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
            <span className={`text-sm font-bold ${color}`}>{val}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar panel */}
        <div className="flex-1 card p-5 space-y-4">
          {/* Nav + filtro */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 capitalize min-w-44 text-center">
                {monthLabel(viewMonth)}
              </span>
              <button onClick={nextMonth} className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {([
                { key: 'todas', label: 'Todas' },
                { key: 'alta',  label: 'Alta'  },
                { key: 'media', label: 'Média' },
                { key: 'baixa', label: 'Baixa' },
              ] as const).map((opt) => (
                <button key={opt.key} onClick={() => setFilterPrior(opt.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filterPrior === opt.key
                      ? opt.key === 'alta'  ? 'bg-red-500 text-white'
                      : opt.key === 'media' ? 'bg-amber-500 text-white'
                      : opt.key === 'baixa' ? 'bg-slate-500 text-white'
                      : 'bg-core-green text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <CalendarGrid tarefas={tarefas} viewMonth={viewMonth} filterPrior={filterPrior} />

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            {Object.entries(PRIOR_DOT).map(([k, cls]) => (
              <div key={k} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cls}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                  {k === 'media' ? 'Média' : k.charAt(0).toUpperCase() + k.slice(1)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400">Concluída</span>
            </div>
          </div>
        </div>

        {/* Agenda sidebar */}
        <div className="w-full lg:w-64 card p-5 flex flex-col gap-3 self-start">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Próximos 7 dias</h2>
          {agenda.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">Nenhuma tarefa com vencimento esta semana.</p>
          ) : (
            <div className="space-y-2.5">
              {agenda.map((t) => {
                const vencida = t.dataVencimento! < TODAY;
                const hoje    = t.dataVencimento === TODAY;
                return (
                  <div key={t.id} className="flex items-start gap-2.5">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIOR_DOT[t.prioridade]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-tight truncate">{t.titulo}</p>
                      <p className={`text-[11px] mt-0.5 flex items-center gap-1 ${
                        vencida ? 'text-red-500 font-medium' :
                        hoje    ? 'text-amber-500 font-medium' : 'text-slate-400'
                      }`}>
                        {vencida && <AlertCircle size={10} />}
                        {vencida ? `Venceu · ${t.dataVencimento}` : hoje ? 'Hoje' : t.dataVencimento}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {agenda.length > 0 && (
            <Link to="/kanban" className="text-xs text-core-green hover:text-core-green font-medium mt-1">
              Ver no Kanban →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
