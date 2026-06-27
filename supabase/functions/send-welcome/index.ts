// Edge Function: send-welcome
// Dispara quando um novo usuário é criado via webhook do Supabase Auth.
//
// Setup:
//   1. Crie uma conta em resend.com e gere uma API Key
//   2. supabase secrets set RESEND_API_KEY=re_xxxx
//   3. supabase functions deploy send-welcome
//   4. No Supabase Dashboard → Webhooks → Novo webhook:
//        - Tabela: auth.users  Evento: INSERT
//        - URL: https://<project-ref>.supabase.co/functions/v1/send-welcome

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
// Troque pelo seu domínio verificado quando disponível (ex: noreply@coregestor.com.br)
const FROM = Deno.env.get('RESEND_FROM') ?? 'CORE <onboarding@resend.dev>';
const APP_URL = Deno.env.get('APP_URL') ?? 'https://coregestao.com.br';

serve(async (req) => {
  try {
    const body = await req.json();
    const user = body.record as { id: string; email: string };
    if (!user?.email) return new Response('no email', { status: 400 });

    const firstName = user.email.split('@')[0].split('.')[0];
    const name = firstName.charAt(0).toUpperCase() + firstName.slice(1);

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><title>Bem-vindo ao CORE</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#0a0a0a;padding:24px 32px;display:flex;align-items:center;gap:12px">
      <div style="width:24px;height:24px;border-radius:50%;border:1.5px solid rgba(255,255,255,0.4)"></div>
      <span style="color:#fff;font-weight:300;letter-spacing:0.28em;font-size:13px">CORE</span>
    </div>
    <div style="padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a">
        Bem-vindo ao CORE, ${name}! 🎉
      </h1>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.6">
        Sua conta está pronta. Importe seus pedidos e descubra exatamente quanto seu negócio está lucrando — em menos de 5 minutos.
      </p>
      <a href="${APP_URL}"
         style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px">
        Acessar o CORE →
      </a>
      <div style="margin-top:28px;padding-top:20px;border-top:1px solid #f1f5f9">
        <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em">
          Primeiros passos
        </p>
        <ul style="margin:0;padding:0 0 0 16px;color:#475569;font-size:13px;line-height:1.8">
          <li>Importe seu relatório de pedidos (CSV do Shopee ou Excel)</li>
          <li>Configure seu segmento e ative os módulos que precisa</li>
          <li>Veja seu DRE e Curva ABC em tempo real</li>
        </ul>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center">
      <p style="margin:0;font-size:11px;color:#94a3b8">
        Você recebeu este email porque criou uma conta no CORE.<br>
        Dúvidas? Responda este email.
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
        to: [user.email],
        subject: `Bem-vindo ao CORE, ${name}! 🚀`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return new Response(err, { status: 500 });
    }

    return new Response(JSON.stringify({ sent: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(String(e), { status: 500 });
  }
});
