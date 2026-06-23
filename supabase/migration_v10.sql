-- Migration v10: ampliar configuracoes com todos os campos do tipo Configuracoes
-- Executar no Supabase SQL Editor

begin;

alter table configuracoes
  add column if not exists meta_faturamento  numeric(12,2),
  add column if not exists meta_margem       numeric(5,2),
  add column if not exists meta_pedidos      int,
  add column if not exists meta_lucro        numeric(12,2),
  add column if not exists nome_empresa      text,
  add column if not exists tipo_empresa      text,
  add column if not exists cnpj              text;

commit;
