-- ──────────────────────────────────────────────────────────────────────────────
-- Migration v16 — Ordens de Serviço + Programa de Indicação
-- ──────────────────────────────────────────────────────────────────────────────
begin;

-- ── Ordens de Serviço ────────────────────────────────────────────────────────
create table if not exists public.ordens_servico (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  titulo         text        not null default '',
  descricao      text,
  cliente_nome   text,
  cliente_tel    text,
  status         text        not null default 'aberta'
    check (status in ('aberta','em_analise','orcada','aprovada','em_execucao','concluida','entregue')),
  prioridade     text        not null default 'normal'
    check (prioridade in ('baixa','normal','alta','urgente')),
  valor_orcado   numeric(10,2),
  valor_final    numeric(10,2),
  data_entrada   date        not null default current_date,
  data_prevista  date,
  data_conclusao date,
  tecnico        text,
  observacoes    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.ordens_servico enable row level security;

create policy os_owner on public.ordens_servico
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_os_user_status on public.ordens_servico(user_id, status);

create trigger trg_updated_at_os
  before update on public.ordens_servico
  for each row execute procedure update_updated_at_column();

-- ── Programa de Indicação ────────────────────────────────────────────────────
create table if not exists public.referral_codes (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  code       text        unique not null,
  used_count int         not null default 0,
  created_at timestamptz not null default now()
);

alter table public.referral_codes enable row level security;

-- Usuário lê apenas o próprio código
create policy referral_owner_read on public.referral_codes
  for select using (user_id = auth.uid());

-- Admin lê todos
create policy referral_admin_read on public.referral_codes
  for select using (public.is_admin());

create table if not exists public.referral_uses (
  id          uuid        primary key default gen_random_uuid(),
  code        text        not null references public.referral_codes(code) on delete cascade,
  referred_id uuid        not null references auth.users(id) on delete cascade,
  rewarded    boolean     not null default false,
  created_at  timestamptz not null default now(),
  unique (referred_id)
);

alter table public.referral_uses enable row level security;

create policy referral_uses_admin on public.referral_uses
  for all using (public.is_admin());

-- RPC: obtém ou cria código de indicação para o usuário atual
create or replace function public.get_or_create_referral_code()
returns text language plpgsql security definer
set search_path = public
as $$
declare
  v_code    text;
  v_user_id uuid := auth.uid();
begin
  -- Retorna código existente
  select code into v_code from public.referral_codes where user_id = v_user_id;
  if found then return v_code; end if;

  -- Gera novo código único (8 chars alfanumérico maiúsculo)
  loop
    v_code := upper(substr(translate(encode(gen_random_bytes(6), 'base64'), '+/=', 'ABC'), 1, 8));
    begin
      insert into public.referral_codes (user_id, code) values (v_user_id, v_code);
      exit;
    exception when unique_violation then
      -- tenta novamente com código diferente
    end;
  end loop;

  return v_code;
end;
$$;

-- RPC: registra uso de código de indicação (chamado no registro)
create or replace function public.use_referral_code(p_code text)
returns boolean language plpgsql security definer
set search_path = public
as $$
declare
  v_referred uuid := auth.uid();
  v_owner    uuid;
begin
  -- Evita auto-indicação
  select user_id into v_owner from public.referral_codes where code = upper(p_code);
  if not found then return false; end if;
  if v_owner = v_referred then return false; end if;

  -- Registra o uso
  insert into public.referral_uses (code, referred_id)
  values (upper(p_code), v_referred)
  on conflict (referred_id) do nothing;

  -- Incrementa contador
  update public.referral_codes set used_count = used_count + 1 where code = upper(p_code);

  return true;
end;
$$;

commit;
