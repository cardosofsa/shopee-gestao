import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../store';
import type { Pedido, Tarefa } from '../types';

// ─── Factory helpers ──────────────────────────────────────────────────────────

let _seq = 0;
function makeId() { return `test-${++_seq}`; }

function makePedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: makeId(),
    numeroPedido: `ORD${_seq}`,
    data: '2026-06-15',
    status: 'Em processo',
    loja: 'Ambas',
    sku: 'PROD-001',
    produto: 'Produto Exemplo A',
    quantidade: 1,
    multiplicadorKit: 1,
    unidadesEstoque: 1,
    receita: 50,
    desconto: 0,
    custoTotal: 10.00,
    taxaShopee: 5,
    dasImposto: 3,
    adsMarketing: 1,
    lucroOperacional: 31.00,
    margemSCustoProduto: 400,
    margemSCustoTotal: 62,
    observacoes: '',
    ...overrides,
  };
}

function makeTarefa(overrides: Partial<Tarefa> = {}): Tarefa {
  return {
    id: makeId(),
    titulo: 'Teste tarefa',
    descricao: '',
    coluna: 'todo',
    posicao: 0,
    prioridade: 'media',
    criadoEm: new Date().toISOString(),
    ...overrides,
  };
}

// ─── Reset de estado antes de cada teste ──────────────────────────────────────

beforeEach(() => {
  // resetToSeed restores produtos/tarefas/compras seeds and clears pedidos/despesas/ajustes
  useStore.getState().resetToSeed();
  // Ensure userId stays null so no Supabase calls happen
  useStore.setState({ userId: null });
});

// ─── toggleDarkMode ───────────────────────────────────────────────────────────

describe('toggleDarkMode', () => {
  it('alterna de false para true', () => {
    useStore.setState({ darkMode: false });
    useStore.getState().toggleDarkMode();
    expect(useStore.getState().darkMode).toBe(true);
  });

  it('alterna de true para false', () => {
    useStore.setState({ darkMode: true });
    useStore.getState().toggleDarkMode();
    expect(useStore.getState().darkMode).toBe(false);
  });

  it('duas alternâncias voltam ao estado original', () => {
    const initial = useStore.getState().darkMode;
    useStore.getState().toggleDarkMode();
    useStore.getState().toggleDarkMode();
    expect(useStore.getState().darkMode).toBe(initial);
  });
});

// ─── addPedido ────────────────────────────────────────────────────────────────

describe('addPedido', () => {
  it('pedido aparece no início da lista', () => {
    const p = makePedido();
    useStore.getState().addPedido(p);
    const pedidos = useStore.getState().pedidos;
    expect(pedidos[0].id).toBe(p.id);
  });

  it('adiciona ao topo (mais recente primeiro)', () => {
    const p1 = makePedido();
    const p2 = makePedido();
    useStore.getState().addPedido(p1);
    useStore.getState().addPedido(p2);
    const pedidos = useStore.getState().pedidos;
    expect(pedidos[0].id).toBe(p2.id);
    expect(pedidos[1].id).toBe(p1.id);
  });

  it('preserva todos os campos do pedido', () => {
    const p = makePedido({ receita: 99.99, sku: 'PROD-002' });
    useStore.getState().addPedido(p);
    const stored = useStore.getState().pedidos.find((x) => x.id === p.id);
    expect(stored?.receita).toBe(99.99);
    expect(stored?.sku).toBe('PROD-002');
  });
});

// ─── addPedidos (lote) ────────────────────────────────────────────────────────

describe('addPedidos', () => {
  it('adiciona múltiplos pedidos de uma vez', () => {
    const ps = [makePedido(), makePedido(), makePedido()];
    useStore.getState().addPedidos(ps);
    expect(useStore.getState().pedidos).toHaveLength(3);
  });

  it('pedidos ficam no topo da lista em ordem original do lote', () => {
    const p0 = makePedido();
    useStore.getState().addPedido(p0);
    const [p1, p2] = [makePedido(), makePedido()];
    useStore.getState().addPedidos([p1, p2]);
    const ids = useStore.getState().pedidos.map((p) => p.id);
    expect(ids[0]).toBe(p1.id);
    expect(ids[1]).toBe(p2.id);
    expect(ids[2]).toBe(p0.id);
  });
});

// ─── deletePedido ─────────────────────────────────────────────────────────────

describe('deletePedido', () => {
  it('remove o pedido pelo id', () => {
    const p = makePedido();
    useStore.getState().addPedido(p);
    useStore.getState().deletePedido(p.id);
    const found = useStore.getState().pedidos.find((x) => x.id === p.id);
    expect(found).toBeUndefined();
  });

  it('não afeta outros pedidos', () => {
    const p1 = makePedido();
    const p2 = makePedido();
    useStore.getState().addPedido(p1);
    useStore.getState().addPedido(p2);
    useStore.getState().deletePedido(p1.id);
    expect(useStore.getState().pedidos).toHaveLength(1);
    expect(useStore.getState().pedidos[0].id).toBe(p2.id);
  });

  it('deletar id inexistente não altera lista', () => {
    const p = makePedido();
    useStore.getState().addPedido(p);
    useStore.getState().deletePedido('nao-existe');
    expect(useStore.getState().pedidos).toHaveLength(1);
  });
});

// ─── updatePedidoStatus ───────────────────────────────────────────────────────

describe('updatePedidoStatus — mudança de status', () => {
  it('atualiza o status corretamente', () => {
    const p = makePedido({ status: 'Em processo' });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Concluído');
    const updated = useStore.getState().pedidos.find((x) => x.id === p.id);
    expect(updated?.status).toBe('Concluído');
  });

  it('id inexistente não lança erro', () => {
    expect(() => useStore.getState().updatePedidoStatus('nao-existe', 'Concluído')).not.toThrow();
  });
});

describe('updatePedidoStatus — efeito no estoque', () => {
  const FITA_BIKE_INITIAL = 10;

  beforeEach(() => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-002' ? { ...p, estoqueAtual: FITA_BIKE_INITIAL } : p,
      ),
    });
  });

  it('Em processo → Concluído desconta estoque', () => {
    const p = makePedido({ sku: 'PROD-002', status: 'Em processo', unidadesEstoque: 3 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Concluído');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(FITA_BIKE_INITIAL - 3);
  });

  it('Em processo → Enviado desconta estoque', () => {
    const p = makePedido({ sku: 'PROD-002', status: 'Em processo', unidadesEstoque: 2 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Enviado');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(FITA_BIKE_INITIAL - 2);
  });

  it('Concluído → Devolvido devolve estoque', () => {
    const p = makePedido({ sku: 'PROD-002', status: 'Concluído', unidadesEstoque: 4 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Devolvido');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(FITA_BIKE_INITIAL + 4);
  });

  it('Enviado → Devolvido devolve estoque', () => {
    const p = makePedido({ sku: 'PROD-002', status: 'Enviado', unidadesEstoque: 1 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Devolvido');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(FITA_BIKE_INITIAL + 1);
  });

  it('loja Projetando não afeta estoque', () => {
    const p = makePedido({ sku: 'PROD-002', status: 'Em processo', loja: 'Projetando', unidadesEstoque: 5 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Concluído');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(FITA_BIKE_INITIAL); // sem alteração
  });

  it('estoque não vai abaixo de zero', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-002' ? { ...p, estoqueAtual: 1 } : p,
      ),
    });
    const p = makePedido({ sku: 'PROD-002', status: 'Em processo', unidadesEstoque: 99 });
    useStore.getState().addPedido(p);
    useStore.getState().updatePedidoStatus(p.id, 'Concluído');
    const prod = useStore.getState().produtos.find((x) => x.sku === 'PROD-002');
    expect(prod?.estoqueAtual).toBe(0);
  });
});

// ─── updateEstoque ────────────────────────────────────────────────────────────

describe('updateEstoque', () => {
  it('delta positivo aumenta estoque', () => {
    const before = useStore.getState().produtos.find((p) => p.sku === 'PROD-001')!.estoqueAtual;
    useStore.getState().updateEstoque('PROD-001', 10);
    const after = useStore.getState().produtos.find((p) => p.sku === 'PROD-001')!.estoqueAtual;
    expect(after).toBe(before + 10);
  });

  it('delta negativo diminui estoque', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-001' ? { ...p, estoqueAtual: 20 } : p,
      ),
    });
    useStore.getState().updateEstoque('PROD-001', -5);
    const prod = useStore.getState().produtos.find((p) => p.sku === 'PROD-001');
    expect(prod?.estoqueAtual).toBe(15);
  });

  it('estoque não fica negativo', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-001' ? { ...p, estoqueAtual: 3 } : p,
      ),
    });
    useStore.getState().updateEstoque('PROD-001', -100);
    const prod = useStore.getState().produtos.find((p) => p.sku === 'PROD-001');
    expect(prod?.estoqueAtual).toBe(0);
  });

  it('SKU inexistente não lança erro', () => {
    expect(() => useStore.getState().updateEstoque('NAO-EXISTE', 5)).not.toThrow();
  });
});

// ─── Tarefas ──────────────────────────────────────────────────────────────────

describe('addTarefa', () => {
  it('tarefa adicionada à lista', () => {
    const before = useStore.getState().tarefas.length;
    const t = makeTarefa({ titulo: 'Nova tarefa de teste' });
    useStore.getState().addTarefa(t);
    expect(useStore.getState().tarefas).toHaveLength(before + 1);
  });

  it('tarefa encontrada na lista com os campos corretos', () => {
    const t = makeTarefa({ titulo: 'Comprar caixas', prioridade: 'alta' });
    useStore.getState().addTarefa(t);
    const found = useStore.getState().tarefas.find((x) => x.id === t.id);
    expect(found?.titulo).toBe('Comprar caixas');
    expect(found?.prioridade).toBe('alta');
  });
});

describe('updateTarefa', () => {
  it('atualiza campo da tarefa', () => {
    const t = makeTarefa({ titulo: 'Original' });
    useStore.getState().addTarefa(t);
    useStore.getState().updateTarefa(t.id, { titulo: 'Atualizado' });
    const found = useStore.getState().tarefas.find((x) => x.id === t.id);
    expect(found?.titulo).toBe('Atualizado');
  });
});

describe('deleteTarefa', () => {
  it('remove a tarefa da lista', () => {
    const t = makeTarefa();
    useStore.getState().addTarefa(t);
    const before = useStore.getState().tarefas.length;
    useStore.getState().deleteTarefa(t.id);
    expect(useStore.getState().tarefas).toHaveLength(before - 1);
    expect(useStore.getState().tarefas.find((x) => x.id === t.id)).toBeUndefined();
  });
});

describe('moveTarefa', () => {
  it('muda coluna da tarefa', () => {
    const t = makeTarefa({ coluna: 'todo' });
    useStore.getState().addTarefa(t);
    useStore.getState().moveTarefa(t.id, 'done');
    const found = useStore.getState().tarefas.find((x) => x.id === t.id);
    expect(found?.coluna).toBe('done');
  });
});

// ─── updateConfiguracoes ──────────────────────────────────────────────────────

describe('updateConfiguracoes', () => {
  it('atualiza aliquotaDAS', () => {
    useStore.getState().updateConfiguracoes({ aliquotaDAS: 8 });
    expect(useStore.getState().configuracoes.aliquotaDAS).toBe(8);
  });

  it('merge parcial preserva campos existentes', () => {
    useStore.getState().updateConfiguracoes({ aliquotaDAS: 5 });
    useStore.getState().updateConfiguracoes({ percentualMarketing: 3 });
    const conf = useStore.getState().configuracoes;
    expect(conf.aliquotaDAS).toBe(5);
    expect(conf.percentualMarketing).toBe(3);
  });
});

// ─── setLojaFiltro ────────────────────────────────────────────────────────────

describe('setLojaFiltro', () => {
  it('define filtro de loja', () => {
    useStore.getState().setLojaFiltro('Cardoso e-Shop');
    expect(useStore.getState().lojaFiltro).toBe('Cardoso e-Shop');
  });

  it('limpa filtro com null', () => {
    useStore.getState().setLojaFiltro('Cardoso e-Shop');
    useStore.getState().setLojaFiltro(null);
    expect(useStore.getState().lojaFiltro).toBeNull();
  });
});

// ─── addAjuste ────────────────────────────────────────────────────────────────

describe('addAjuste', () => {
  it('entrada aumenta estoqueAtual imediatamente', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-001' ? { ...p, estoqueAtual: 10 } : p,
      ),
    });
    useStore.getState().addAjuste({
      id: 'aj1', sku: 'PROD-001', produto: 'Produto Exemplo A', tipo: 'entrada', quantidade: 5,
      estoqueAntes: 10, estoqueDepois: 15, motivo: 'teste', criadoEm: new Date().toISOString(),
    });
    const prod = useStore.getState().produtos.find((p) => p.sku === 'PROD-001');
    expect(prod?.estoqueAtual).toBe(15);
  });

  it('saida diminui estoqueAtual imediatamente', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-001' ? { ...p, estoqueAtual: 10 } : p,
      ),
    });
    useStore.getState().addAjuste({
      id: 'aj2', sku: 'PROD-001', produto: 'Produto Exemplo A', tipo: 'saida', quantidade: 3,
      estoqueAntes: 10, estoqueDepois: 7, motivo: 'teste', criadoEm: new Date().toISOString(),
    });
    const prod = useStore.getState().produtos.find((p) => p.sku === 'PROD-001');
    expect(prod?.estoqueAtual).toBe(7);
  });

  it('ajuste é adicionado à lista de ajustes', () => {
    const before = useStore.getState().ajustes.length;
    useStore.getState().addAjuste({
      id: 'aj3', sku: 'PROD-001', produto: 'Produto Exemplo A', tipo: 'entrada', quantidade: 1,
      estoqueAntes: 10, estoqueDepois: 11, motivo: 'teste', criadoEm: new Date().toISOString(),
    });
    expect(useStore.getState().ajustes.length).toBe(before + 1);
  });

  it('saida não deixa estoque negativo', () => {
    useStore.setState({
      produtos: useStore.getState().produtos.map((p) =>
        p.sku === 'PROD-001' ? { ...p, estoqueAtual: 2 } : p,
      ),
    });
    useStore.getState().addAjuste({
      id: 'aj4', sku: 'PROD-001', produto: 'Produto Exemplo A', tipo: 'saida', quantidade: 100,
      estoqueAntes: 2, estoqueDepois: 0, motivo: 'teste', criadoEm: new Date().toISOString(),
    });
    const prod = useStore.getState().produtos.find((p) => p.sku === 'PROD-001');
    expect(prod?.estoqueAtual).toBe(0);
  });
});
