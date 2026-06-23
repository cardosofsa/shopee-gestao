import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function Registro() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone]         = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2 mb-8">
          <Link to="/" className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full border-[1.5px] border-core-black" />
            <p className="font-light tracking-[0.32em] text-core-black text-lg select-none">CORE</p>
          </Link>
          <p className="text-slate-400 text-xs tracking-wide">Business Operating System</p>
        </div>

        {done ? (
          /* ── Confirmação de email ── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-core-sm p-8 text-center">
            <div className="w-12 h-12 bg-core-green/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={20} className="text-core-green" />
            </div>
            <h2 className="text-base font-semibold text-slate-800 mb-2">Verifique seu email</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              Enviamos um link de confirmação para <span className="font-medium text-slate-700">{email}</span>.
              Clique no link para ativar sua conta.
            </p>
            <div className="flex items-start gap-2.5 bg-slate-50 rounded-xl p-4 text-left">
              <CheckCircle size={14} className="text-core-green flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-500">
                Não recebeu? Verifique a pasta de spam ou{' '}
                <button
                  onClick={() => setDone(false)}
                  className="text-core-green underline underline-offset-2"
                >
                  tente outro email
                </button>
                .
              </p>
            </div>
          </div>
        ) : (
          /* ── Formulário ── */
          <div className="bg-white rounded-2xl border border-slate-200 shadow-core-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Criar conta gratuita</h2>
            <p className="text-xs text-slate-400 mb-5">Sem cartão de crédito · Cancele quando quiser</p>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-60 mb-4"
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400">ou</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Senha</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Confirmar senha</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-core-green hover:bg-core-green-h text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
              >
                {loading ? 'Criando conta...' : 'Criar minha conta →'}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-5">
              Já tem conta?{' '}
              <Link to="/login" className="text-core-green hover:underline font-medium">
                Entrar
              </Link>
            </p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/" className="hover:text-slate-600 transition-colors">← Voltar ao site</Link>
        </p>
      </div>
    </div>
  );
}
