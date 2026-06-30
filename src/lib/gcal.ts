import type { Tarefa } from '../types';
import { supabase } from './supabase';

// ── ICS generation ────────────────────────────────────────────

function icsEscape(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function toICSDate(dateStr: string): string {
  return dateStr.split('-').join('');
}

function nowICSTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function nextDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('');
}

function nextDayISO(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(y, m - 1, d + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-');
}

const PRIORITY_MAP: Record<string, number> = { alta: 1, media: 5, baixa: 9 };

export function buildICS(tarefas: Tarefa[]): string {
  const now = nowICSTimestamp();

  const events = tarefas
    .filter((t) => !!t.dataVencimento)
    .map((t) => {
      const lines = [
        'BEGIN:VEVENT',
        `UID:${t.id}@coregestor`,
        `DTSTAMP:${now}`,
        `DTSTART;VALUE=DATE:${toICSDate(t.dataVencimento!)}`,
        `DTEND;VALUE=DATE:${nextDay(t.dataVencimento!)}`,
        `SUMMARY:${icsEscape(t.titulo)}`,
        t.descricao ? `DESCRIPTION:${icsEscape(t.descricao)}` : '',
        `PRIORITY:${PRIORITY_MAP[t.prioridade] ?? 5}`,
        `STATUS:${t.coluna === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
        'END:VEVENT',
      ];
      return lines.filter(Boolean).join('\r\n');
    });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Core Gestor//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Core Gestor — Tarefas',
    'X-WR-TIMEZONE:America/Sao_Paulo',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadICS(tarefas: Tarefa[], filename = 'tarefas-shopee.ics') {
  const content = buildICS(tarefas);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Google Calendar OAuth ─────────────────────────────────────
// Requer: Google OAuth habilitado no Supabase Dashboard com o
// escopo "https://www.googleapis.com/auth/calendar" adicionado.
// Settings → Auth → Providers → Google → Additional scopes.

export async function connectGoogleCalendar(): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar',
      redirectTo: `${window.location.origin}/configs`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  return { error: error?.message };
}

export async function getCalendarToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.provider_token ?? null;
}

export async function disconnectGoogleCalendar(): Promise<void> {
  const uid = (await supabase.auth.getUser()).data.user?.id;
  if (uid) await supabase.from('google_calendar_tokens').delete().eq('user_id', uid);
}

// ── Google Calendar API ───────────────────────────────────────
// Requer access token válido de connectGoogleCalendar().

export async function pushToGoogleCalendar(
  accessToken: string,
  tarefas: Tarefa[],
  calendarId = 'primary'
): Promise<{ pushed: number; errors: number }> {
  const pending = tarefas.filter((t) => !!t.dataVencimento && t.coluna !== 'done');
  let pushed = 0;
  let errors = 0;

  for (const t of pending) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            summary: t.titulo,
            description: t.descricao || undefined,
            start: { date: t.dataVencimento },
            end: { date: nextDayISO(t.dataVencimento!) },
            source: { title: 'Core Gestor', url: window.location.origin },
          }),
        }
      );
      if (res.ok) pushed++;
      else errors++;
    } catch {
      errors++;
    }
  }

  return { pushed, errors };
}
