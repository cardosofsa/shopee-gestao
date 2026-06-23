import { supabase } from './supabase';

export type LeadOrigem = 'landing' | 'lancamento' | 'popup';

export interface InsertLeadInput {
  nome: string;
  email?: string;
  telefone?: string;
  origem: LeadOrigem;
}

export async function insertLead(data: InsertLeadInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('leads').insert([{
    nome: data.nome.trim(),
    email: data.email?.trim() || null,
    telefone: data.telefone?.trim() || null,
    origem: data.origem,
  }]);
  if (error) {
    console.error('[leads] insert error:', error);
    return { error: error.message };
  }
  return { error: null };
}
