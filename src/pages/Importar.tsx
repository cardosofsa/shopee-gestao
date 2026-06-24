import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileUp,
  RotateCcw,
  Store,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { useToast } from '../components/Toast';
import type { ImportFormato } from '../import/parsers';
import { parseImportRows } from '../import/parsers';
import { useStore } from '../store';
import type { Pedido } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportLog {
  id: string;
  ts: string;
  formato: ImportFormato;
  novos: number;
  duplicados: number;
  loja?: string;
}

interface PendingImport {
  novos: Pedido[];
  duplicados: number;
  formato: ImportFormato;
  isShopeeNativo: boolean;
  lojaCustom: string;
  rows: any[];
}

// ─── Local storage history ────────────────────────────────────────────────────

const HIST_KEY = 'shopee-gestao-import-log';

function loadHistory(): ImportLog[] {
  try {
    return JSON.parse(localStorage.getItem(HIST_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveHistory(logs: ImportLog[]) {
  localStorage.setItem(HIST_KEY, JSON.stringify(logs.slice(0, 10)));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FORMAT_LABEL: Record<ImportFormato, string> = {
  shopee_nativo: 'Shopee Nativo',
  upseller: 'UpSeller',
  generico: 'Genérico',
};

const FORMAT_COLOR: Record<ImportFormato, string> = {
  shopee_nativo: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  upseller: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  generico: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
};

function fmtTs(iso: string) {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR') +
    ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

// ─── Drop zone ────────────────────────────────────────────────────────────────

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile]
  );

  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed transition-colors cursor-pointer py-14 px-6 ${
        dragging
          ? 'border-core-green bg-core-green/5'
          : 'border-slate-200 dark:border-slate-700 hover:border-core-green/50'
      }`}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setDragging(false);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onFile(f);
            e.target.value = '';
          }
        }}
      />
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-core-green text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}
      >
        <Upload size={24} />
      </div>
      <div className="text-center">
        <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">
          {dragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
          XLSX, XLS ou CSV — Shopee Seller Center, UpSeller ou formato genérico
        </p>
      </div>
    </div>
  );
}

// ─── Preview table ────────────────────────────────────────────────────────────

function PreviewTable({ pedidos }: { pedidos: Pedido[] }) {
  const rows = pedidos.slice(0, 10);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {['Data', 'Nº Pedido', 'SKU', 'Produto', 'Qtd', 'Status', 'Receita (R$)'].map((h) => (
              <th key={h} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
              <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                {p.data}
              </td>
              <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-700 dark:text-slate-200">
                {p.numeroPedido}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                {p.sku}
              </td>
              <td className="px-3 py-2 max-w-[180px] truncate text-slate-600 dark:text-slate-300">
                {p.produto}
              </td>
              <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">
                {p.quantidade}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    p.status === 'Concluído'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : p.status === 'Devolvido'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : p.status === 'Enviado'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}
                >
                  {p.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-700 dark:text-slate-200">
                {p.receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {pedidos.length > 10 && (
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-2 border-t border-slate-100 dark:border-slate-800">
          + {pedidos.length - 10} pedidos não exibidos
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Importar() {
  const toast = useToast();
  const pedidosAll = useStore((s) => s.pedidos);
  const produtos = useStore((s) => s.produtos);
  const configuracoes = useStore((s) => s.configuracoes);
  const addPedidos = useStore((s) => s.addPedidos);

  const [pending, setPending] = useState<PendingImport | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ImportLog[]>(loadHistory);
  const [lastDone, setLastDone] = useState<{
    novos: number;
    duplicados: number;
    formato: ImportFormato;
  } | null>(null);

  const lojasDisponiveis = useMemo(() => {
    const set = new Set([...produtos.map((p) => p.loja), ...configuracoes.lojas]);
    return [...set].sort();
  }, [produtos, configuracoes.lojas]);

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setPending(null);
      setLastDone(null);
      try {
        const XLSX = await import('xlsx');
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) {
          toast('Arquivo vazio ou inválido.', 'error');
          return;
        }

        const {
          pedidos: parsed,
          formato,
          isShopeeNativo,
        } = parseImportRows(rows, produtos, configuracoes);
        if (parsed.length === 0) {
          toast('Nenhum pedido válido encontrado. Verifique o arquivo.', 'error');
          return;
        }

        const existingNums = new Set(pedidosAll.map((p) => p.numeroPedido));
        const novos = parsed.filter((p) => !existingNums.has(p.numeroPedido));
        const duplicados = parsed.length - novos.length;
        const lojaDefault = isShopeeNativo
          ? (lojasDisponiveis[0] ?? configuracoes.lojas[0] ?? 'Ambas')
          : '';

        if (novos.length === 0) {
          toast('Todos os pedidos já existem no sistema.', 'warning');
          return;
        }

        setPending({ novos, duplicados, formato, isShopeeNativo, lojaCustom: lojaDefault, rows });
      } catch {
        toast('Erro ao processar arquivo. Verifique o formato.', 'error');
      } finally {
        setLoading(false);
      }
    },
    [pedidosAll, produtos, configuracoes, lojasDisponiveis, toast]
  );

  const handleConfirm = useCallback(() => {
    if (!pending) return;
    const { novos, duplicados, formato, isShopeeNativo, lojaCustom } = pending;

    const final =
      isShopeeNativo && lojaCustom ? novos.map((p) => ({ ...p, loja: lojaCustom })) : novos;

    addPedidos(final);

    const entry: ImportLog = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      formato,
      novos: final.length,
      duplicados,
      loja: isShopeeNativo ? lojaCustom : undefined,
    };
    const updated = [entry, ...history];
    saveHistory(updated);
    setHistory(updated);

    setLastDone({ novos: final.length, duplicados, formato });
    setPending(null);
    toast(`${final.length} pedido(s) importado(s) com sucesso!`, 'success');
    if (duplicados > 0) toast(`${duplicados} duplicado(s) ignorado(s).`, 'info');
  }, [pending, addPedidos, history, toast]);

  const handleReset = () => {
    setPending(null);
    setLastDone(null);
  };

  return (
    <div className="flex-1 p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-core-green/10 flex items-center justify-center">
          <FileUp size={18} className="text-core-green" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Centro de Importação
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Importe pedidos do Shopee Seller Center, UpSeller ou planilha genérica
          </p>
        </div>
      </div>

      {/* Success card */}
      {lastDone && !pending && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">
              {lastDone.novos} pedido{lastDone.novos !== 1 ? 's' : ''} importado
              {lastDone.novos !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
              Formato: <span className="font-medium">{FORMAT_LABEL[lastDone.formato]}</span>
              {lastDone.duplicados > 0 && ` · ${lastDone.duplicados} duplicado(s) ignorado(s)`}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-green-700 dark:text-green-400 hover:underline shrink-0"
          >
            Nova importação
          </button>
        </div>
      )}

      {/* Drop zone */}
      {!pending &&
        !lastDone &&
        (loading ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Processando arquivo...</p>
          </div>
        ) : (
          <DropZone onFile={handleFile} />
        ))}

      {/* Preview + confirm */}
      {pending && (
        <div className="space-y-4">
          {/* Format + stats banner */}
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold ${FORMAT_COLOR[pending.formato]}`}
            >
              {FORMAT_LABEL[pending.formato]}
            </span>
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
              <CheckCircle2 size={14} className="text-green-500" />
              <span className="font-semibold">{pending.novos.length}</span>
              <span className="text-slate-400 dark:text-slate-500">novos</span>
            </div>
            {pending.duplicados > 0 && (
              <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="font-semibold">{pending.duplicados}</span>
                <span className="text-slate-400 dark:text-slate-500">
                  duplicados (serão ignorados)
                </span>
              </div>
            )}
          </div>

          {/* Loja selector for Shopee Nativo */}
          {pending.isShopeeNativo && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Store size={15} className="text-slate-400 shrink-0" />
              <label className="text-xs text-slate-500 dark:text-slate-400 shrink-0">
                Atribuir à loja
              </label>
              <select
                className="flex-1 text-sm bg-transparent text-slate-700 dark:text-slate-200 outline-none"
                value={pending.lojaCustom}
                onChange={(e) => setPending((p) => (p ? { ...p, lojaCustom: e.target.value } : p))}
              >
                {lojasDisponiveis.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Preview */}
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
              Prévia — primeiros {Math.min(pending.novos.length, 10)} pedidos
            </p>
            <PreviewTable pedidos={pending.novos} />
          </div>

          {/* Warnings */}
          {pending.novos.some((p) => p.receita === 0) && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              Alguns pedidos têm receita R$ 0,00. Verifique se o arquivo está completo ou se os SKUs
              estão cadastrados.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-1">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <XCircle size={14} />
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-5 py-2 bg-core-green text-white text-sm font-medium rounded-xl hover:bg-core-green-h transition-colors"
            >
              <CheckCircle2 size={14} />
              Importar {pending.novos.length} pedido{pending.novos.length !== 1 ? 's' : ''}
            </button>
          </div>

          {/* New upload option */}
          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-core-green transition-colors"
            >
              <RotateCcw size={12} />
              Selecionar outro arquivo
            </button>
          </div>
        </div>
      )}

      {/* Drop again after success */}
      {lastDone &&
        !pending &&
        (loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Processando arquivo...</p>
          </div>
        ) : (
          <DropZone onFile={handleFile} />
        ))}

      {/* Format guide */}
      {!pending && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {(
            [
              {
                fmt: 'shopee_nativo' as ImportFormato,
                title: 'Shopee Nativo',
                desc: 'Exportado direto do Shopee Seller Center. Colunas: "ID do pedido", "Número de referência SKU".',
              },
              {
                fmt: 'upseller' as ImportFormato,
                title: 'UpSeller',
                desc: 'Exportado do painel UpSeller. Colunas: "Nº de Pedido da Plataforma", "Nome da Loja no UpSeller".',
              },
              {
                fmt: 'generico' as ImportFormato,
                title: 'Genérico',
                desc: 'Formato próprio ou exportações de outras ferramentas. Adapta automaticamente.',
              },
            ] as const
          ).map(({ fmt: f, title, desc }) => (
            <div
              key={f}
              className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
            >
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${FORMAT_COLOR[f]}`}
              >
                {title}
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Import history */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock size={13} className="text-slate-400" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              Histórico recente
            </p>
          </div>
          <div className="space-y-1.5">
            {history.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-xs"
              >
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold shrink-0 ${FORMAT_COLOR[h.formato]}`}
                >
                  {FORMAT_LABEL[h.formato]}
                </span>
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {h.novos} novos
                </span>
                {h.duplicados > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">{h.duplicados} dup.</span>
                )}
                {h.loja && (
                  <span className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                    <Store size={11} /> {h.loja}
                  </span>
                )}
                <span className="ml-auto text-slate-400 dark:text-slate-500 whitespace-nowrap">
                  {fmtTs(h.ts)}
                </span>
                <ChevronRight size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
