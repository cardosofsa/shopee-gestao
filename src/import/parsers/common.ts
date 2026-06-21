import type { StatusPedido } from '../../types';

export function mapearStatus(s: string): StatusPedido {
  const l = s.toLowerCase();
  if (l.includes('a enviar') || l.includes('para entregar') || l.includes('pendente')) return 'Em processo';
  if (l.includes('enviado') || l.includes('em trânsito')) return 'Enviado';
  if (l.includes('devolv') || l.includes('retorn') || l.includes('reembolso')) return 'Devolvido';
  return 'Concluído';
}
