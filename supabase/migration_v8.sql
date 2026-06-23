-- migration_v8: tabela leads para captura de marketing
-- Execute no Supabase Dashboard → SQL Editor

begin;

create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  email      text,
  telefone   text,
  origem     text not null default 'landing'
             check (origem in ('landing', 'lancamento', 'popup')),
  created_at timestamptz not null default now()
);

-- RLS: qualquer pessoa pode inserir (lead não está autenticada)
-- apenas o serviço (service_role) pode ler
alter table leads enable row level security;

create policy leads_insert_public on leads
  for insert with check (true);

-- índices
create index if not exists idx_leads_origem  on leads(origem);
create index if not exists idx_leads_created on leads(created_at desc);
create index if not exists idx_leads_email   on leads(email) where email is not null;

commit;
