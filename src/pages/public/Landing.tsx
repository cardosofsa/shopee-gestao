import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload, Monitor, TrendingUp, TrendingDown, BarChart2, Package, DollarSign,
  FileText, Calendar, Calculator, Store, LineChart, CalendarDays,
  CheckCircle, Check, X, Shield, Clock, ArrowRight, ChevronDown, ChevronUp,
  FileSpreadsheet, PackageX,
} from 'lucide-react';
import PublicLayout from '../../components/public/PublicLayout';
import { insertLead } from '../../lib/leads';

// ──────────────────────────────────────────────────────────
// Dashboard mockup visual
// ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-slate-200 shadow-core-lg overflow-hidden select-none">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 max-w-[220px] mx-auto bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center">
          app.coregestao.com.br
        </div>
      </div>
      <div className="flex" style={{ height: 340 }}>
        <div className="w-44 bg-[#111111] p-3 flex-shrink-0 flex flex-col gap-1">
          <div className="flex items-center gap-2 p-2 mb-3">
            <div className="w-5 h-5 rounded-full border border-white/40 flex-shrink-0" />
            <span className="font-light tracking-[0.28em] text-white text-[11px]">CORE</span>
          </div>
          {['Dashboard', 'Vendas', 'Estoque', 'Financeiro', 'Tarefas'].map((item, i) => (
            <div
              key={item}
              className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 ${
                i === 0 ? 'bg-core-green text-white' : 'text-slate-400'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-slate-600'}`} />
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-slate-50 p-4 overflow-hidden">
          <p className="text-[11px] font-semibold text-slate-800 mb-3">Dashboard</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Faturamento', value: 'R$ 12.480', up: true },
              { label: 'Lucro líquido', value: 'R$ 3.215', up: true },
              { label: 'Pedidos', value: '84', up: false },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                <p className="text-[9px] text-slate-400 mb-0.5">{k.label}</p>
                <p className="text-xs font-semibold text-slate-800">{k.value}</p>
                <p className={`text-[9px] mt-0.5 ${k.up ? 'text-emerald-500' : 'text-red-400'}`}>
                  {k.up ? '↑' : '↓'} vs mês ant.
                </p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-100">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Últimas vendas</p>
            </div>
            {[
              { sku: 'FITA-BIKE', receita: 'R$ 89,90', status: 'Concluído', cor: 'text-emerald-600' },
              { sku: 'ALF-118',   receita: 'R$ 45,00', status: 'Enviado',   cor: 'text-amber-600' },
              { sku: 'CANMAD',    receita: 'R$ 67,50', status: 'Concluído', cor: 'text-emerald-600' },
            ].map((row) => (
              <div key={row.sku} className="px-3 py-1.5 flex items-center justify-between border-b border-slate-50 last:border-0">
                <span className="text-[9px] font-mono text-slate-600">{row.sku}</span>
                <span className="text-[9px] font-semibold text-slate-800">{row.receita}</span>
                <span className={`text-[9px] font-medium ${row.cor}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// FAQ item
// ──────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left flex items-center justify-between py-4 gap-4"
      >
        <span className="text-sm font-medium text-white">{q}</span>
        {open
          ? <ChevronUp size={16} className="text-slate-500 flex-shrink-0" />
          : <ChevronDown size={16} className="text-slate-500 flex-shrink-0" />
        }
      </button>
      {open && <p className="text-sm text-slate-400 pb-4 leading-relaxed">{a}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Lead popup
// ──────────────────────────────────────────────────────────
function LeadPopup({ onClose }: { onClose: () => void }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim()) return;
    setLoading(true);
    await insertLead({ nome, email, origem: 'popup' });
    localStorage.setItem('core-popup-shown', '1');
    setLoading(false);
    setDone(true);
  }

  function handleClose() {
    localStorage.setItem('core-popup-shown', '1');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-core-lg w-full max-w-sm p-6 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </button>
        {done ? (
          <div className="text-center py-4">
            <CheckCircle size={28} className="text-core-green mx-auto mb-3" />
            <p className="font-semibold text-slate-800 mb-1">Perfeito! Te avisaremos em breve.</p>
            <p className="text-sm text-slate-400">Fique de olho no seu email.</p>
            <button onClick={onClose} className="mt-4 text-sm text-slate-400 hover:text-slate-600 underline">
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full border-[1.5px] border-core-black" />
              <span className="font-light tracking-[0.28em] text-core-black text-[11px]">CORE</span>
            </div>
            <h3 className="text-base font-semibold text-slate-800 mt-3 mb-1">
              Acesso antecipado gratuito
            </h3>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Entre na lista e receba seu convite antes do lançamento oficial.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                className="input"
                placeholder="Seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <input
                type="email"
                className="input"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-core-green hover:bg-core-green-h text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Enviando...' : 'Quero acesso exclusivo →'}
              </button>
            </form>
            <p className="text-xs text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
              <Shield size={10} />
              Seus dados não serão compartilhados.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Landing page
// ──────────────────────────────────────────────────────────
export default function Landing() {
  const [showPopup, setShowPopup] = useState(false);
  const demoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (localStorage.getItem('core-popup-shown')) return;
    const onScroll = () => {
      if (window.scrollY > document.body.scrollHeight * 0.4) {
        setShowPopup(true);
        window.removeEventListener('scroll', onScroll);
      }
    };
    const timer = setTimeout(() => setShowPopup(true), 30_000);
    window.addEventListener('scroll', onScroll);
    return () => { clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, []);

  const features = [
    { icon: BarChart2,    label: 'Dashboard KPIs' },
    { icon: Package,      label: 'Estoque automático' },
    { icon: DollarSign,   label: 'DRE live' },
    { icon: FileText,     label: 'Import CSV 1-clique' },
    { icon: Calendar,     label: 'Kanban de tarefas' },
    { icon: Calculator,   label: 'Calculadora de preço' },
    { icon: Store,        label: 'Multi-loja' },
    { icon: LineChart,    label: 'Curva ABC' },
    { icon: CalendarDays, label: 'Google Calendar' },
  ];

  const painCards = [
    {
      icon: FileSpreadsheet,
      title: 'Planilha desatualizada',
      desc: '"Qual era o saldo de ontem mesmo? Preciso abrir o arquivo, atualizar as fórmulas..."',
    },
    {
      icon: PackageX,
      title: 'Estoque no chute',
      desc: '"Vendi algo que não tinha em estoque. Agora tenho que cancelar o pedido."',
    },
    {
      icon: TrendingDown,
      title: 'Fim do mês: lucro ou prejuízo?',
      desc: '"Faturei R$ 15 mil, mas não sei se tive lucro ou prejuízo de verdade."',
    },
  ];

  // 'check' | 'x' | string
  type Cell = 'check' | 'x' | string;
  const tableRows: { rec: string; plan: Cell; erp: Cell; core: Cell }[] = [
    { rec: 'Import automático de pedidos', plan: 'x',      erp: 'x',             core: 'check'      },
    { rec: 'Estoque atualizado',           plan: 'x',      erp: 'Parcial',       core: 'check'      },
    { rec: 'DRE + Curva ABC',              plan: 'Manual', erp: 'R$ 300+/mês',   core: 'Incluso'    },
    { rec: 'Multi-loja',                   plan: 'Manual', erp: 'R$ 500+/mês',   core: 'Incluso'    },
    { rec: 'Setup',                        plan: 'Horas',  erp: 'Dias',          core: '5 minutos'  },
    { rec: 'Preço',                        plan: '"Grátis"', erp: 'R$ 200–800/mês', core: 'R$ 0'    },
  ];

  function Cell({ value, isCore }: { value: Cell; isCore?: boolean }) {
    if (value === 'check') return <Check size={14} className="mx-auto text-core-green" />;
    if (value === 'x')     return <X     size={14} className="mx-auto text-slate-300" />;
    return <span className={isCore ? 'text-core-green font-semibold' : 'text-slate-400'}>{value}</span>;
  }

  const faqs = [
    { q: 'Preciso instalar alguma coisa?',    a: 'Não. O Core roda 100% no navegador, em qualquer dispositivo. Basta criar sua conta e começar.' },
    { q: 'Meus dados ficam seguros?',         a: 'Sim. Hospedados no Supabase (infraestrutura AWS), criptografados e isolados por conta. Nunca compartilhamos.' },
    { q: 'Funciona para mais de uma loja?',   a: 'Sim. Você cadastra quantas lojas quiser e filtra por loja em todo o painel.' },
    { q: 'Como importo meus pedidos?',        a: 'Com o arquivo CSV gerado pelo painel de pedidos da sua plataforma. Importa em 1 clique, sem configuração.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa, sem burocracia. Você pode cancelar ou fazer downgrade quando quiser.' },
    { q: 'Qual a diferença dos planos?',      a: 'O plano gratuito cobre até 200 pedidos/mês. Planos pagos desbloqueiam mais pedidos, exportação XLSX, relatórios PDF e API.' },
  ];

  return (
    <PublicLayout showAlertBar>

      {/* ── BLOCO 1 — ATENÇÃO ─────────────────────────── */}
      <section className="bg-white pt-20 pb-16 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-semibold text-core-black tracking-tight leading-[1.1] mb-5">
            Chega de planilha.<br />
            <span className="text-core-green">Sua Empresa merece um sistema.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Controle pedidos, estoque, finanças e tarefas — tudo em um único painel, atualizado em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Começar grátis
              <ArrowRight size={15} />
            </Link>
            <button
              onClick={() => demoRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-xl border border-slate-200 transition-colors text-sm"
            >
              Ver demonstração
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Shield size={11} /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={11} /> Setup em 5 minutos</span>
            <span className="flex items-center gap-1.5"><Clock size={11} /> Relatórios em tempo real</span>
          </div>
        </div>
      </section>

      {/* ── BLOCO 2 — INTERESSE (Visual) ──────────────── */}
      <section ref={demoRef} id="demo" className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">O sistema</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Tudo que você precisa, num único painel
          </h2>
          <DashboardMockup />
        </div>
      </section>

      {/* ── BLOCO 3 — DESEJO / Emocional ──────────────── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">As dores</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Você ainda gerencia assim?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {painCards.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon size={16} className="text-slate-400" />
                </div>
                <p className="font-semibold text-slate-800 mb-2 text-sm">{title}</p>
                <p className="text-sm text-slate-400 leading-relaxed italic">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 rounded-2xl p-8 text-center">
            <p className="text-white text-xl font-semibold mb-3 tracking-tight">
              Existe uma saída — e não custa uma fortuna.
            </p>
            <p className="text-slate-400 text-sm max-w-lg mx-auto leading-relaxed">
              O Core foi criado para quem quer dados reais sobre o próprio negócio, sem complexidade.
            </p>
          </div>
        </div>
      </section>

      {/* ── BLOCO 4 — DESEJO / Lógico ─────────────────── */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Como funciona</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Em 3 passos — simples assim
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-12">
            {[
              { icon: Upload,     step: '01', title: 'Importe seus pedidos',      desc: 'Baixe o relatório de pedidos e importe com 1 clique. Compatível com múltiplos formatos.' },
              { icon: Monitor,    step: '02', title: 'Veja tudo em tempo real',   desc: 'Estoque, DRE, KPIs e ranking de produtos são calculados automaticamente a cada importação.' },
              { icon: TrendingUp, step: '03', title: 'Tome decisões com dados',   desc: 'Curva ABC, calculadora de preço e relatório mensal te dizem exatamente onde focar.' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="bg-white rounded-xl p-6 border border-slate-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-core-black rounded-lg flex items-center justify-center">
                      <Icon size={16} className="text-core-green" />
                    </div>
                    <span className="text-xs font-semibold text-slate-400 tracking-widest">{s.step}</span>
                  </div>
                  <p className="font-semibold text-slate-800 mb-2 text-sm">{s.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Tudo incluso</p>
            <div className="grid grid-cols-3 gap-3">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2.5 border border-slate-200 text-xs text-slate-600 font-medium">
                  <Icon size={13} className="text-slate-400 flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── BLOCO 5 — DESEJO / Racional ───────────────── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Por que Core</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Por que Core e não as alternativas?
          </h2>
          <div className="overflow-x-auto mb-12">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Recurso</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Planilha</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">ERP Genérico</th>
                  <th className="text-center py-3 px-4 text-core-green font-semibold">Core</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rec} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 px-4 text-slate-700">{row.rec}</td>
                    <td className="py-2.5 px-4 text-center"><Cell value={row.plan} /></td>
                    <td className="py-2.5 px-4 text-center"><Cell value={row.erp} /></td>
                    <td className="py-2.5 px-4 text-center"><Cell value={row.core} isCore /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, title: 'Feito para vendedores',  desc: 'Não é um ERP genérico adaptado. Cada funcionalidade foi desenhada para quem vende online.' },
              { icon: Monitor,    title: 'Zero instalação',        desc: 'Roda no navegador. Funciona em celular, tablet e computador, sem instalar nada.' },
              { icon: Shield,     title: 'Seus dados são seus',    desc: 'Criptografados, isolados por conta. Nunca vendemos nem compartilhamos seus dados.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4 p-5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon size={16} className="text-slate-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm mb-1">{title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BLOCO 6 — AÇÃO ────────────────────────────── */}
      <section className="bg-core-black py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3">
              Você já tem um negócio.
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-core-green tracking-tight mb-6">
              O sistema certo é o único que faltava.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm"
            >
              Criar minha conta grátis
              <ArrowRight size={15} />
            </Link>
            <p className="text-slate-600 text-xs mt-3">Sem cartão · Cancele quando quiser</p>
          </div>

          <div className="max-w-2xl mx-auto">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-6 text-center">Dúvidas frequentes</p>
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {showPopup && <LeadPopup onClose={() => setShowPopup(false)} />}
    </PublicLayout>
  );
}
