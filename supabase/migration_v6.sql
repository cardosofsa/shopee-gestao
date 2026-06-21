-- migration_v6: tokens de integração Google Calendar
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: usa IF NOT EXISTS

begin;

-- ── Tabela ────────────────────────────────────────────────────
create table if not exists google_calendar_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  calendar_id   text not null default 'primary',
  -- access_token vem da sessão Supabase (provider_token) — não armazenado aqui por segurança.
  -- Apenas metadados de configuração são persistidos.
  sync_enabled  boolean not null default true,
  last_sync_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────
alter table google_calendar_tokens enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'google_calendar_tokens' and policyname = 'gcal_owner'
  ) then
    create policy gcal_owner on google_calendar_tokens
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_gcal_tokens_user on google_calendar_tokens(user_id);

-- ── Verificação ───────────────────────────────────────────────
do $$
declare
  tbl_ok boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_name = 'google_calendar_tokens'
  ) into tbl_ok;

  if tbl_ok then
    raise notice 'migration_v6 OK — google_calendar_tokens criada.';
  else
    raise exception 'migration_v6 FALHOU — tabela não encontrada.';
  end if;
end $$;

commit;
