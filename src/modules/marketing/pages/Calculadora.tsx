import {
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Info,
  Percent,
  RotateCcw,
  Save,
  Tag,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '../../../components/Toast';
import { useStore } from '../../../store';
import type { PrecificacaoSalva } from '../../../types';
import { fmt, fmtPct } from '../../../utils/calculations';

// ─── Shopee fee tiers ────────────────────────────────────────────────────────

const SHOPEE_TIERS = [
  { label: 'Até R$79,99', min: 0, max: 79.99, fixed: 4 },
  { label: 'R$80–R$99,99', min: 80, max: 99.99, fixed: 16 },
  { label: 'R$100–R$199,99', min: 100, max: 199.99, fixed: 20 },
  { label: 'Acima de R$200', min: 200, max: Infinity, fixed: 26 },
];

// ─── Calculation helpers ──────────────────────────────────────────────────────

function solvePreco(
  totalCusto: number,
  fixo: number,
  com: number,
  ads: number,
  das: number,
  mg: number
) {
  const denom = 1 - com - ads - das - mg;
  if (denom <= 0) return null;
  return (totalCusto + fixo) / denom;
}

function calcShopeeTiered(
  custo: number,
  embalagem: number,
  frete: number,
  ads: number,
  das: number,
  mg: number
) {
  const com = 0.18;
  const totalCusto = custo + embalagem + frete;
  for (const tier of SHOPEE_TIERS) {
    const preco = solvePreco(totalCusto, tier.fixed, com, ads, das, mg);
    if (preco === null) return null;
    if (preco >= tier.min && preco <= tier.max) return { preco, tier };
  }
  const last = SHOPEE_TIERS[SHOPEE_TIERS.length - 1];
  const preco = solvePreco(totalCusto, last.fixed, com, ads, das, mg);
  return preco !== null ? { preco, tier: last } : null;
}

type CalcResult = {
  preco: number;
  taxaShopee: number;
  adsVal: number;
  dasVal: number;
  lucro: number;
  margemReal: number;
  totalCusto: number;
  com: number;
  fixo: number;
  tier: (typeof SHOPEE_TIERS)[0] | null;
};

function computeCalc(params: {
  custo: number;
  embalagem: number;
  frete: number;
  comissaoShopee: number;
  taxaFixa: number;
  aliquotaDAS: number;
  percentualAds: number;
  margemDesejada: number;
  modo: 'shopee' | 'avancado';
}): CalcResult | null {
  const {
    custo,
    embalagem,
    frete,
    comissaoShopee,
    taxaFixa,
    aliquotaDAS,
    percentualAds,
    margemDesejada,
    modo,
  } = params;
  const ads = percentualAds / 100;
  const das = aliquotaDAS / 100;
  const mg = margemDesejada / 100;
  const totalCusto = custo + embalagem + frete;

  let preco: number,
    com: number,
    fixo: number,
    tier: (typeof SHOPEE_TIERS)[0] | null = null;

  if (modo === 'shopee') {
    const res = calcShopeeTiered(custo, embalagem, frete, ads, das, mg);
    if (!res) return null;
    ({ preco, tier } = res);
    com = 0.18;
    fixo = res.tier.fixed;
  } else {
    com = comissaoShopee / 100;
    fixo = taxaFixa;
    const p = solvePreco(totalCusto, fixo, com, ads, das, mg);
    if (p === null) return null;
    preco = p;
  }

  const taxaShopee = preco * com + fixo;
  const adsVal = preco * ads;
  const dasVal = preco * das;
  const lucro = preco - totalCusto - taxaShopee - adsVal - dasVal;
  const margemReal = lucro / preco;

  return { preco, taxaShopee, adsVal, dasVal, lucro, margemReal, totalCusto, com, fixo, tier };
}

function calcPrecoSim(
  preco: number,
  totalCusto: number,
  com: number,
  fixo: number,
  ads: number,
  das: number
) {
  const taxa = preco * com + fixo;
  const adsV = preco * ads;
  const dasV = preco * das;
  const lucro = preco - totalCusto - taxa - adsV - dasV;
  return { lucro, margem: (lucro / preco) * 100 };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SliderField({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.5,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            className="w-16 px-2 py-1 border border-slate-200 rounded-md text-xs text-right text-slate-800 focus:outline-none focus:ring-1 focus:ring-core-green/40"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          />
          <Percent size={11} className="text-slate-400 flex-shrink-0" />
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="w-full h-1.5 rounded-full accent-[#18B37A] cursor-pointer"
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function MargemGauge({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100);
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 60" className="w-36">
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength="100"
        />
        <path
          d="M 12 52 A 38 38 0 0 1 88 52"
          fill="none"
          stroke="white"
          strokeWidth="9"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray={`${clamped} 100`}
          style={{ opacity: 0.9 }}
        />
        <text x="50" y="46" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">
          {pct.toFixed(1)}%
        </text>
        <text x="10" y="58" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.5)">
          0%
        </text>
        <text x="90" y="58" textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.5)">
          100%
        </text>
      </svg>
      <p className="text-[11px] text-white/80 -mt-0.5">Margem Líquida</p>
    </div>
  );
}

function StackedBar({
  items,
}: {
  items: { label: string; value: number; pct: number; barColor: string; textColor: string }[];
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-7 rounded-lg overflow-hidden w-full">
        {items
          .filter((i) => i.pct > 0)
          .map((item) => (
            <div
              key={item.label}
              style={{ width: `${Math.max(item.pct, 0.5)}%` }}
              className={`${item.barColor} border-r border-white/40 last:border-0 flex-shrink-0 transition-all`}
              title={`${item.label}: ${fmt(item.value)} (${item.pct.toFixed(1)}%)`}
            />
          ))}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-sm flex-shrink-0 ${item.barColor}`} />
            <span className="text-xs text-slate-600 flex-1">{item.label}</span>
            <span className={`text-xs font-semibold ${item.textColor}`}>{fmt(item.value)}</span>
            <span className="text-xs text-slate-400 w-10 text-right">{item.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Calculadora() {
  const toast = useToast();
  const configuracoes = useStore((s) => s.configuracoes);
  const produtos = useStore((s) => s.produtos);
  const precificacoesSalvas = useStore((s) => s.precificacoesSalvas);
  const savePrecificacao = useStore((s) => s.savePrecificacao);
  const deletePrecificacao = useStore((s) => s.deletePrecificacao);
  const draft = useStore((s) => s.calculadoraDraft);
  const setDraft = useStore((s) => s.setCalculadoraDraft);

  // Inicializa com o draft salvo (se existir) ou com defaults
  const [modo, setModo] = useState<'shopee' | 'avancado'>(draft?.modo ?? 'shopee');
  const [modoReverso, setModoReverso] = useState(draft?.modoReverso ?? false);
  const [skuRef, setSkuRef] = useState(draft?.skuRef ?? '');
  const [custo, setCusto] = useState(draft?.custo ?? 6.08);
  const [embalagem, setEmbalagem] = useState(draft?.embalagem ?? 0);
  const [frete, setFrete] = useState(draft?.frete ?? 0);
  const [percentualAds, setPercentualAds] = useState(
    draft?.percentualAds ?? configuracoes.percentualMarketing
  );
  const [aliquotaDAS, setAliquotaDAS] = useState(draft?.aliquotaDAS ?? configuracoes.aliquotaDAS);
  const [margemDesejada, setMargemDesejada] = useState(draft?.margemDesejada ?? 30);
  const [comissaoShopee, setComissaoShopee] = useState(draft?.comissaoShopee ?? 18);
  const [taxaFixa, setTaxaFixa] = useState(draft?.taxaFixa ?? 0);
  const [precoVenda, setPrecoVenda] = useState(draft?.precoVenda ?? 0);

  // Persiste o formulário ativo no store sempre que qualquer campo muda.
  useEffect(() => {
    setDraft({
      modo,
      modoReverso,
      skuRef,
      custo,
      embalagem,
      frete,
      percentualAds,
      aliquotaDAS,
      margemDesejada,
      comissaoShopee,
      taxaFixa,
      precoVenda,
    });
  }, [
    modo,
    modoReverso,
    skuRef,
    custo,
    embalagem,
    frete,
    percentualAds,
    aliquotaDAS,
    margemDesejada,
    comissaoShopee,
    taxaFixa,
    precoVenda,
    setDraft,
  ]);

  // UI state
  const [copied, setCopied] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showSaved, setShowSaved] = useState(false);
  const [showTierInfo, setShowTierInfo] = useState(false);

  // ── Core calculations ────────────────────────────────────────────────────

  const calc = useMemo(
    () =>
      computeCalc({
        custo,
        embalagem,
        frete,
        comissaoShopee,
        taxaFixa,
        aliquotaDAS,
        percentualAds,
        margemDesejada,
        modo,
      }),
    [
      custo,
      embalagem,
      frete,
      comissaoShopee,
      taxaFixa,
      aliquotaDAS,
      percentualAds,
      margemDesejada,
      modo,
    ]
  );

  const calcReverso = useMemo(() => {
    if (!modoReverso || precoVenda <= 0) return null;
    const ads = percentualAds / 100;
    const das = aliquotaDAS / 100;
    const totalCusto = custo + embalagem + frete;
    let com: number, fixo: number;
    if (modo === 'shopee') {
      com = 0.18;
      const tier =
        SHOPEE_TIERS.find((t) => precoVenda >= t.min && precoVenda <= t.max) ??
        SHOPEE_TIERS[SHOPEE_TIERS.length - 1];
      fixo = tier.fixed;
    } else {
      com = comissaoShopee / 100;
      fixo = taxaFixa;
    }
    const taxaShopee = precoVenda * com + fixo;
    const adsVal = precoVenda * ads;
    const dasVal = precoVenda * das;
    const lucro = precoVenda - totalCusto - taxaShopee - adsVal - dasVal;
    return {
      lucro,
      margemReal: (lucro / precoVenda) * 100,
      taxaShopee,
      adsVal,
      dasVal,
      totalCusto,
    };
  }, [
    modoReverso,
    precoVenda,
    custo,
    embalagem,
    frete,
    percentualAds,
    aliquotaDAS,
    comissaoShopee,
    taxaFixa,
    modo,
  ]);

  const simulacao = useMemo(() => {
    if (!calc) return [];
    const bases = [0.85, 0.9, 0.95, 1, 1.05, 1.1, 1.2].map((m) => calc.preco * m);
    return bases.map((p) => {
      const ads = percentualAds / 100;
      const das = aliquotaDAS / 100;
      let com: number, fixo: number;
      if (modo === 'shopee') {
        com = 0.18;
        const tier =
          SHOPEE_TIERS.find((t) => p >= t.min && p <= t.max) ??
          SHOPEE_TIERS[SHOPEE_TIERS.length - 1];
        fixo = tier.fixed;
      } else {
        com = comissaoShopee / 100;
        fixo = taxaFixa;
      }
      return { preco: p, ...calcPrecoSim(p, calc.totalCusto, com, fixo, ads, das) };
    });
  }, [calc, percentualAds, aliquotaDAS, comissaoShopee, taxaFixa, modo]);

  const maxSimMargem = useMemo(
    () => Math.max(...simulacao.map((s) => Math.max(s.margem, 0)), 1),
    [simulacao]
  );

  // ── Stacked bar data ─────────────────────────────────────────────────────

  const stackedItems = calc
    ? [
        {
          label: 'Custo Total',
          value: calc.totalCusto,
          pct: (calc.totalCusto / calc.preco) * 100,
          barColor: 'bg-red-400',
          textColor: 'text-red-500',
        },
        {
          label: 'Comissão Shopee',
          value: calc.taxaShopee,
          pct: (calc.taxaShopee / calc.preco) * 100,
          barColor: 'bg-orange-400',
          textColor: 'text-orange-500',
        },
        {
          label: `Ads (${percentualAds}%)`,
          value: calc.adsVal,
          pct: (calc.adsVal / calc.preco) * 100,
          barColor: 'bg-amber-400',
          textColor: 'text-amber-500',
        },
        {
          label: `DAS (${aliquotaDAS}%)`,
          value: calc.dasVal,
          pct: (calc.dasVal / calc.preco) * 100,
          barColor: 'bg-slate-400',
          textColor: 'text-slate-500',
        },
        {
          label: 'Lucro Líquido',
          value: calc.lucro,
          pct: calc.margemReal * 100,
          barColor: 'bg-emerald-500',
          textColor: 'text-emerald-600',
        },
      ]
    : [];

  // ── Actions ──────────────────────────────────────────────────────────────

  const loadSku = (sku: string) => {
    const prod = produtos.find((p) => p.sku === sku);
    if (prod) setCusto(prod.custoUnitario);
  };

  const copyPrice = () => {
    if (!calc) return;
    navigator.clipboard.writeText(calc.preco.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    if (!calc || !saveName.trim()) return;
    const p: PrecificacaoSalva = {
      id: crypto.randomUUID(),
      nome: saveName.trim(),
      skuRef: skuRef || undefined,
      custo,
      embalagem,
      frete,
      comissaoShopee,
      taxaFixa,
      aliquotaDAS,
      percentualAds,
      margemDesejada,
      modo,
      preco: calc.preco,
      margemReal: calc.margemReal * 100,
      lucro: calc.lucro,
      criadoEm: new Date().toISOString(),
    };
    savePrecificacao(p);
    toast('Precificação salva!', 'success');
    setShowSave(false);
    setSaveName('');
    setShowSaved(true);
  };

  const loadPrecificacao = (p: PrecificacaoSalva) => {
    setModo(p.modo);
    setSkuRef(p.skuRef ?? '');
    setCusto(p.custo);
    setEmbalagem(p.embalagem);
    setFrete(p.frete);
    setComissaoShopee(p.comissaoShopee);
    setTaxaFixa(p.taxaFixa);
    setAliquotaDAS(p.aliquotaDAS);
    setPercentualAds(p.percentualAds);
    setMargemDesejada(p.margemDesejada);
    toast('Precificação carregada!', 'info');
  };

  const exportXLSX = async () => {
    if (!calc) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['Parâmetros', ''],
      ['Modo', modo === 'shopee' ? 'Shopee Padrão' : 'Avançado'],
      ['SKU', skuRef || '—'],
      ['Custo Produto', custo],
      ['Embalagem', embalagem],
      ['Frete/Transporte', frete],
      ['Total Custo', calc.totalCusto],
      ['Comissão Shopee', `${(calc.com * 100).toFixed(0)}%`],
      ['Taxa Fixa', calc.fixo],
      ['Ads/Marketing', `${percentualAds}%`],
      ['Alíquota DAS', `${aliquotaDAS}%`],
      ['Margem Desejada', `${margemDesejada}%`],
      ['', ''],
      ['Resultado', ''],
      ['Preço Ideal', calc.preco],
      ['Margem Real', `${(calc.margemReal * 100).toFixed(2)}%`],
      ['Lucro Líquido', calc.lucro],
      ['Comissão Shopee (R$)', calc.taxaShopee],
      ['Ads (R$)', calc.adsVal],
      ['DAS (R$)', calc.dasVal],
    ]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Precificação');
    const ws2 = XLSX.utils.aoa_to_sheet([
      ['Preço de Venda', 'Lucro Líquido', 'Margem (%)'],
      ...simulacao.map((s) => [s.preco.toFixed(2), s.lucro.toFixed(2), s.margem.toFixed(2)]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Simulação');
    XLSX.writeFile(wb, 'precificacao.xlsx');
  };

  const exportSalvasXLSX = async () => {
    if (!precificacoesSalvas.length) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      [
        'Nome',
        'SKU',
        'Modo',
        'Custo',
        'Embalagem',
        'Frete',
        'Alíquota DAS (%)',
        'Ads (%)',
        'Margem Desejada (%)',
        'Preço Ideal',
        'Margem Real (%)',
        'Lucro',
        'Salvo em',
      ],
      ...precificacoesSalvas.map((p) => [
        p.nome,
        p.skuRef ?? '',
        p.modo === 'shopee' ? 'Shopee Padrão' : 'Avançado',
        p.custo,
        p.embalagem,
        p.frete,
        p.aliquotaDAS,
        p.percentualAds,
        p.margemDesejada,
        p.preco,
        p.margemReal.toFixed(2),
        p.lucro.toFixed(2),
        p.criadoEm.slice(0, 10),
      ]),
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Precificações Salvas');
    XLSX.writeFile(wb, 'precificacoes-salvas.xlsx');
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Calculadora de Precificação</h1>
          <p className="text-slate-500 text-sm">Precifique com base nas taxas reais da Shopee</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {calc && (
            <button
              onClick={exportXLSX}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Download size={14} /> Exportar XLSX
            </button>
          )}
          {calc && (
            <button
              onClick={() => {
                setSaveName(
                  skuRef
                    ? `${skuRef} — ${new Date().toLocaleDateString('pt-BR')}`
                    : `Cálculo ${new Date().toLocaleDateString('pt-BR')}`
                );
                setShowSave((v) => !v);
              }}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Save size={14} /> Salvar
            </button>
          )}
        </div>
      </div>

      {/* Save dialog */}
      {showSave && (
        <div className="card p-4 border-core-green/20 bg-core-green/5">
          <p className="text-sm font-medium text-slate-700 mb-2">Nome da precificação</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button className="btn-primary" onClick={handleSave} disabled={!saveName.trim()}>
              Salvar
            </button>
            <button className="btn-secondary" onClick={() => setShowSave(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Mode toggles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center bg-slate-100 rounded-lg p-1 gap-1">
          {(['shopee', 'avancado'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setModo(m)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                modo === m
                  ? 'bg-white text-core-green shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {m === 'shopee' ? 'Shopee Padrão' : 'Avançado'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModoReverso((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            modoReverso
              ? 'bg-amber-50 border-amber-300 text-amber-600'
              : 'border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <RotateCcw size={13} /> Modo Reverso
        </button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── Left: Params ── */}
        <div className="space-y-4">
          <div className="card p-5 space-y-5">
            <h2 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
              <Calculator size={15} /> Parâmetros
            </h2>

            {/* SKU ref */}
            <div>
              <label className="text-xs text-slate-500 mb-1.5 block">
                Carregar custo por SKU (opcional)
              </label>
              <select
                className="select"
                value={skuRef}
                onChange={(e) => {
                  setSkuRef(e.target.value);
                  loadSku(e.target.value);
                }}
              >
                <option value="">Selecionar SKU…</option>
                {produtos.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} — {p.nome} (R${p.custoUnitario.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            {/* Cost fields */}
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">Custos por Unidade (R$)</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Produto', value: custo, set: setCusto },
                  { label: 'Embalagem', value: embalagem, set: setEmbalagem },
                  { label: 'Frete/Transp.', value: frete, set: setFrete },
                ].map(({ label, value, set }) => (
                  <div key={label}>
                    <label className="text-xs text-slate-400 mb-1 block">{label}</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input text-sm"
                      value={value}
                      onChange={(e) => set(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                ))}
              </div>
              {(embalagem > 0 || frete > 0) && (
                <p className="text-xs text-slate-400 mt-2">
                  Total custo/unidade:{' '}
                  <span className="font-semibold text-slate-600">
                    {fmt(custo + embalagem + frete)}
                  </span>
                </p>
              )}
            </div>

            {/* Fee section */}
            {modo === 'shopee' ? (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info size={13} className="text-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-700">
                      Comissão Shopee: 18% + taxa por faixa de preço
                    </span>
                  </div>
                  <button
                    onClick={() => setShowTierInfo((v) => !v)}
                    className="text-blue-400 hover:text-blue-600"
                  >
                    {showTierInfo ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
                {showTierInfo && (
                  <div className="space-y-1 pt-1 border-t border-blue-100">
                    {SHOPEE_TIERS.map((t) => (
                      <div key={t.label} className="flex justify-between text-xs">
                        <span className="text-blue-500">{t.label}</span>
                        <span className="font-semibold text-blue-800">18% + R${t.fixed}</span>
                      </div>
                    ))}
                  </div>
                )}
                {calc?.tier && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-blue-100">
                    <Tag size={11} className="text-blue-500 flex-shrink-0" />
                    <span className="text-xs text-blue-700">
                      Faixa aplicada: <strong>18% + R${calc.tier.fixed}</strong>
                      <span className="text-blue-400"> ({calc.tier.label})</span>
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium">
                  Taxas Shopee (personalizadas)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Comissão (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="input pr-7"
                        value={comissaoShopee}
                        onChange={(e) => setComissaoShopee(parseFloat(e.target.value) || 0)}
                      />
                      <Percent
                        size={11}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Taxa Fixa (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input"
                      value={taxaFixa}
                      onChange={(e) => setTaxaFixa(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sliders */}
            <div className="space-y-4 pt-1 border-t border-slate-50">
              <SliderField
                label="Alíquota DAS (%)"
                value={aliquotaDAS}
                onChange={setAliquotaDAS}
                hint="Simples Nacional — varia conforme faixa de faturamento anual"
              />
              <SliderField
                label="Marketing / Ads (%)"
                value={percentualAds}
                onChange={setPercentualAds}
              />
              <SliderField
                label="Margem Desejada (%)"
                value={margemDesejada}
                onChange={setMargemDesejada}
                min={0}
                max={80}
              />
            </div>
          </div>

          {/* Reverse mode card */}
          {modoReverso && (
            <div className="card p-5 border-amber-200 bg-amber-50/30 space-y-4">
              <h3 className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                <RotateCcw size={14} /> Modo Reverso — Analisar Preço Existente
              </h3>
              <div>
                <label className="text-xs text-slate-500 mb-1.5 block">Preço de Venda (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={precoVenda || ''}
                  placeholder="0,00"
                  onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                />
              </div>
              {calcReverso && (
                <div className="space-y-3 pt-2 border-t border-amber-100">
                  <div
                    className={`text-center py-3 rounded-xl ${
                      calcReverso.margemReal >= 20
                        ? 'bg-emerald-50 border border-emerald-100'
                        : calcReverso.margemReal >= 10
                          ? 'bg-amber-50 border border-amber-100'
                          : 'bg-red-50 border border-red-100'
                    }`}
                  >
                    <p className="text-xs text-slate-400 mb-0.5">Margem resultante</p>
                    <p
                      className={`text-4xl font-bold ${
                        calcReverso.margemReal >= 20
                          ? 'text-emerald-600'
                          : calcReverso.margemReal >= 10
                            ? 'text-amber-500'
                            : 'text-red-500'
                      }`}
                    >
                      {calcReverso.margemReal.toFixed(1)}%
                    </p>
                    <p
                      className={`text-xs mt-1 ${calcReverso.lucro >= 0 ? 'text-slate-500' : 'text-red-500 font-medium'}`}
                    >
                      Lucro: {fmt(calcReverso.lucro)} / unidade
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(
                      [
                        ['Custo Total', calcReverso.totalCusto, 'text-slate-600'],
                        ['Comissão Shopee', calcReverso.taxaShopee, 'text-orange-500'],
                        ['Ads', calcReverso.adsVal, 'text-amber-500'],
                        ['DAS', calcReverso.dasVal, 'text-slate-400'],
                      ] as const
                    ).map(([l, v, c]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-slate-400">{l}</span>
                        <span className={c}>{fmt(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Result ── */}
        <div className="space-y-4">
          {calc ? (
            <>
              {/* Price card */}
              <div className="card p-5 bg-gradient-to-br from-core-green to-core-green-h text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-white/80 text-sm font-medium mb-2">Preço de Venda Ideal</p>
                    <p className="text-5xl font-bold leading-none">{fmt(calc.preco)}</p>
                    {modo === 'shopee' && calc.tier && (
                      <p className="text-white/70 text-xs mt-2.5">
                        Faixa: 18% + R${calc.tier.fixed} · {calc.tier.label}
                      </p>
                    )}
                    <button
                      onClick={copyPrice}
                      className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs transition-colors w-fit"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copiado!' : 'Copiar preço'}
                    </button>
                  </div>
                  <MargemGauge pct={calc.margemReal * 100} />
                </div>
              </div>

              {/* Decomposition */}
              <div className="card p-5 space-y-4">
                <h3 className="text-slate-700 font-semibold text-sm flex items-center gap-2">
                  <TrendingUp size={14} /> Decomposição do Preço ({fmt(calc.preco)})
                </h3>
                <StackedBar items={stackedItems} />
              </div>
            </>
          ) : (
            <div className="card p-10 text-center flex flex-col items-center gap-3 text-slate-400">
              <Calculator size={36} className="opacity-30" />
              <div>
                <p className="text-sm font-medium text-slate-500">Ajuste os parâmetros</p>
                <p className="text-xs mt-0.5">
                  A soma das taxas + margem não pode ultrapassar 100%
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Simulation table */}
      {calc && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-slate-700 font-semibold text-sm">Simulação de Preços</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Impacto no lucro com diferentes preços de venda
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Preço de Venda', 'Lucro Líquido', 'Margem', 'Indicação', ''].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {simulacao.map((s, i) => {
                  const isIdeal = i === 3;
                  return (
                    <tr key={i} className={isIdeal ? 'bg-core-green/5' : 'hover:bg-slate-50'}>
                      <td
                        className={`px-4 py-3 font-semibold ${isIdeal ? 'text-core-green' : 'text-slate-800'}`}
                      >
                        {fmt(s.preco)}
                        {isIdeal && (
                          <span className="text-xs bg-core-green/10 text-core-green px-1.5 py-0.5 rounded ml-2 font-medium">
                            ideal
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 font-medium ${s.lucro >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                      >
                        {fmt(s.lucro)}
                      </td>
                      <td
                        className={`px-4 py-3 font-semibold ${s.margem >= 30 ? 'text-emerald-600' : s.margem >= 15 ? 'text-amber-500' : 'text-red-500'}`}
                      >
                        {fmtPct(s.margem)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {s.margem >= 30
                          ? 'Excelente'
                          : s.margem >= 20
                            ? 'Bom'
                            : s.margem >= 10
                              ? 'Margem baixa'
                              : 'Prejuízo'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${s.margem >= 30 ? 'bg-emerald-400' : s.margem >= 15 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.max(0, s.margem / maxSimMargem) * 100}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Saved calculations */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowSaved((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Save size={15} className="text-slate-400" />
            <span className="text-slate-700 font-semibold text-sm">Precificações Salvas</span>
            {precificacoesSalvas.length > 0 && (
              <span className="bg-core-green/10 text-core-green text-xs font-semibold px-2 py-0.5 rounded-full">
                {precificacoesSalvas.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {precificacoesSalvas.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  exportSalvasXLSX();
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-core-green px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              >
                <Download size={12} /> Exportar todas
              </button>
            )}
            {showSaved ? (
              <ChevronUp size={16} className="text-slate-400" />
            ) : (
              <ChevronDown size={16} className="text-slate-400" />
            )}
          </div>
        </button>

        {showSaved &&
          (precificacoesSalvas.length === 0 ? (
            <div className="px-5 pb-6 text-center text-slate-300 text-sm">
              Nenhuma precificação salva ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {precificacoesSalvas.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 group transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">{p.nome}</p>
                      {p.skuRef && (
                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                          {p.skuRef}
                        </span>
                      )}
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${p.modo === 'shopee' ? 'bg-core-green/5 text-core-green' : 'bg-slate-100 text-slate-500'}`}
                      >
                        {p.modo === 'shopee' ? 'Shopee Padrão' : 'Avançado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Preço: <span className="font-semibold text-core-green">{fmt(p.preco)}</span>
                      {' · '}Margem:{' '}
                      <span className="font-semibold text-emerald-600">
                        {p.margemReal.toFixed(1)}%
                      </span>
                      {' · '}Custo: {fmt(p.custo)}
                      {p.embalagem > 0 && ` + emb. ${fmt(p.embalagem)}`}
                      {p.frete > 0 && ` + frete ${fmt(p.frete)}`}
                      {' · '}
                      {p.criadoEm.slice(0, 10)}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => loadPrecificacao(p)}
                      className="text-xs text-core-green hover:text-core-green font-medium px-2.5 py-1.5 rounded hover:bg-core-green/5 transition-colors"
                    >
                      Carregar
                    </button>
                    <button
                      onClick={() => {
                        deletePrecificacao(p.id);
                        toast('Precificação removida.', 'info');
                      }}
                      className="text-slate-300 hover:text-red-400 transition-colors p-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
