import { createContext, useContext, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface AdminCtx {
  isAdmin: boolean;
  isChecking: boolean;
}

const AdminContext = createContext<AdminCtx>({ isAdmin: false, isChecking: true });

export function useAdminCtx() {
  return useContext(AdminContext);
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        if (!cancelled) {
          setIsAdmin(false);
          setIsChecking(false);
        }
        return;
      }
      try {
        const { data } = await supabase.rpc('is_admin');
        if (!cancelled) {
          setIsAdmin(data === true);
          setIsChecking(false);
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
          setIsChecking(false);
        }
      }
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return <AdminContext.Provider value={{ isAdmin, isChecking }}>{children}</AdminContext.Provider>;
}
