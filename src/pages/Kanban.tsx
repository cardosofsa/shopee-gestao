import { useState } from 'react';
import { Plus, Trash2, GripVertical, ChevronRight, ChevronLeft, Calendar, Flag } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../store';
import type { Tarefa, ColunaTarefa, PrioridadeTarefa } from '../types';

const COLUNAS: { id: ColunaTarefa; label: string; color: string }[] = [
  { id: 'todo', label: 'A Fazer', color: 'bg-slate-100 text-slate-700' },
  { id: 'in_progress', label: 'Em Andamento', color: 'bg-amber-100 text-amber-700' },
  { id: 'done', label: 'Concluído', color: 'bg-emerald-100 text-emerald-700' },
];

const PRIOR_COLOR: Record<PrioridadeTarefa, string> = {
  alta: 'text-red-500',
  media: 'text-amber-500',
  baixa: 'text-slate-400',
};

function TarefaCard({ tarefa, colIndex }: { tarefa: Tarefa; colIndex: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarefa.id });
  const deleteTarefa = useStore((s) => s.deleteTarefa);
  const moveTarefa = useStore((s) => s.moveTarefa);
  const updateTarefa = useStore((s) => s.updateTarefa);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tarefa.titulo);
  const [editDesc, setEditDesc] = useState(tarefa.descricao);

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const saveEdit = () => {
    updateTarefa(tarefa.id, { titulo: editTitle, descricao: editDesc });
    setEditing(false);
  };

  if (editing) {
    return (
      <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-shopee-200 p-3 shadow-sm space-y-2">
        <input className="input text-sm" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} autoFocus />
        <textarea className="input text-xs resize-none" rows={2} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
        <div className="flex gap-2">
          <button className="btn-primary text-xs py-1 px-3" onClick={saveEdit}>Salvar</button>
          <button className="btn-secondary text-xs py-1 px-3" onClick={() => setEditing(false)}>Cancelar</button>
        </div>
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start gap-2">
        <button {...attributes} {...listeners} className="text-slate-300 hover:text-slate-400 mt-0.5 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800 text-sm leading-snug cursor-pointer hover:text-shopee-600" onClick={() => setEditing(true)}>
              {tarefa.titulo}
            </p>
            <button onClick={() => deleteTarefa(tarefa.id)} className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
              <Trash2 size={13} />
            </button>
          </div>
          {tarefa.descricao && <p className="text-slate-500 text-xs mt-1 line-clamp-2">{tarefa.descricao}</p>}
          <div className="flex items-center gap-3 mt-2">
            <span className={`flex items-center gap-1 text-xs ${PRIOR_COLOR[tarefa.prioridade]}`}>
              <Flag size={10} /> {tarefa.prioridade}
            </span>
            {tarefa.dataVencimento && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Calendar size={10} /> {tarefa.dataVencimento}
              </span>
            )}
          </div>
        </div>
      </div>
      {/* Move buttons */}
      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
        {colIndex > 0 && (
          <button onClick={() => moveTarefa(tarefa.id, COLUNAS[colIndex - 1].id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ChevronLeft size={12} /> {COLUNAS[colIndex - 1].label}
          </button>
        )}
        {colIndex < COLUNAS.length - 1 && (
          <button onClick={() => moveTarefa(tarefa.id, COLUNAS[colIndex + 1].id)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-shopee-500 ml-auto">
            {COLUNAS[colIndex + 1].label} <ChevronRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function AddCard({ coluna, onDone }: { coluna: ColunaTarefa; onDone: () => void }) {
  const addTarefa = useStore((s) => s.addTarefa);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<PrioridadeTarefa>('media');
  const [dataVencimento, setDataVencimento] = useState('');

  const save = () => {
    if (!titulo.trim()) return;
    addTarefa({
      id: crypto.randomUUID(), titulo: titulo.trim(), descricao,
      coluna, posicao: 999, prioridade,
      dataVencimento: dataVencimento || undefined,
      criadoEm: new Date().toISOString(),
    });
    onDone();
  };

  return (
    <div className="bg-white rounded-xl border border-shopee-300 p-3 shadow-sm space-y-2">
      <input className="input text-sm" placeholder="Título da tarefa…" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
      <textarea className="input text-xs resize-none" rows={2} placeholder="Descrição (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      <div className="flex gap-2">
        <select className="select text-xs" value={prioridade} onChange={(e) => setPrioridade(e.target.value as PrioridadeTarefa)}>
          <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
        </select>
        <input type="date" className="input text-xs" value={dataVencimento} onChange={(e) => setDataVencimento(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button className="btn-primary text-xs py-1 px-3" onClick={save}>Adicionar</button>
        <button className="btn-secondary text-xs py-1 px-3" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}

export default function Kanban() {
  const tarefas = useStore((s) => s.tarefas);
  const updateTarefa = useStore((s) => s.updateTarefa);
  const [addingIn, setAddingIn] = useState<ColunaTarefa | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const col = tarefas.find((t) => t.id === over.id)?.coluna;
    if (col) updateTarefa(String(active.id), { coluna: col });
  };

  const porColuna = (col: ColunaTarefa) => tarefas.filter((t) => t.coluna === col).sort((a, b) => a.posicao - b.posicao);

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Tarefas Operacionais</h1>
        <p className="text-slate-500 text-sm">{tarefas.length} tarefas · Quadro estilo Trello</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 flex-1 overflow-x-auto pb-4">
          {COLUNAS.map((col, colIndex) => {
            const items = porColuna(col.id);
            return (
              <div key={col.id} className="flex flex-col w-72 flex-shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${col.color}`}>{col.label}</span>
                    <span className="text-slate-400 text-xs font-medium">{items.length}</span>
                  </div>
                  <button onClick={() => setAddingIn(addingIn === col.id ? null : col.id)} className="text-slate-400 hover:text-shopee-500 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2 min-h-24">
                  <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                    {items.map((t) => (
                      <TarefaCard key={t.id} tarefa={t} colIndex={colIndex} />
                    ))}
                  </SortableContext>
                  {addingIn === col.id && <AddCard coluna={col.id} onDone={() => setAddingIn(null)} />}
                  {items.length === 0 && addingIn !== col.id && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl h-20 flex items-center justify-center">
                      <p className="text-slate-300 text-xs">Solte cards aqui</p>
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
