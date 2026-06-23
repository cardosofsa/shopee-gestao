import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Sun, ShoppingCart, Package,
  CreditCard, CheckSquare, ArrowRight, CheckCircle2,
  TrendingUp, Clock, Zap,
} from 'lucide-react';
import { useStore } from '../store';
import { useAlertas } from '../hooks/useAlertas';
import { fmt, getStatusEstoque } from '../utils/calculations';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function diaSemana(): string {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, count, color, to, empty, children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  color: string;
  to?: string;
  empty?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
            <Icon size={13} className="text-white" />
          </div>
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
          {count != null && count > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              {count}
            </span>
          )}
        </div>
        {to && (
          <Link to={to} className="text-xs text-core-green flex items-center gap-1 hover:underline">
            Ver tudo <ArrowRight size={11} />
          </Link>
        )}
      </div>
      {children ?? (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">{empty ?? 'Nenhum item.'}</p>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Hoje() {
  const pedidosAll    = useStore((s) => s.pedidos);
  const produtos      = useStore((s) => s.produtos);
  const tarefas       = useStore((s) => s.tarefas);
  const contasPagar   = useStore((s) => s.contasPagar);
  const campanhas     = useStore((s) => s.campanhas);
  const alertas       = useAlertas();

  const today     = new Date().toISOString().slice(0, 10);
  const next7     = addDays(7);
  const next3     = addDays(3);

  // ── Pedidos de hoje ───────────────────────────────────────────────────────

  const pedidosHoje = useMemo(
    () => pedidosAll.filter((p) => p.data === today),
    [pedidosAll, today],
  );

  const receitaHoje = useMemo(
    () => pedidosHoje.reduce((s, p) => s + p.receita, 0),
    [pedidosHoje],
  );

  const lucroHoje = useMemo(
    () => pedidosHoje.reduce((s, p) => s + (p.lucroOperacional ?? 0), 0),
    [pedidosHoje],
  );

  const emProcesso = useMemo(
    () => pedidosAll.filter((p) => p.status === 'Em processo'),
    [pedidosAll],
  );

  // ── Contas vencendo ───────────────────────────────────────────────────────

  const contasVencendo = useMemo(
    () => contasPagar
      .filter((c) => c.status === 'pendente' && c.vencimento >= today && c.vencimento <= next7)
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [contasPagar, today, next7],
  );

  const contasVencidas = useMemo(
    () => contasPagar.filter((c) => c.status === 'pendente' && c.vencimento < today),
    [contasPagar, today],
  );

  const totalContas7d = useMemo(
    () => contasVencendo.reduce((s, c) => s + c.valor, 0),
    [contasVencendo],
  );

  // ── Tarefas de hoje e vencidas ────────────────────────────────────────────

  const tarefasHoje = useMemo(
    () => tarefas
      .filter((t) => t.coluna !== 'done' && t.dataVencimento === today)
      .sort((a, b) => {
        const ord = { alta: 0, media: 1, baixa: 2 };
        return ord[a.prioridade] - ord[b.prioridade];
      }),
    [tarefas, today],
  );

  const tarefasAtrasadas = useMemo(
    () => tarefas.filter((t) => t.coluna !== 'done' && t.dataVencimento && t.dataVencimento < today),
    [tarefas, today],
  );

  // ── Estoque crítico ───────────────────────────────────────────────────────

  const limite30d = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }, []);

  const estoqueCritico = useMemo(() => {
    return produtos
      .map((p) => {
        const total = pedidosAll
          .filter((o) => o.sku === p.sku && (o.status === 'Concluído' || o.status === 'Enviado') && o.data >= limite30d)
          .reduce((s, o) => s + o.unidadesEstoque, 0);
        const vdDia  = total / 30;
        const status = getStatusEstoque(p.estoqueAtual, vdDia, p.estoqueSeguranca);
        return { ...p, vdDia, status };
      })
      .filter((p) => p.status === 'Comprar' || (p.status === 'Estoque Baixo'))
      .sort((a, b) => {
        if (a.estoqueAtual === 0 && b.estoqueAtual !== 0) return -1;
        if (b.estoqueAtual === 0 && a.estoqueAtual !== 0) return 1;
        return 0;
      })
      .slice(0, 6);
  }, [produtos, pedidosAll, limite30d]);

  // ── Campanhas ativas hoje ─────────────────────────────────────────────────

  const campanhasAtivas = useMemo(
    () => campanhas.filter((c) => c.inicio <= today && c.fim >= today),
    [campanhas, today],
  );

  // ── Alertas críticos ──────────────────────────────────────────────────────

  const alertasCriticos = alertas.filter((a) => a.severidade === 'critico');

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 space-y-6 max-w-4xl mx-auto">

      {/* Greeting */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center shrink-0">
          <Sun size={22} className="text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {saudacao()}, vendedor!
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 capitalize">{diaSemana()}</p>
        </div>

        {/* Resumo do dia inline */}
        <div className="ml-auto hidden sm:flex items-center gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Receita hoje</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{fmt(receitaHoje)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Lucro hoje</p>
            <p className={`text-lg font-bold ${lucroHoje >= 0 ? 'text-core-green' : 'text-red-500'}`}>{fmt(lucroHoje)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">Pedidos</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{pedidosHoje.length}</p>
          </div>
        </div>
      </div>

      {/* Alertas críticos — banner */}
      {alertasCriticos.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <Zap size={16} className="text-red-500 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {alertasCriticos.length} alerta{alertasCriticos.length !== 1 ? 's' : ''} crítico{alertasCriticos.length !== 1 ? 's' : ''} ativo{alertasCriticos.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-1.5 space-y-1">
              {alertasCriticos.slice(0, 3).map((a) => (
                <Link key={a.id} to={a.link ?? '/alertas'} className="block text-xs text-red-600 dark:text-red-400 hover:underline truncate">
                  · {a.titulo}
                </Link>
              ))}
            </div>
          </div>
          <Link to="/alertas" className="text-xs text-red-600 dark:text-red-400 hover:underline shrink-0">
            Ver todos
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Pedidos em processo */}
        <Section
          icon={ShoppingCart}
          title="Pedidos em Processo"
          count={emProcesso.length}
          color="bg-blue-500"
          to="/vendas"
          empty="Nenhum pedido aguardando processamento."
        >
          {emProcesso.length > 0 && (
            <div className="space-y-2">
              {emProcesso.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                  <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{p.produto}</span>
                  <span className="text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">{fmt(p.receita)}</span>
                </div>
              ))}
              {emProcesso.length > 4 && (
                <Link to="/vendas" className="text-xs text-core-green hover:underline pl-3.5">
                  + {emProcesso.length - 4} pedidos →
                </Link>
              )}
            </div>
          )}
        </Section>

        {/* Tarefas de hoje */}
        <Section
          icon={CheckSquare}
          title="Tarefas de Hoje"
          count={tarefasHoje.length + tarefasAtrasadas.length}
          color="bg-slate-500"
          to="/kanban"
          empty="Nenhuma tarefa para hoje."
        >
          {(tarefasHoje.length > 0 || tarefasAtrasadas.length > 0) && (
            <div className="space-y-2">
              {tarefasAtrasadas.slice(0, 2).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                  <span className="text-red-600 dark:text-red-400 truncate flex-1">{t.titulo}</span>
                  <span className="text-red-400 dark:text-red-500 shrink-0 text-[10px]">atrasada</span>
                </div>
              ))}
              {tarefasHoje.slice(0, 4).map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    t.prioridade === 'alta' ? 'bg-red-500' :
                    t.prioridade === 'media' ? 'bg-amber-500' : 'bg-slate-400'
                  }`} />
                  <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{t.titulo}</span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Contas a pagar */}
        <Section
          icon={CreditCard}
          title="Contas a Pagar — Próximos 7 dias"
          count={contasVencendo.length + contasVencidas.length}
          color={contasVencidas.length > 0 ? 'bg-red-500' : 'bg-amber-500'}
          to="/contas-pagar"
          empty="Nenhuma conta vencendo nos próximos 7 dias."
        >
          {(contasVencendo.length > 0 || contasVencidas.length > 0) && (
            <div className="space-y-2">
              {contasVencidas.slice(0, 2).map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <span className="text-red-600 dark:text-red-400 truncate flex-1">{c.descricao}</span>
                  <span className="text-red-500 font-medium tabular-nums shrink-0">{fmt(c.valor)}</span>
                </div>
              ))}
              {contasVencendo.slice(0, 4).map((c) => {
                const isUrgent = c.vencimento <= next3;
                return (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isUrgent ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{c.descricao}</span>
                    <span className="text-slate-400 dark:text-slate-500 shrink-0 text-[10px]">{c.vencimento.slice(5)}</span>
                    <span className="text-slate-700 dark:text-slate-200 font-medium tabular-nums shrink-0">{fmt(c.valor)}</span>
                  </div>
                );
              })}
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs">
                <span className="text-slate-400 dark:text-slate-500">Total 7 dias</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{fmt(totalContas7d)}</span>
              </div>
            </div>
          )}
        </Section>

        {/* Estoque crítico */}
        <Section
          icon={Package}
          title="Estoque Crítico"
          count={estoqueCritico.length}
          color="bg-red-500"
          to="/reposicao"
          empty="Nenhum SKU em estado crítico."
        >
          {estoqueCritico.length > 0 && (
            <div className="space-y-2">
              {estoqueCritico.map((p) => (
                <div key={p.sku} className="flex items-center gap-2 text-xs">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.estoqueAtual === 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                  <Link to={`/estoque/${p.sku}`} className="font-mono text-core-green hover:underline shrink-0">{p.sku}</Link>
                  <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{p.nome}</span>
                  <span className={`font-semibold tabular-nums shrink-0 ${p.estoqueAtual === 0 ? 'text-red-500' : 'text-amber-600'}`}>
                    {p.estoqueAtual} un.
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Campanhas ativas */}
      {campanhasAtivas.length > 0 && (
        <Section
          icon={TrendingUp}
          title="Campanhas Ativas Hoje"
          count={campanhasAtivas.length}
          color="bg-core-green"
          to="/campanhas"
        >
          <div className="flex flex-wrap gap-2">
            {campanhasAtivas.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white"
                style={{ background: c.cor }}
              >
                <span>{c.nome}</span>
                <span className="opacity-80">−{c.desconto}%</span>
                <span className="opacity-60 text-[10px]">até {c.fim.slice(5)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Tudo ok */}
      {alertasCriticos.length === 0 && emProcesso.length === 0 && tarefasHoje.length === 0 &&
       contasVencidas.length === 0 && estoqueCritico.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
          <p className="text-slate-700 dark:text-slate-200 font-semibold">Tudo em ordem!</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm max-w-xs">
            Sem pendências críticas hoje. Continue importando seus pedidos e monitorando o estoque.
          </p>
          <div className="flex items-center gap-3 mt-2">
            <Link to="/importar" className="flex items-center gap-1.5 px-4 py-2 bg-core-green text-white text-xs font-medium rounded-xl hover:bg-core-green-h transition-colors">
              <Clock size={13} /> Importar pedidos
            </Link>
            <Link to="/" className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-xl hover:border-core-green/50 transition-colors">
              Dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
