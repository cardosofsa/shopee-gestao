import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Shield, Users } from 'lucide-react';
import { insertLead } from '../../lib/leads';

// ─── CONFIG ─────────────────────────────────────────────
// Substitua com a data real do evento (formato ISO)
const LAUNCH_DATE = new Date('2026-07-22T20:00:00-03:00');
// Substitua com o link real do grupo WhatsApp
const WHATSAPP_LINK = '#'; // ex: 'https://chat.whatsapp.com/XXXXXXXX'
const TOTAL_VAGAS = 100;
const VAGAS_USADAS = 68; // atualize manualmente conforme os leads chegarem

// ─── Countdown ─────────────────────────────────────────
function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      dias:    Math.floor(diff / 86_400_000),
      horas:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutos: Math.floor((diff % 3_600_000) / 60_000),
      segundos: Math.floor((diff % 60_000) / 1_000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-white/[0.08] rounded-xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-white font-semibold text-2xl sm:text-3xl tabular-nums border border-white/10">
        {String(value).padStart(2, '0')}
      </div>
      <span className="text-xs text-slate-500 mt-2 uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────
export default function Lancamento() {
  const { dias, horas, minutos, segundos } = useCountdown(LAUNCH_DATE);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const vagasRestantes = TOTAL_VAGAS - VAGAS_USADAS;
  const pctUsado = (VAGAS_USADAS / TOTAL_VAGAS) * 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!nome.trim() || !telefone.trim()) return;
    setLoading(true);
    const { error: err } = await insertLead({ nome, telefone, origem: 'lancamento' });
    setLoading(false);
    if (err) {
      setError('Erro ao salvar. Tente novamente.');
      return;
    }
    setDone(true);
    // redireciona para o grupo após 1.5s
    setTimeout(() => {
      if (WHATSAPP_LINK !== '#') window.location.href = WHATSAPP_LINK;
    }, 1_500);
  }

  return (
    <div className="min-h-screen flex flex-col bg-core-black font-sans">
      <div className="bg-core-black border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full border border-white/40 flex-shrink-0" />
            <span className="font-light tracking-[0.28em] text-white text-[13px] select-none">CORE</span>
          </Link>
          <Link to="/registro" className="text-xs text-slate-500 hover:text-white transition-colors">
            Já tenho conta →
          </Link>
        </div>
      </div>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">

          {/* Countdown */}
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-6">
            Vagas encerram em
          </p>
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-10">
            <CountdownBlock value={dias}     label="dias"    />
            <span className="text-white/30 text-2xl font-light mb-4">:</span>
            <CountdownBlock value={horas}    label="horas"   />
            <span className="text-white/30 text-2xl font-light mb-4">:</span>
            <CountdownBlock value={minutos}  label="min"     />
            <span className="text-white/30 text-2xl font-light mb-4">:</span>
            <CountdownBlock value={segundos} label="seg"     />
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-4 leading-snug">
            Seja um dos {TOTAL_VAGAS} primeiros vendedores da Shopee a gerenciar tudo com um sistema de verdade.
          </h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Sem planilha, sem dor de cabeça. Acesso beta exclusivo para fundadores.
          </p>

          {/* Benefícios */}
          <div className="text-left space-y-2.5 mb-8">
            {[
              'Acesso beta antes do lançamento oficial',
              'Preço de fundador travado para sempre',
              'Suporte direto com o criador do sistema',
              'Influência nas próximas funcionalidades',
            ].map((b) => (
              <div key={b} className="flex items-center gap-3">
                <CheckCircle size={15} className="text-core-green flex-shrink-0" />
                <span className="text-sm text-slate-300">{b}</span>
              </div>
            ))}
          </div>

          {/* Formulário ou confirmação */}
          {done ? (
            <div className="bg-core-green/10 border border-core-green/30 rounded-2xl p-6 text-center">
              <CheckCircle size={28} className="text-core-green mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Você está dentro!</p>
              <p className="text-slate-400 text-sm">
                {WHATSAPP_LINK !== '#'
                  ? 'Redirecionando para o grupo...'
                  : 'Em breve você receberá o link do grupo via WhatsApp.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-core-green/50 focus:ring-1 focus:ring-core-green/30 transition-colors"
                placeholder="Seu nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
              <input
                className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-core-green/50 focus:ring-1 focus:ring-core-green/30 transition-colors"
                placeholder="WhatsApp (11) 99999-9999"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                required
              />
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-core-green hover:bg-core-green-h text-white font-semibold rounded-xl transition-colors text-sm disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'QUERO MEU ACESSO EXCLUSIVO →'}
              </button>
            </form>
          )}

          {!done && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-600 mt-3">
              <Shield size={10} />
              Seus dados não serão compartilhados. Usados somente para enviar o link do grupo.
            </p>
          )}

          {/* Barra de vagas */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <div className="flex items-center gap-1.5">
                <Users size={11} />
                <span>Vagas preenchidas</span>
              </div>
              <span className="text-white font-semibold">{VAGAS_USADAS} de {TOTAL_VAGAS}</span>
            </div>
            <div className="w-full bg-white/[0.06] rounded-full h-2">
              <div
                className="bg-core-green h-2 rounded-full transition-all"
                style={{ width: `${pctUsado}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">
              <span className="text-amber-400 font-semibold">{vagasRestantes} vagas</span> disponíveis
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 px-4 border-t border-white/10 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} Core · <Link to="/" className="hover:text-slate-400 transition-colors">Voltar ao site</Link>
      </footer>
    </div>
  );
}
