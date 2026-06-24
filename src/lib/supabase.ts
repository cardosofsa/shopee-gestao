import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anon) {
  console.warn(
    '[Supabase] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não definidas — modo offline ativo.'
  );
}

export const supabase = createClient(url ?? 'http://localhost', anon ?? 'anon');
