# Plano de Projeto - Gestão Shopee App (Atualizado)

Este é o plano de tarefas local para controle de progresso e dependências das tarefas do projeto.

## Overview
Desenvolvimento de um aplicativo de controle de estoque, tarefas operacionais e dashboard de vendas integrado com Supabase local para consolidar os dados da planilha de Gestão Shopee do cliente.

---

## Project Type
WEB (React/Vite + Supabase)

---

## Success Criteria
- Banco de dados Supabase estruturado e rodando localmente com as tabelas de Lojas, Produtos, Vendas (Pedidos), Compras, Tarefas (Kanban) e Histórico.
- Importador automático de planilha/CSV funcional.
- Painel visual interativo sem tons de roxo/violeta (Purple Ban).
- Atualização do inventário automática baseada em triggers reativas do banco de dados (Em processo, Enviado, Devolvido).
- DRE histórico mensal consolidada e interativa.
- Quadro Kanban estilo Trello para gestão de tarefas operacionais.
- Calculadora de Precificação interativa integrada com regras fiscais e taxa de comissão da Shopee + 2% de Ads.

---

## Tech Stack
- Frontend: React (Vite, TypeScript, Tailwind CSS)
- Gráficos: Recharts
- Ícones: Lucide React
- Backend: Supabase Local (PostgreSQL)
- Conexão: `@supabase/supabase-js`

---

## Task Breakdown

### Fase 1: Setup Local
- **[ ]** `task_1`: Inicializar projeto React/Vite com TypeScript e Tailwind CSS.
  - **Agent:** `frontend-specialist`
  - **Skills:** `app-builder`, `clean-code`
  - **Priority:** High
  - **Dependencies:** Nenhuma
  - **INPUT:** Pasta do projeto vazia
  - **OUTPUT:** Estrutura base do frontend rodando na porta 5173
  - **VERIFY:** `npm run dev` abre sem erros.

- **[ ]** `task_2`: Configurar Supabase Local e Migrações de Banco.
  - **Agent:** `database-architect`
  - **Skills:** `database-design`
  - **Priority:** High
  - **Dependencies:** Nenhuma
  - **INPUT:** CLI do Supabase instalada no ambiente
  - **OUTPUT:** Tabelas, Enums e Triggers de estoque criadas localmente no PostgreSQL
  - **VERIFY:** Executar `supabase status` e verificar tabelas no painel local do Supabase.

### Fase 2: Mapeamento de Dados e Importação
- **[ ]** `task_3`: Desenvolver Script de Importação Inicial.
  - **Agent:** `backend-specialist`
  - **Skills:** `python-patterns`, `database-design`
  - **Priority:** Medium
  - **Dependencies:** `task_2`
  - **INPUT:** Arquivo `Planilha Gestão Shopee.xlsx`
  - **OUTPUT:** Dados existentes na planilha migrados com sucesso para as tabelas do Supabase local
  - **VERIFY:** Consultar quantidade de SKUs e vendas inseridos via Supabase Dashboard local.

- **[ ]** `task_4`: Criar Interface e Lógica de Importação de Vendas (CSV).
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_2`
  - **INPUT:** CSV exportado da Shopee ou nova planilha do usuário
  - **OUTPUT:** Componente de upload que mapeia colunas e insere linhas na tabela `pedidos`
  - **VERIFY:** Realizar upload de teste e conferir registros criados no banco.

### Fase 3: Logística e Fluxo de Estoque
- **[ ]** `task_5`: Implementar Triggers de Atualização de Estoque no Supabase.
  - **Agent:** `database-architect`
  - **Skills:** `database-design`
  - **Priority:** High
  - **Dependencies:** `task_2`
  - **INPUT:** Tabelas criadas no banco de dados
  - **OUTPUT:** Regras em PL/pgSQL disparadas nas mudanças de status dos pedidos
  - **VERIFY:** Inserir pedido com status `Enviado` e validar decremento na tabela `produtos`. Inserir/alterar para `Devolvido` e validar incremento (estorno).

- **[ ]** `task_6`: Tela de Gestão de Estoque e Compras.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_5`
  - **INPUT:** Componentes de listagem e formulário de entrada (compras)
  - **OUTPUT:** Tela de produtos mostrando status visual (OK, Crítico, Ruptura) baseado em fórmulas e formulário de registro de novas compras
  - **VERIFY:** Registrar compra e verificar aumento do estoque correspondente.

### Fase 4: Kanban (Trello) e Calculadora
- **[ ]** `task_7`: Desenvolver Quadro Kanban (Trello-style) para Tarefas.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_2`
  - **INPUT:** Tabela de tarefas cadastrada no Supabase
  - **OUTPUT:** Tela interativa com colunas "A Fazer", "Em Andamento" e "Concluído", permitindo arrastar, adicionar, editar e remover tarefas
  - **VERIFY:** Mover uma tarefa e validar a atualização persistida no banco do Supabase local.

- **[ ]** `task_8`: Implementar Calculadora de Precificação Shopee.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`
  - **INPUT:** Formulário com taxas padrão (Comissão, DAS, Taxa Fixa, Ads 2%)
  - **OUTPUT:** Tela de precificação interativa mostrando margem ideal, preço ideal sugerido e lucro líquido estimado
  - **VERIFY:** Comparar simulação com o Excel da Shopee para o mesmo SKU.

### Fase 5: Dashboards e Financeiro
- **[ ]** `task_9`: Tela de Gestão de Vendas.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_4`
  - **INPUT:** Tabelas de pedidos e botões de ação rápida para alteração de status
  - **OUTPUT:** Tela de vendas com filtros por status/loja e possibilidade de alterar o status dos pedidos individualmente
  - **VERIFY:** Alterar status de uma venda de `Em processo` para `Enviado` e ver mudança instantânea.

- **[ ]** `task_10`: Dashboard de Indicadores e Gráficos.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_9`
  - **INPUT:** Recharts + dados de receita e lucro
  - **OUTPUT:** Cards de KPIs, Gráfico de faturamento mensal, gráfico de lucro e curva ABC de SKUs
  - **VERIFY:** Filtrar dashboard por loja e validar se os dados mudam coerentemente.

- **[ ]** `task_11`: Histórico Financeiro e DRE.
  - **Agent:** `frontend-specialist`
  - **Skills:** `frontend-design`
  - **Priority:** Medium
  - **Dependencies:** `task_1`, `task_3`
  - **INPUT:** Tabela DRE consolidada semelhante à planilha
  - **OUTPUT:** Grid interativo de DRE mensal (Faturamento, CMV, Taxas, DAS, Marketing, Lucro Operacional, Margem %)
  - **VERIFY:** Comparar valores do DRE gerado no app com a planilha original do mês atual.

### Fase X: Verificação
- **[ ]** `task_12`: Executar verificação automatizada e auditorias.
  - **Agent:** `qa-automation-engineer`
  - **Skills:** `testing-patterns`, `webapp-testing`
  - **Priority:** High
  - **Dependencies:** Todas as anteriores
  - **INPUT:** App rodando em ambiente local
  - **OUTPUT:** Logs e relatórios de auditoria limpos
  - **VERIFY:** Executar script de verificação global `verify_all.py`.

---

## Phase X: Verification Checklist
- [ ] No purple/violet hex codes used in the interface
- [ ] No generic layouts used for dashboard
- [ ] All database triggers successfully tested
- [ ] Port/Build checks passing (`npm run build`)
