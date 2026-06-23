-- Migration v12: lojas livres — remove CHECK constraints hardcoded
-- Contexto: migration_v11 adicionou lojas[] às configuracoes.
-- Agora removemos os CHECKs fixos de loja nas tabelas operacionais
-- para que qualquer nome de loja possa ser usado.
--
-- A regra 'Projetando' continua válida no trigger trg_mov_pedido (migration_v3)
-- pois é uma convenção de negócio, não um constraint de banco.
begin;

-- produtos
alter table produtos
  drop constraint if exists chk_produto_loja,
  drop constraint if exists produtos_loja_check;

-- despesas
alter table despesas
  drop constraint if exists chk_despesa_loja,
  drop constraint if exists despesas_loja_check;

-- pedidos (apenas default, não tinha CHECK explícito, mas por segurança)
alter table pedidos alter column loja set default 'Minha Loja';
alter table compras alter column loja set default 'Minha Loja';

commit;
