// Edge Function: send-invoice
// Chamada manualmente ou via webhook quando uma subscription é criada/renovada.
//
// Setup:
//   1. supabase secrets set RESEND_API_KEY=re_xxxx
//   2. supabase functions deploy send-invoice
//   3. Chame via POST com body: { user_email, user_name, plan_nome, price_brl, periodo_fim }
//      Ou configure webhook na tabela subscriptions (INSERT + UPDATE status=active)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// Troque pelo seu domínio verificado quando disponível (ex: financeiro@coregestor.com.br)
const FROM = Deno.env.get('RESEND_FROM') ?? 'CORE Financeiro <onboarding@resend.dev>';

interface InvoicePayload {
  user_email: string;
  user_name?: string;
  plan_nome: string;
  price_brl: number;
  periodo_fim: string;
}

serve(async (req) => {
  try {
    const payload = (await req.json()) as InvoicePayload;
    const { user_email, user_name, plan_nome, price_brl, periodo_fim } = payload;

    const name = user_name ?? user_email.split('@')[0];
    const priceFmt = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price_brl);
    const periodoFmt = new Date(periodo_fim).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Recibo CORE</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0a0a0a;padding:24px 32px;display:flex;align-items:center;gap:12px">
      <div style="width:24px;height:24px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.4)"></div>
      <span style="color:#fff;font-weight:300;letter-spacing:0.28em;font-size:13px">CORE</span>
    </div>
    <div style="padding:32px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">Recibo de assinatura</p>
      <h1 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#0f172a">
        Obrigado, ${name}!
      </h1>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;border:1px solid #e2e8f0;margin-bottom:24px">
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:13px;color:#64748b">Plano</span>
          <span style="font-size:13px;font-weight:600;color:#0f172a">${plan_nome}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:12px">
          <span style="font-size:13px;color:#64748b">Período</span>
          <span style="font-size:13px;color:#0f172a">até ${periodoFmt}</span>
        </div>
        <div style="border-top:1px solid #e2e8f0;margin:12px 0;padding-top:12px;display:flex;justify-content:space-between">
          <span style="font-size:14px;font-weight:600;color:#0f172a">Total</span>
          <span style="font-size:18px;font-weight:700;color:#10b981">${priceFmt}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#64748b;line-height:1.6;margin:0">
        Sua assinatura está ativa e todos os módulos do seu plano estão disponíveis.
        Em caso de dúvidas, basta responder este email.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#94a3b8">
        CORE Gestão · Cancele quando quiser sem multa
      </p>
    </div>
  </div>
</body>
</html>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [user_email],
        subject: `Recibo CORE — plano ${plan_nome} ativo ✅`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(err, { status: 500 });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
