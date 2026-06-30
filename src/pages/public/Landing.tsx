import {
  ArrowRight, BarChart2, Calculator, Calendar, CalendarDays,
  Check, CheckCircle, ChevronDown, ChevronUp,
  Clock, DollarSign,
  FileSpreadsheet, FileText, LineChart, Monitor, Package, PackageX,
  Shield, Store, TrendingDown, TrendingUp, Upload, X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import PublicLayout from '../../components/public/PublicLayout';
import { insertLead } from '../../lib/leads';

// ─── Dashboard mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div className="rounded-2xl border border-slate-200 shadow-2xl overflow-hidden select-none">
      <div className="bg-slate-100 px-4 py-2.5 flex items-center gap-3 border-b border-slate-200">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <div className="flex-1 max-w-[220px] mx-auto bg-white rounded-md px-3 py-1 text-xs text-slate-400 text-center">
          app.coregestor.com.br
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
                i === 0 ? 'bg-core-green/20 text-core-green' : 'text-slate-500'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-core-green' : 'bg-slate-700'}`} />
              {item}
            </div>
          ))}
        </div>
        <div className="flex-1 bg-slate-50 p-4 overflow-hidden">
          <p className="text-[11px] font-semibold text-slate-800 mb-3">Dashboard</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'Faturamento', value: 'R$ 12.480', trend: '+18%', up: true },
              { label: 'Lucro líquido', value: 'R$ 3.215', trend: '+9%', up: true },
              { label: 'Pedidos', value: '84', trend: '-3%', up: false },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-lg p-2.5 border border-slate-100">
                <p className="text-[9px] text-slate-400 mb-0.5">{k.label}</p>
                <p className="text-xs font-semibold text-slate-800">{k.value}</p>
                <p className={`text-[9px] mt-0.5 font-medium ${k.up ? 'text-emerald-500' : 'text-red-400'}`}>
                  {k.trend} vs mês ant.
                </p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-slate-100 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Últimas vendas</p>
              <span className="text-[8px] text-core-green font-medium">Ao vivo</span>
            </div>
            {[
              { sku: 'FITA-BIKE', receita: 'R$ 89,90', status: 'Concluído', cor: 'text-emerald-600 bg-emerald-50' },
              { sku: 'ALF-118',   receita: 'R$ 45,00', status: 'Enviado',   cor: 'text-amber-600 bg-amber-50' },
              { sku: 'CANMAD',    receita: 'R$ 67,50', status: 'Concluído', cor: 'text-emerald-600 bg-emerald-50' },
            ].map((row) => (
              <div key={row.sku} className="px-3 py-1.5 flex items-center justify-between border-b border-slate-50 last:border-0">
                <span className="text-[9px] font-mono text-slate-600">{row.sku}</span>
                <span className="text-[9px] font-semibold text-slate-800">{row.receita}</span>
                <span className={`text-[8px] font-medium px-1.5 py-0.5 rounded-full ${row.cor}`}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
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

// ─── Lead popup ───────────────────────────────────────────────────────────────
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
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

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('');
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// ─── Landing page ─────────────────────────────────────────────────────────────
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
      iconBg: 'bg-red-50',
      iconColor: 'text-red-400',
      borderColor: 'border-red-100',
      title: 'Planilha desatualizada',
      desc: '"Qual era o saldo de ontem mesmo? Preciso abrir o arquivo, atualizar as fórmulas..."',
    },
    {
      icon: PackageX,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-100',
      title: 'Estoque no chute',
      desc: '"Vendi algo que não tinha em estoque. Agora tenho que cancelar o pedido."',
    },
    {
      icon: TrendingDown,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-400',
      borderColor: 'border-orange-100',
      title: 'Fim do mês: lucro ou prejuízo?',
      desc: '"Faturei R$ 15 mil, mas não sei se tive lucro ou prejuízo de verdade."',
    },
  ];

  type Cell = 'check' | 'x' | string;
  const tableRows: { rec: string; plan: Cell; erp: Cell; core: Cell }[] = [
    { rec: 'Import automático de pedidos', plan: 'x',        erp: 'x',              core: 'check'      },
    { rec: 'Estoque atualizado',           plan: 'x',        erp: 'Parcial',        core: 'check'      },
    { rec: 'DRE + Curva ABC',              plan: 'Manual',   erp: 'R$ 300+/mês',    core: 'Incluso'    },
    { rec: 'Multi-loja',                   plan: 'Manual',   erp: 'R$ 500+/mês',    core: 'Incluso'    },
    { rec: 'Setup',                        plan: 'Horas',    erp: 'Dias',           core: '5 minutos'  },
    { rec: 'Preço',                        plan: '"Grátis"', erp: 'R$ 200–800/mês', core: 'R$ 0'       },
  ];

  function Cell({ value, isCore }: { value: Cell; isCore?: boolean }) {
    if (value === 'check') return <Check size={14} className="mx-auto text-core-green" />;
    if (value === 'x')     return <X     size={14} className="mx-auto text-slate-300" />;
    return <span className={isCore ? 'text-core-green font-semibold' : 'text-slate-400'}>{value}</span>;
  }

  const faqs = [
    { q: 'Preciso instalar alguma coisa?',     a: 'Não. O Core roda 100% no navegador, em qualquer dispositivo. Basta criar sua conta e começar.' },
    { q: 'Meus dados ficam seguros?',          a: 'Sim. Hospedados no Supabase (infraestrutura AWS), criptografados e isolados por conta. Nunca compartilhamos.' },
    { q: 'Funciona para mais de uma loja?',    a: 'Sim. Você cadastra quantas lojas quiser e filtra por loja em todo o painel.' },
    { q: 'Quais plataformas são suportadas?',   a: 'Shopee (relatório nativo do Seller Center), UpSeller e planilhas genéricas. Suporte a Mercado Livre e outros está em desenvolvimento.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa, sem burocracia. Você pode cancelar ou fazer downgrade quando quiser.' },
    { q: 'Qual a diferença dos planos?',       a: 'O plano gratuito cobre até 200 pedidos/mês. Planos pagos desbloqueiam mais pedidos, exportação XLSX, relatórios PDF e API.' },
  ];

  const testimonials = [
    {
      nome: 'Ana Paula S.',
      negocio: 'E-commerce de moda · Shopee',
      avatarColor: 'bg-violet-500',
      texto: '"Antes eu perdia horas em planilha no fim do mês sem saber se tinha lucrado. Agora abro o CORE e em 30 segundos já sei exatamente como fechei."',
      stars: 5,
    },
    {
      nome: 'Ricardo M.',
      negocio: 'Atacado de eletrônicos · SP',
      avatarColor: 'bg-blue-500',
      texto: '"A curva ABC me mostrou que 3 produtos respondiam por 60% do meu lucro. Cortei os outros e a margem dobrou. Nunca teria descoberto isso na planilha."',
      stars: 5,
    },
    {
      nome: 'Fernanda O.',
      negocio: 'Loja de cosméticos · MG',
      avatarColor: 'bg-pink-500',
      texto: '"Setup foi literalmente 5 minutos. Importei meu CSV do Shopee e já tinha meu dashboard funcionando. Muito mais fácil do que esperava."',
      stars: 5,
    },
  ];

  return (
    <PublicLayout showAlertBar>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative bg-white pt-20 pb-16 px-4 text-center overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-core-green/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-core-green/10 border border-core-green/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-core-green animate-pulse" />
            <span className="text-xs font-semibold text-core-green tracking-wide">Shopee · UpSeller · Outros formatos · Grátis para começar</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-semibold text-core-black tracking-tight leading-[1.1] mb-5">
            Chega de planilha.<br />
            <span className="text-core-green">Sua empresa merece um sistema.</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto mb-8 leading-relaxed">
            Saiba quanto você realmente ganha em cada pedido, SKU e campanha — com DAS, taxas e custo de produto já descontados. Importe em segundos e tome decisões com dados reais.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <Link
              to="/registro"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-core-green/20"
            >
              Começar grátis
              <ArrowRight size={15} />
            </Link>
            <button
              onClick={() => demoRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-xl border border-slate-200 transition-colors text-sm"
            >
              Ver demonstração
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><Shield size={11} className="text-slate-300" /> Sem cartão de crédito</span>
            <span className="flex items-center gap-1.5"><CheckCircle size={11} className="text-slate-300" /> Setup em 5 minutos</span>
            <span className="flex items-center gap-1.5"><Clock size={11} className="text-slate-300" /> Relatórios em tempo real</span>
          </div>
        </div>
      </section>

      {/* ── DEMO ────────────────────────────────────────── */}
      <section ref={demoRef} id="demo" className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">O sistema</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Tudo que você precisa, num único painel
          </h2>
          <DashboardMockup />
        </div>
      </section>

      {/* ── AS DORES ────────────────────────────────────── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">As dores</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Você ainda gerencia assim?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {painCards.map(({ icon: Icon, iconBg, iconColor, borderColor, title, desc }) => (
              <div key={title} className={`bg-slate-50 rounded-xl p-5 border ${borderColor}`}>
                <div className={`w-9 h-9 ${iconBg} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon size={17} className={iconColor} />
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

      {/* ── COMO FUNCIONA ───────────────────────────────── */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Como funciona</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Em 3 passos — simples assim
          </h2>
          <div className="grid sm:grid-cols-3 gap-6 mb-14">
            {[
              { icon: Upload,     step: '01', title: 'Importe seus pedidos',      desc: 'Baixe o relatório CSV do Seller Center — Shopee nativo, UpSeller e planilha genérica suportados. Importa em 1 clique.' },
              { icon: Monitor,    step: '02', title: 'Veja tudo em tempo real',   desc: 'Estoque, DRE, KPIs e ranking de produtos são calculados automaticamente a cada importação.' },
              { icon: TrendingUp, step: '03', title: 'Tome decisões com dados',   desc: 'Curva ABC, calculadora de preço e relatório mensal te dizem exatamente onde focar.' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="bg-white rounded-xl p-6 border border-slate-200 relative">
                  <span className="absolute top-4 right-4 text-2xl font-bold text-slate-100 select-none leading-none">{s.step}</span>
                  <div className="w-9 h-9 bg-core-black rounded-lg flex items-center justify-center mb-4">
                    <Icon size={16} className="text-core-green" />
                  </div>
                  <p className="font-semibold text-slate-800 mb-2 text-sm">{s.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">Tudo incluso</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2.5 border border-slate-200 text-xs text-slate-600 font-medium">
                  <Icon size={13} className="text-core-green flex-shrink-0" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── POR QUE CORE ────────────────────────────────── */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Por que Core</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Por que Core e não as alternativas?
          </h2>
          <div className="overflow-x-auto mb-12 rounded-xl border border-slate-200">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Recurso</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">Planilha</th>
                  <th className="text-center py-3 px-4 text-slate-400 font-medium">ERP Genérico</th>
                  <th className="text-center py-3 px-4 text-core-green font-semibold bg-core-green/5">Core</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row, i) => (
                  <tr key={row.rec} className={`border-b border-slate-100 last:border-0 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="py-2.5 px-4 text-slate-700 font-medium text-xs sm:text-sm">{row.rec}</td>
                    <td className="py-2.5 px-4 text-center"><Cell value={row.plan} /></td>
                    <td className="py-2.5 px-4 text-center"><Cell value={row.erp} /></td>
                    <td className="py-2.5 px-4 text-center bg-core-green/5"><Cell value={row.core} isCore /></td>
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
                <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <Icon size={16} className="text-core-green" />
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

      {/* ── DEPOIMENTOS ─────────────────────────────────── */}
      <section className="bg-slate-50 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Quem já usa</p>
          <h2 className="text-2xl sm:text-3xl font-semibold text-core-black text-center tracking-tight mb-10">
            Vendedores reais, resultados reais
          </h2>
          <div className="grid sm:grid-cols-3 gap-5">
            {testimonials.map(({ nome, negocio, avatarColor, texto, stars }) => (
              <div key={nome} className="bg-white rounded-xl p-5 border border-slate-200 flex flex-col gap-4 hover:shadow-md transition-shadow">
                <div className="flex gap-0.5">
                  {Array.from({ length: stars }).map((_, i) => (
                    <span key={i} className="text-amber-400 text-sm">★</span>
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed flex-1 italic">{texto}</p>
                <div className="flex items-center gap-3 pt-1 border-t border-slate-100">
                  <Avatar name={nome} color={avatarColor} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{nome}</p>
                    <p className="text-xs text-slate-400">{negocio}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 bg-core-black rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold text-sm">Junte-se a centenas de vendedores</p>
              <p className="text-slate-400 text-xs mt-0.5">que já pararam de gerenciar no chute</p>
            </div>
            <Link
              to="/registro"
              className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm whitespace-nowrap shadow-lg shadow-core-green/20"
            >
              Começar agora <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────── */}
      <section className="relative bg-core-black py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-core-green/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-3">
              Você já tem um negócio.
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-core-green tracking-tight mb-8">
              O sistema certo é o único que faltava.
            </p>
            <Link
              to="/registro"
              className="inline-flex items-center gap-2 px-8 py-4 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm shadow-xl shadow-core-green/30"
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
