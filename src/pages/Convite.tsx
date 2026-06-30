import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../contexts/AuthContext';
import { dbOrgInvites } from '../lib/db';
import { useStore } from '../store';

export default function Convite() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const loadOrganization = useStore((s) => s.loadOrganization);

  const token = new URLSearchParams(location.search).get('token') ?? '';

  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (loading || !token) return;
    if (!user) {
      navigate(`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`, {
        replace: true,
      });
      return;
    }
    if (status !== 'idle') return;

    setStatus('accepting');
    dbOrgInvites
      .accept(token, user.id)
      .then(() => loadOrganization(user.id))
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      })
      .catch((err: unknown) => {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Convite inválido ou expirado.');
      });
  }, [loading, user, token, status, location, navigate, loadOrganization]);

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center space-y-4">
          <XCircle size={40} className="text-red-400 mx-auto" />
          <h1 className="text-lg font-semibold text-slate-800">Link inválido</h1>
          <p className="text-sm text-slate-500">
            O link de convite não contém um token válido. Peça ao administrador um novo link.
          </p>
          <Link to="/" className="inline-block text-sm text-core-green hover:underline">
            Ir para o início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-md w-full text-center space-y-4">
        {(status === 'idle' || status === 'accepting') && (
          <>
            <Loader2 size={40} className="text-core-green mx-auto animate-spin" />
            <h1 className="text-lg font-semibold text-slate-800">Aceitando convite…</h1>
            <p className="text-sm text-slate-500">Aguarde um instante.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
            <h1 className="text-lg font-semibold text-slate-800">Convite aceito!</h1>
            <p className="text-sm text-slate-500">
              Você agora faz parte da equipe. Redirecionando…
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto" />
            <h1 className="text-lg font-semibold text-slate-800">Convite inválido</h1>
            <p className="text-sm text-slate-500">{errorMsg}</p>
            <Link to="/" className="inline-block text-sm text-core-green hover:underline">
              Ir para o início
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
