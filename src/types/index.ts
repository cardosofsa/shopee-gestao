export type StatusPedido = 'Em processo' | 'Enviado' | 'Concluído' | 'Devolvido';
export type CategoriaDespesa = string;
export type StatusEstoque = 'Comprar' | 'Estoque Baixo' | 'Estoque Estável' | 'Estoque Acima';
export type PrioridadeTarefa = 'baixa' | 'media' | 'alta';
export type ColunaTarefa = 'todo' | 'in_progress' | 'done';

export interface Produto {
  sku: string;
  nome: string;
  categoria: string;
  loja: 'Cardoso e-Shop' | 'Projetando' | 'Ambas';
  custoUnitario: number;
  estoqueSeguranca: number;
  estoqueAtual: number;
  ativo: boolean;
}

export interface Pedido {
  id: string;
  numeroPedido: string;
  data: string;
  status: StatusPedido;
  loja: string;
  sku: string;
  produto: string;
  quantidade: number;
  multiplicadorKit: number;
  unidadesEstoque: number;
  receita: number;
  desconto: number;
  custoTotal: number;
  taxaShopee: number;
  dasImposto: number;
  adsMarketing: number;
  lucroOperacional: number;
  margemSCustoProduto: number;
  margemSCustoTotal: number;
  observacoes?: string;
}

export interface AjusteEstoque {
  id: string;
  sku: string;
  produto: string;
  tipo: 'entrada' | 'saida';
  quantidade: number;
  estoqueAntes: number;
  estoqueDepois: number;
  motivo: string;
  criadoEm: string;
}

export interface Compra {
  id: string;
  sku: string;
  produto: string;
  data: string;
  quantidadeEntrada: number;
  custoUnitario: number;
  custoTotal: number;
  fornecedor: string;
  nfRef: string;
  pagamento: string;
  parcelas: number;
  valorParcela: number;
  loja: string;
  observacoes: string;
}

export interface Despesa {
  id: string;
  data: string;
  categoria: CategoriaDespesa;
  descricao: string;
  valor: number;
  loja: 'Cardoso e-Shop' | 'Projetando' | 'Ambas';
  compraRef?: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string;
  coluna: ColunaTarefa;
  posicao: number;
  dataVencimento?: string;
  prioridade: PrioridadeTarefa;
  criadoEm: string;
}

export interface HistoricoMensal {
  mesAno: string;
  faturamentoBruto: number;
  pedidosQtd: number;
  ticketMedio: number;
  unidadesVendidas: number;
  cmv: number;
  taxasShopee: number;
  dasImposto: number;
  marketingAds: number;
  despesasOperacionais: number;
  lucroBruto: number;
  lucroOperacional: number;
  lucroLiquido: number;
  margemPercentual: number;
}

export interface Configuracoes {
  aliquotaDAS: number;
  percentualMarketing: number;
  metaFaturamento?: number;
  metaMargem?: number;
  nomeEmpresa?: string;
  tipoEmpresa?: 'MEI' | 'ME' | 'EPP';
  cnpj?: string;
}

export interface PrecificacaoSalva {
  id: string;
  nome: string;
  skuRef?: string;
  custo: number;
  embalagem: number;
  frete: number;
  comissaoShopee: number;
  taxaFixa: number;
  aliquotaDAS: number;
  percentualAds: number;
  margemDesejada: number;
  modo: 'shopee' | 'avancado';
  preco: number;
  margemReal: number;
  lucro: number;
  criadoEm: string;
}

export interface CalculadoraDraft {
  modo: 'shopee' | 'avancado';
  modoReverso: boolean;
  skuRef: string;
  custo: number;
  embalagem: number;
  frete: number;
  percentualAds: number;
  aliquotaDAS: number;
  margemDesejada: number;
  comissaoShopee: number;
  taxaFixa: number;
  precoVenda: number;
}

export interface KPIs {
  faturamentoMes: number;
  pedidosMes: number;
  lucroOperacionalMes: number;
  despesasMes: number;
  ticketMedioMes: number;
  lucroLiquidoMes: number;
}

export interface RankingProduto {
  sku: string;
  produto: string;
  loja: string;
  pedidos: number;
  unidades: number;
  receita: number;
  ticketMedio: number;
  taxaShopee: number;
  lucroOperacional: number;
  margem: number;
  percentReceita: number;
  curvaABC: 'A' | 'B' | 'C' | '—';
}
