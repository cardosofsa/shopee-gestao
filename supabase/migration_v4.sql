-- migration_v4: tabela de log de importações
-- Execute no Supabase Dashboard → SQL Editor
-- Idempotente: usa IF NOT EXISTS

begin;

-- ── Tabela ────────────────────────────────────────────────────
create table if not exists importacoes_log (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  importado_em timestamptz not null default now(),
  formato      text not null check (formato in ('shopee_nativo', 'upseller', 'generico')),
  total        integer not null,
  novos        integer not null,
  duplicados   integer not null,
  loja         text
);

-- ── RLS ───────────────────────────────────────────────────────
alter table importacoes_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'importacoes_log' and policyname = 'importacoes_log_owner'
  ) then
    create policy importacoes_log_owner on importacoes_log
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;

-- ── Índices ───────────────────────────────────────────────────
create index if not exists idx_importacoes_user on importacoes_log(user_id, importado_em desc);

-- ── Verificação ───────────────────────────────────────────────
do $$
declare
  tbl_ok boolean;
begin
  select exists (
    select 1 from information_schema.tables
    where table_name = 'importacoes_log'
  ) into tbl_ok;

  if tbl_ok then
    raise notice 'migration_v4 OK — importacoes_log criada.';
  else
    raise exception 'migration_v4 FALHOU — tabela não encontrada.';
  end if;
end $$;

commit;
