import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Store } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" className="flex-shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else setRegistered(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 bg-shopee-500 rounded-xl flex items-center justify-center">
            <Store size={20} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-lg leading-tight">Gestão Shopee</p>
            <p className="text-slate-400 text-xs">Cardoso e-Shop</p>
          </div>
        </div>

        <div className="card p-6">
          {registered ? (
            <div className="text-center py-4">
              <p className="text-emerald-600 font-semibold mb-2">Conta criada!</p>
              <p className="text-slate-500 text-sm">Verifique seu e-mail para confirmar o cadastro, depois faça login.</p>
              <button className="btn-primary mt-4 w-full" onClick={() => { setMode('login'); setRegistered(false); }}>
                Ir para o login
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1 mb-5">
                {(['login', 'register'] as const).map((m) => (
                  <button key={m} onClick={() => { setMode(m); setError(''); }}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    {m === 'login' ? 'Entrar' : 'Criar conta'}
                  </button>
                ))}
              </div>

              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">E-mail</label>
                  <input
                    type="email" className="input" placeholder="seu@email.com"
                    value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Senha</label>
                  <input
                    type="password" className="input" placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-slate-400 text-xs">ou</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="flex items-center justify-center gap-3 w-full border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                {googleLoading ? 'Redirecionando...' : 'Continuar com Google'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          Seus dados ficam salvos com segurança no Supabase.
        </p>
      </div>
    </div>
  );
}
