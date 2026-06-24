import type { DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertCircle,
  Calendar,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Flag,
  GripVertical,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { useToast } from '../components/Toast';
import { useStore } from '../store';
import type { ColunaTarefa, PrioridadeTarefa, Tarefa } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

const COLUNAS: { id: ColunaTarefa; label: string; color: string; accent: string }[] = [
  {
    id: 'todo',
    label: 'A Fazer',
    color: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    accent: 'border-slate-300 dark:border-slate-600',
  },
  {
    id: 'in_progress',
    label: 'Em Andamento',
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    accent: 'border-amber-300 dark:border-amber-800',
  },
  {
    id: 'done',
    label: 'Concluído',
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    accent: 'border-emerald-300 dark:border-emerald-800',
  },
];

const PRIOR_STYLE: Record<PrioridadeTarefa, { text: string; label: string }> = {
  alta: { text: 'text-red-500', label: 'Alta' },
  media: { text: 'text-amber-500', label: 'Média' },
  baixa: { text: 'text-slate-400', label: 'Baixa' },
};

// ─── VencimentoBadge ──────────────────────────────────────────────────────────

function VencimentoBadge({ data, isDone }: { data: string; isDone: boolean }) {
  if (isDone) return null;
  const vencida = data < TODAY;
  const hoje = data === TODAY;
  if (vencida)
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-red-500">
        <AlertCircle size={9} /> Vencida · {data}
      </span>
    );
  if (hoje)
    return (
      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-500">
        <Calendar size={9} /> Hoje
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] text-slate-400">
      <Calendar size={9} /> {data}
    </span>
  );
}

// ─── TarefaCard ───────────────────────────────────────────────────────────────

function TarefaCard({ tarefa, colIndex }: { tarefa: Tarefa; colIndex: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
  });
  const deleteTarefa = useStore((s) => s.deleteTarefa);
  const moveTarefa = useStore((s) => s.moveTarefa);
  const updateTarefa = useStore((s) => s.updateTarefa);
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tarefa.titulo);
  const [editDesc, setEditDesc] = useState(tarefa.descricao);
  const [editPrioridade, setEditPrioridade] = useState<PrioridadeTarefa>(tarefa.prioridade);
  const [editData, setEditData] = useState(tarefa.dataVencimento ?? '');

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveEdit = () => {
    updateTarefa(tarefa.id, {
      titulo: editTitle.trim() || tarefa.titulo,
      descricao: editDesc,
      prioridade: editPrioridade,
      dataVencimento: editData || undefined,
    });
    setEditing(false);
  };

  const isDone = tarefa.coluna === 'done';
  const isVencida = !isDone && !!tarefa.dataVencimento && tarefa.dataVencimento < TODAY;

  if (editing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-white dark:bg-slate-800 rounded-xl border-2 border-core-green/30 p-3 shadow-sm space-y-2"
      >
        <input
          className="input text-sm"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
        />
        <textarea
          className="input text-xs resize-none"
          rows={2}
          placeholder="Descrição (opcional)"
          value={editDesc}
          onChange={(e) => setEditDesc(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">
              Prioridade
            </label>
            <select
              className="select text-xs py-1.5"
              value={editPrioridade}
              onChange={(e) => setEditPrioridade(e.target.value as PrioridadeTarefa)}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">
              Vencimento
            </label>
            <input
              type="date"
              className="input text-xs py-1.5"
              value={editData}
              onChange={(e) => setEditData(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1 px-3" onClick={saveEdit}>
            Salvar
          </button>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setEditing(false)}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white dark:bg-slate-800 rounded-xl border p-3 shadow-sm hover:shadow-md transition-shadow group ${isVencida ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10 dark:border-red-800/50' : 'border-slate-200 dark:border-slate-700'}`}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="text-slate-300 hover:text-slate-400 mt-0.5 cursor-grab active:cursor-grabbing flex-shrink-0"
        >
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={`font-medium text-sm leading-snug cursor-pointer hover:text-core-green ${isDone ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}
              onClick={() => setEditing(true)}
            >
              {tarefa.titulo}
            </p>
            <button
              onClick={() => {
                deleteTarefa(tarefa.id);
                toast('Tarefa excluída.', 'info');
              }}
              className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {tarefa.descricao && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 line-clamp-2">
              {tarefa.descricao}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span
              className={`flex items-center gap-1 text-xs ${PRIOR_STYLE[tarefa.prioridade].text}`}
            >
              <Flag size={10} /> {PRIOR_STYLE[tarefa.prioridade].label}
            </span>
            {tarefa.dataVencimento && (
              <VencimentoBadge data={tarefa.dataVencimento} isDone={isDone} />
            )}
          </div>
        </div>
      </div>

      {/* Move buttons */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50 dark:border-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity">
        {colIndex > 0 && (
          <button
            onClick={() => moveTarefa(tarefa.id, COLUNAS[colIndex - 1].id)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <ChevronLeft size={12} /> {COLUNAS[colIndex - 1].label}
          </button>
        )}
        {colIndex < COLUNAS.length - 1 && (
          <button
            onClick={() => moveTarefa(tarefa.id, COLUNAS[colIndex + 1].id)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-core-green transition-colors ml-auto"
          >
            {COLUNAS[colIndex + 1].label} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── AddCard ──────────────────────────────────────────────────────────────────

function AddCard({ coluna, onDone }: { coluna: ColunaTarefa; onDone: () => void }) {
  const addTarefa = useStore((s) => s.addTarefa);
  const toast = useToast();
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [dataVencimento, setDataVencimento] = useState('');

  const save = () => {
    if (!titulo.trim()) return;
    addTarefa({
      id: crypto.randomUUID(),
      titulo: titulo.trim(),
      descricao,
      coluna,
      posicao: Date.now(),
      prioridade,
      dataVencimento: dataVencimento || undefined,
      criadoEm: new Date().toISOString(),
    });
    toast('Tarefa criada.', 'success');
    onDone();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-core-green/30 p-3 shadow-sm space-y-2">
      <input
        className="input text-sm"
        placeholder="Título da tarefa…"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        autoFocus
        onKeyDown={(e) => e.key === 'Enter' && save()}
      />
      <textarea
        className="input text-xs resize-none"
        rows={2}
        placeholder="Descrição (opcional)"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">
            Prioridade
          </label>
          <select
            className="select text-xs py-1.5"
            value={prioridade}
            onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}
          >
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-slate-400 dark:text-slate-500 block mb-0.5">
            Vencimento
          </label>
          <input
            type="date"
            className="input text-xs py-1.5"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn-primary text-xs py-1 px-3" onClick={save}>
          Adicionar
        </button>
        <button className="btn-secondary text-xs py-1 px-3" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Kanban() {
  const toast = useToast();
  const tarefas = useStore((s) => s.tarefas);
  const updateTarefa = useStore((s) => s.updateTarefa);
  const deleteTarefa = useStore((s) => s.deleteTarefa);

  const [addingIn, setAddingIn] = useState<ColunaTarefa | null>(null);
  const [filterPrioridade, setFilterPrioridade] = useState<'todas' | PrioridadeTarefa>('todas');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const col = tarefas.find((t) => t.id === over.id)?.coluna;
    if (col) updateTarefa(String(active.id), { coluna: col });
  };

  const porColuna = (col: ColunaTarefa) =>
    tarefas
      .filter(
        (t) =>
          t.coluna === col && (filterPrioridade === 'todas' || t.prioridade === filterPrioridade)
      )
      .sort((a, b) => a.posicao - b.posicao);

  // KPIs
  const abertas = tarefas.filter((t) => t.coluna !== 'done');
  const altaCount = abertas.filter((t) => t.prioridade === 'alta').length;
  const vencidasCount = abertas.filter((t) => t.dataVencimento && t.dataVencimento < TODAY).length;

  const limparConcluidas = () => {
    const concluidas = tarefas.filter((t) => t.coluna === 'done');
    concluidas.forEach((t) => deleteTarefa(t.id));
    toast(`${concluidas.length} tarefa(s) concluída(s) removida(s).`, 'info');
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Tarefas Operacionais
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {tarefas.length} tarefas · Quadro estilo Trello
            </p>
          </div>
        </div>

        {/* KPIs (melhoria 5) */}
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Abertas</span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {abertas.length}
            </span>
          </div>
          <div
            className={`bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 flex items-center gap-2 ${altaCount > 0 ? 'border-red-200 bg-red-50/40 dark:border-red-800/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <Flag size={11} className={altaCount > 0 ? 'text-red-500' : 'text-slate-400'} />
            <span className="text-xs text-slate-500 dark:text-slate-400">Alta prioridade</span>
            <span
              className={`text-sm font-bold ${altaCount > 0 ? 'text-red-500' : 'text-slate-400'}`}
            >
              {altaCount}
            </span>
          </div>
          <div
            className={`bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 flex items-center gap-2 ${vencidasCount > 0 ? 'border-red-200 bg-red-50/40 dark:border-red-800/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}`}
          >
            <AlertCircle
              size={11}
              className={vencidasCount > 0 ? 'text-red-500' : 'text-slate-400'}
            />
            <span className="text-xs text-slate-500 dark:text-slate-400">Vencidas</span>
            <span
              className={`text-sm font-bold ${vencidasCount > 0 ? 'text-red-500' : 'text-slate-400'}`}
            >
              {vencidasCount}
            </span>
          </div>
        </div>

        {/* Filtro por prioridade */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500 font-medium">Prioridade:</span>
          {(
            [
              { key: 'todas', label: 'Todas' },
              { key: 'alta', label: 'Alta' },
              { key: 'media', label: 'Média' },
              { key: 'baixa', label: 'Baixa' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilterPrioridade(opt.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterPrioridade === opt.key
                  ? opt.key === 'alta'
                    ? 'bg-red-500 text-white'
                    : opt.key === 'media'
                      ? 'bg-amber-500 text-white'
                      : opt.key === 'baixa'
                        ? 'bg-slate-500 text-white'
                        : 'bg-core-green text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUNAS.map((col, colIndex) => {
            const items = porColuna(col.id);
            const totalCol = tarefas.filter((t) => t.coluna === col.id).length;
            const isDoneCol = col.id === 'done';

            return (
              <div key={col.id} className="flex flex-col w-72 flex-shrink-0">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>
                      {col.label}
                    </span>
                    <span className="text-slate-400 text-xs font-medium">{totalCol}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Limpar concluídas (melhoria 4) */}
                    {isDoneCol && totalCol > 0 && (
                      <button
                        onClick={limparConcluidas}
                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-400 transition-colors px-1.5 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10"
                        title="Remover todas as tarefas concluídas"
                      >
                        <CheckCheck size={12} /> Limpar
                      </button>
                    )}
                    <button
                      onClick={() => setAddingIn(addingIn === col.id ? null : col.id)}
                      className="text-slate-400 hover:text-core-green transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 min-h-24">
                  <SortableContext
                    items={items.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((t) => (
                      <TarefaCard key={t.id} tarefa={t} colIndex={colIndex} />
                    ))}
                  </SortableContext>

                  {addingIn === col.id && (
                    <AddCard coluna={col.id} onDone={() => setAddingIn(null)} />
                  )}

                  {items.length === 0 && addingIn !== col.id && (
                    <div
                      className={`border-2 border-dashed rounded-xl h-20 flex items-center justify-center ${col.accent} border-opacity-50`}
                    >
                      <p className="text-slate-300 dark:text-slate-600 text-xs">
                        {filterPrioridade !== 'todas' && totalCol > 0
                          ? 'Nenhuma com esta prioridade'
                          : 'Solte cards aqui'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}
