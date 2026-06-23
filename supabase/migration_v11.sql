-- Migration v11: lojas configuráveis por usuário
begin;
alter table configuracoes add column if not exists lojas text[] default array['Minha Loja'];
commit;
