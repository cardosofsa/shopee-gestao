import { Navigate } from 'react-router-dom';

import { useAdminCtx } from '../contexts/AdminContext';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin, isChecking } = useAdminCtx();

  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-core-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}
