import { ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useStore } from '../../../store';
import { fmt } from '../../../utils/calculations';
import { PaginationBar } from './PaginationBar';

type Mov = {
  id: string;
  tipo: 'Entrada' | 'Saída' | 'Ajuste';
  ajusteTipo?: 'entrada' | 'saida';
  dataISO: string;
  dataDisplay: string;
  sku: string;
  produto: string;
  quantidade: number;
  valor: number;
  ref: string;
  origem: string;
  imutavel?: boolean;
  estoqueAntes?: number;
  estoqueDepois?: number;
};

export function MovimentacoesTab() {
  const compras = useStore((s) => s.compras);
  const pedidos = useStore((s) => s.pedidos);
  const ajustes = useStore((s) => s.ajustes);

  const [movSearch, setMovSearch] = useState('');
  const [movTipo, setMovTipo] = useState<'all' | 'Entrada' | 'Saída' | 'Ajuste'>('all');
  const [movPage, setMovPage] = useState(1);
  const [movPageSize, setMovPageSize] = useState(20);

  useEffect(() => setMovPage(1), [movSearch, movTipo]);

  const movimentacoes = useMemo((): Mov[] => {
    const entradas: Mov[] = compras.map((c) => ({
      id: `e-${c.id}`,
      tipo: 'Entrada',
      dataISO: c.data,
      dataDisplay: c.data,
      sku: c.sku,
      produto: c.produto,
      quantidade: c.quantidadeEntrada,
      valor: c.custoTotal,
      ref: c.nfRef || '—',
      origem: c.fornecedor || '—',
    }));
    const saidas: Mov[] = pedidos
      .filter((p) => p.status === 'Concluído' || p.status === 'Enviado')
      .map((p) => ({
        id: `s-${p.id}`,
        tipo: 'Saída',
        dataISO: p.data,
        dataDisplay: p.data,
        sku: p.sku,
        produto: p.produto,
        quantidade: p.unidadesEstoque,
        valor: p.receita,
        ref: p.numeroPedido,
        origem: p.loja,
      }));
    const ajustesMov: Mov[] = ajustes.map((a) => {
      const dt = new Date(a.criadoEm);
      return {
        id: `a-${a.id}`,
        tipo: 'Ajuste',
        ajusteTipo: a.tipo,
        dataISO: a.criadoEm,
        dataDisplay: `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        sku: a.sku,
        produto: a.produto,
        quantidade: a.quantidade,
        valor: 0,
        ref: '—',
        origem: a.motivo || '—',
        imutavel: true,
        estoqueAntes: a.estoqueAntes,
        estoqueDepois: a.estoqueDepois,
      };
    });
    return [...entradas, ...saidas, ...ajustesMov].sort((a, b) =>
      b.dataISO.localeCompare(a.dataISO)
    );
  }, [compras, pedidos, ajustes]);

  const movFiltered = useMemo(() => {
    const q = movSearch.toLowerCase();
    return movimentacoes.filter((m) => {
      if (movTipo !== 'all' && m.tipo !== movTipo) return false;
      if (
        q &&
        !m.sku.toLowerCase().includes(q) &&
        !m.produto.toLowerCase().includes(q) &&
        !m.ref.toLowerCase().includes(q) &&
        !m.origem.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [movimentacoes, movSearch, movTipo]);

  const movPaginados = movFiltered.slice((movPage - 1) * movPageSize, movPage * movPageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-8"
            placeholder="Buscar SKU, produto, referência ou motivo…"
            value={movSearch}
            onChange={(e) => setMovSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'Entrada', 'Saída', 'Ajuste'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setMovTipo(t)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                movTipo === t
                  ? t === 'Entrada'
                    ? 'bg-emerald-500 text-white border-emerald-500'
                    : t === 'Saída'
                      ? 'bg-red-500 text-white border-red-500'
                      : t === 'Ajuste'
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {t === 'Entrada' && <ArrowDownCircle size={12} />}
              {t === 'Saída' && <ArrowUpCircle size={12} />}
              {t === 'all' ? 'Todos' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-440px)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700">
              <tr>
                {[
                  'Data / Hora',
                  'Tipo',
                  'SKU',
                  'Produto',
                  'Qtd.',
                  'Estoque',
                  'Referência / Motivo',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {movPaginados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                    Nenhuma movimentação encontrada.
                  </td>
                </tr>
              ) : (
                movPaginados.map((m) => {
                  const isAjuste = m.tipo === 'Ajuste';
                  const isEntrada =
                    m.tipo === 'Entrada' || (isAjuste && m.ajusteTipo === 'entrada');
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors ${isAjuste ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
                    >
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap text-xs">
                        {m.dataDisplay}
                      </td>
                      <td className="px-3 py-2.5">
                        {isAjuste ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-amber-50 text-amber-700 border-amber-200">
                            {m.ajusteTipo === 'entrada' ? (
                              <ArrowDownCircle size={11} />
                            ) : (
                              <ArrowUpCircle size={11} />
                            )}
                            Ajuste {m.ajusteTipo === 'entrada' ? '+' : '−'}
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                              m.tipo === 'Entrada'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}
                          >
                            {m.tipo === 'Entrada' ? (
                              <ArrowDownCircle size={11} />
                            ) : (
                              <ArrowUpCircle size={11} />
                            )}
                            {m.tipo}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                        {m.sku}
                      </td>
                      <td className="px-3 py-2.5 text-slate-800 dark:text-slate-200 whitespace-nowrap max-w-[140px] truncate">
                        {m.produto}
                      </td>
                      <td
                        className={`px-3 py-2.5 font-medium ${isEntrada ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {isEntrada ? '+' : '−'}
                        {m.quantidade}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                        {isAjuste && m.estoqueAntes !== undefined ? (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400">{m.estoqueAntes}</span>
                            <span className="text-slate-300 dark:text-slate-600">→</span>
                            <span className="font-medium text-slate-700 dark:text-slate-200">
                              {m.estoqueDepois}
                            </span>
                          </span>
                        ) : !isAjuste && m.valor > 0 ? (
                          fmt(m.valor)
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400 text-xs max-w-[180px] truncate">
                        {isAjuste ? (
                          m.origem !== '—' ? (
                            <span className="italic">{m.origem}</span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">Sem motivo</span>
                          )
                        ) : (
                          <span className="font-mono">{m.ref}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          page={movPage}
          total={movFiltered.length}
          pageSize={movPageSize}
          onPage={setMovPage}
          onPageSize={setMovPageSize}
        />
      </div>
    </div>
  );
}
