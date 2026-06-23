#!/usr/bin/env node
/**
 * Seed de demonstração — CORE Commerce
 *
 * Pré-requisitos:
 *   1. Executar migration_v12.sql no Supabase SQL Editor
 *   2. Definir SUPABASE_SERVICE_ROLE_KEY no .env.local (obter em: Project → API → service_role)
 *
 * Uso:
 *   node scripts/seed-demo.mjs
 *
 * Idempotente: pode ser executado N vezes sem duplicar dados.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

// ── Carregar .env e .env.local ────────────────────────────────────────────────
for (const file of ['.env', '.env.local']) {
  try {
    readFileSync(file, 'utf-8').split('\n').forEach(line => {
      const eq = line.indexOf('=');
      if (eq <= 0) return;
      const k = line.slice(0, eq).trim();
      const v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (k && !process.env[k]) process.env[k] = v;
    });
  } catch { /* arquivo não existe */ }
}

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY      = process.env.VITE_SUPABASE_ANON_KEY;
const USER_ID_OVERRIDE = process.env.USER_ID; // opcional: pular criação de usuário

if (!SUPABASE_URL) {
  console.error('❌  VITE_SUPABASE_URL não definida no .env');
  process.exit(1);
}
if (!SERVICE_KEY && !USER_ID_OVERRIDE) {
  console.error('❌  Defina SUPABASE_SERVICE_ROLE_KEY no .env.local');
  console.error('    Supabase → Project Settings → API → service_role secret');
  console.error('    (ou passe USER_ID=<uuid> para pular criação de usuário)');
  process.exit(1);
}

// ── Verificar se a key é realmente service_role ───────────────────────────────
function jwtRole(jwt) {
  try { return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString()).role ?? '?'; }
  catch { return '?'; }
}
if (SERVICE_KEY && jwtRole(SERVICE_KEY) !== 'service_role') {
  console.error(`❌  A key configurada tem role="${jwtRole(SERVICE_KEY)}" — não é a service_role key.`);
  console.error('    Supabase → Project Settings → API → "service_role" (não o anon key).');
  process.exit(1);
}

// Cliente admin (service role) — bypassa RLS
const db = createClient(SUPABASE_URL, SERVICE_KEY ?? ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Cliente anon — para signUp/signIn como usuário comum
const anonDb = ANON_KEY
  ? createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } })
  : db;

// ── Criar/encontrar usuário demo ──────────────────────────────────────────────
async function resolveUser() {
  if (USER_ID_OVERRIDE) {
    console.log(`📌 USER_ID fornecido: ${USER_ID_OVERRIDE}`);
    return USER_ID_OVERRIDE;
  }

  // 1. Tentar criar via Admin API
  const { data: created, error: e1 } = await db.auth.admin.createUser({
    email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true,
  });
  if (created?.user) {
    console.log(`✅ Usuário criado: ${created.user.id}`);
    return created.user.id;
  }

  // 2. Já existe? Buscar na lista de usuários
  const alreadyExists = e1?.message?.toLowerCase().match(/already|exists|duplicate/);
  if (alreadyExists) {
    const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
    const found = (list?.users ?? []).find(u => u.email === DEMO_EMAIL);
    if (found) { console.log(`♻️  Usuário existente: ${found.id}`); return found.id; }
  }

  // 3. SignUp via anon key (sem email confirm — pode requerer confirmação)
  console.log(`  ⚠️  Admin createUser: ${e1?.message} — tentando signUp...`);
  const { data: su, error: e2 } = await anonDb.auth.signUp({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
  });
  if (su?.user && !e2) {
    // Confirmar e-mail via admin se possível
    try { await db.auth.admin.updateUserById(su.user.id, { email_confirm: true }); } catch {}
    console.log(`✅ Usuário criado via signUp: ${su.user.id}`);
    return su.user.id;
  }

  // 4. Já existe? Tentar signIn
  const { data: si, error: e3 } = await anonDb.auth.signInWithPassword({
    email: DEMO_EMAIL, password: DEMO_PASSWORD,
  });
  if (si?.user) {
    console.log(`♻️  Login bem-sucedido: ${si.user.id}`);
    return si.user.id;
  }

  console.error('\n❌  Não foi possível criar/encontrar o usuário demo.');
  console.error(`    Admin API: ${e1?.message}`);
  console.error(`    SignUp:    ${e2?.message}`);
  console.error(`    SignIn:    ${e3?.message}`);
  console.error('\n    Alternativa: crie a conta em Supabase → Authentication → Users');
  console.error('    e rode: USER_ID=<uuid> npm run seed:demo');
  process.exit(1);
}

// ── Constantes ────────────────────────────────────────────────────────────────
const DEMO_EMAIL    = 'demo@core.com';
const DEMO_PASSWORD = '12345678';
const LOJA_A        = 'CORE Shop';
const LOJA_B        = 'CORE Premium';

// ── RNG Determinístico (LCG) ──────────────────────────────────────────────────
function mkRng(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 4294967296;
  };
}
const rng = mkRng(2026);

function pickWeighted(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function randInt(min, max) { return Math.floor(rng() * (max - min + 1)) + min; }
function randDay(year, month) {
  const days = new Date(year, month, 0).getDate();
  return String(randInt(1, days)).padStart(2, '0');
}

// ── Produtos ──────────────────────────────────────────────────────────────────
// [sku, nome, categoria, loja, custoUnitario, estoqueSeguranca, estoqueAtual, demanda]
// demanda: peso relativo de popularidade (influencia frequência nos pedidos)
const PRODUCTS_DEF = [
  // ── Perfumaria — CORE Shop ─────────────────────────────────────────────────
  ['CS-PERF-001', 'Perfume Essence Black 30ml',          'Perfumaria',       LOJA_A,  14,  30,  75, 18],
  ['CS-PERF-002', 'Perfume Essence Black 100ml',         'Perfumaria',       LOJA_A,  28,  20,  45, 12],
  ['CS-PERF-003', 'Perfume Essence Black 200ml',         'Perfumaria',       LOJA_A,  42,  10,  20,  5],
  ['CS-PERF-004', 'Perfume Sport Blue 50ml',             'Perfumaria',       LOJA_A,  18,  25,  60, 14],
  ['CS-PERF-005', 'Perfume Sport Blue 100ml',            'Perfumaria',       LOJA_A,  28,  15,  38,  9],
  ['CS-PERF-006', 'Perfume Floral Rose 50ml',            'Perfumaria',       LOJA_A,  16,  25,  55, 13],
  ['CS-PERF-007', 'Perfume Floral Rose 100ml',           'Perfumaria',       LOJA_A,  26,  15,  32,  8],
  ['CS-PERF-008', 'Perfume Ocean Breeze Men 100ml',      'Perfumaria',       LOJA_A,  26,  15,  35,  9],
  ['CS-PERF-009', 'Perfume Lavanda Women 50ml',          'Perfumaria',       LOJA_A,  16,  20,  42, 10],
  ['CS-PERF-010', 'Body Splash Ocean 200ml',             'Perfumaria',       LOJA_A,  10,  30,  88, 22],
  ['CS-PERF-011', 'Body Splash Rose 200ml',              'Perfumaria',       LOJA_A,  10,  30,  72, 18],
  ['CS-PERF-012', 'Body Splash Vanilla 200ml',           'Perfumaria',       LOJA_A,  10,  25,  65, 15],
  ['CS-PERF-013', 'Colônia Sport Men 150ml',             'Perfumaria',       LOJA_A,  15,  25,  58, 12],
  ['CS-PERF-014', 'Colônia Floral Women 100ml',          'Perfumaria',       LOJA_A,  13,  25,  62, 14],
  ['CS-PERF-015', 'Creme Hidratante Corporal 200ml',     'Perfumaria',       LOJA_A,   8,  30,   8, 16], // ALERTA estoque baixo
  ['CS-PERF-016', 'Creme Facial Antissinais 50ml',       'Perfumaria',       LOJA_A,  22,  15,  28,  8],
  ['CS-PERF-017', 'Creme Corporal FPS30 150ml',          'Perfumaria',       LOJA_A,  18,  20,  35, 10],
  ['CS-PERF-018', 'Shampoo Hidratação Profunda 300ml',   'Perfumaria',       LOJA_A,  14,  25,  42, 11],
  ['CS-PERF-019', 'Shampoo Antiqueda 300ml',             'Perfumaria',       LOJA_A,  16,  25,  38, 10],
  ['CS-PERF-020', 'Condicionador Reconstrução 300ml',    'Perfumaria',       LOJA_A,  12,  25,  45, 10],
  ['CS-PERF-021', 'Máscara Capilar Nutrição 250ml',      'Perfumaria',       LOJA_A,  16,  20,  32,  8],
  ['CS-PERF-022', 'Óleo Capilar Reparador 60ml',         'Perfumaria',       LOJA_A,  20,  15,  25,  6],
  ['CS-PERF-023', 'Desodorante Roll-on 24h 50ml',        'Perfumaria',       LOJA_A,   6,  40,  95, 20],
  ['CS-PERF-024', 'Desodorante Spray 72h 100ml',         'Perfumaria',       LOJA_A,   9,  35,  80, 18],
  ['CS-PERF-025', 'Sabonete Líquido Premium 250ml',      'Perfumaria',       LOJA_A,   8,  30,  68, 15],

  // ── Eletrônicos — CORE Shop ────────────────────────────────────────────────
  ['CS-ELET-001', 'Cabo USB-C para USB-C 1m Nylon',     'Eletrônicos',      LOJA_A,   5,  60, 135, 28],
  ['CS-ELET-002', 'Cabo USB-C para USB-C 2m Nylon',     'Eletrônicos',      LOJA_A,   7,  50, 110, 20],
  ['CS-ELET-003', 'Cabo USB-C para Lightning 1m',        'Eletrônicos',      LOJA_A,   7,  50,  95, 18],
  ['CS-ELET-004', 'Cabo Micro-USB 1m Nylon',             'Eletrônicos',      LOJA_A,   4,  60, 120, 16],
  ['CS-ELET-005', 'Cabo Lightning para USB-C 2m',        'Eletrônicos',      LOJA_A,   8,  40,  88, 15],
  ['CS-ELET-006', 'Carregador Rápido 20W USB-C',         'Eletrônicos',      LOJA_A,  18,  25,  55, 22],
  ['CS-ELET-007', 'Carregador Veicular 18W',             'Eletrônicos',      LOJA_A,  12,  30,  68, 18],
  ['CS-ELET-008', 'Carregador Sem Fio 15W Qi',           'Eletrônicos',      LOJA_A,  25,  15,  35, 10],
  ['CS-ELET-009', 'Suporte Celular Veicular Magnético',  'Eletrônicos',      LOJA_A,  12,  25,   2, 14], // ALERTA ruptura
  ['CS-ELET-010', 'Fone Bluetooth TWS 5.0',              'Eletrônicos',      LOJA_A,  35,  15,  32, 15],
  ['CS-ELET-011', 'Fone com Fio P2 Bass',                'Eletrônicos',      LOJA_A,  12,  30,  72, 18],
  ['CS-ELET-012', 'Caixa de Som Bluetooth 360°',         'Eletrônicos',      LOJA_A,  45,   8,  16,  8],
  ['CS-ELET-013', 'Película Vidro Temperado 9H (2un)',   'Eletrônicos',      LOJA_A,   3,  80, 185, 30],
  ['CS-ELET-014', 'Película Privacidade Anti-espião',    'Eletrônicos',      LOJA_A,   5,  50, 120, 20],
  ['CS-ELET-015', 'Capa Silicone Samsung A54',           'Eletrônicos',      LOJA_A,   7,  30,  68, 16],
  ['CS-ELET-016', 'Capa Silicone iPhone 15',             'Eletrônicos',      LOJA_A,   8,  30,  62, 15],
  ['CS-ELET-017', 'Capa Anti-impacto Universal',         'Eletrônicos',      LOJA_A,  10,  25,  55, 12],
  ['CS-ELET-018', 'Mouse Sem Fio 2.4GHz',                'Eletrônicos',      LOJA_A,  28,  12,  22,  8],
  ['CS-ELET-019', 'Hub USB-C 7 em 1',                    'Eletrônicos',      LOJA_A,  38,   8,  16,  6],
  ['CS-ELET-020', 'Suporte Notebook Ergonômico',         'Eletrônicos',      LOJA_A,  35,   8,  18,  6],
  ['CS-ELET-021', 'Anel de Luz LED Selfie 26cm',         'Eletrônicos',      LOJA_A,  20,  15,  35,  9],
  ['CS-ELET-022', 'Webcam Full HD 1080p',                'Eletrônicos',      LOJA_A,  65,   5,  10,  4],
  ['CS-ELET-023', 'Teclado Wireless Ultra-slim',         'Eletrônicos',      LOJA_A,  55,   6,  12,  5],

  // ── Acessórios — CORE Shop ─────────────────────────────────────────────────
  ['CS-ACES-001', 'Óculos Proteção UV400 Unissex',       'Acessórios',       LOJA_A,  18,  15,  38, 10],
  ['CS-ACES-002', 'Carteira Couro Slim Masculina',       'Acessórios',       LOJA_A,  25,  10,  24,  7],
  ['CS-ACES-003', 'Carteira Feminina Porta-cartão',      'Acessórios',       LOJA_A,  20,  10,  28,  8],
  ['CS-ACES-004', 'Pochete Esportiva Impermeável',       'Acessórios',       LOJA_A,  20,  10,  30,  8],
  ['CS-ACES-005', 'Mochila 25L Impermeável',             'Acessórios',       LOJA_A,  65,   5,  14,  4],
  ['CS-ACES-006', 'Relógio Analógico Casual',            'Acessórios',       LOJA_A,  35,   8,  16,  5],
  ['CS-ACES-007', 'Cinto Couro Masculino 120cm',        'Acessórios',       LOJA_A,  22,  12,  28,  7],
  ['CS-ACES-008', 'Porta Passaporte Couro',              'Acessórios',       LOJA_A,  15,  10,  30,  8],
  ['CS-ACES-009', 'Necessaire Travel 3 peças',           'Acessórios',       LOJA_A,  25,   8,  22,  6],
  ['CS-ACES-010', 'Chapéu Bucket Hat UV50+',             'Acessórios',       LOJA_A,  18,  10,  28,  8],

  // ── Casa e Organização — CORE Shop ─────────────────────────────────────────
  ['CS-CASA-001', 'Organizador Mesa Bambu',              'Casa e Organização', LOJA_A, 20, 12,  32,  8],
  ['CS-CASA-002', 'Dispensador Sabão Inox 350ml',        'Casa e Organização', LOJA_A, 15, 15,  45, 10],
  ['CS-CASA-003', 'Kit Panos Microfibra 5un',            'Casa e Organização', LOJA_A, 10, 20,  60, 14],
  ['CS-CASA-004', 'Porta Temperos Giratório 8 peças',   'Casa e Organização', LOJA_A, 32,  8,  18,  5],
  ['CS-CASA-005', 'Caixa Organizadora Tampa 10L',        'Casa e Organização', LOJA_A, 22, 10,  25,  6],
  ['CS-CASA-006', 'Suporte Lateral Monitor',             'Casa e Organização', LOJA_A, 28,  8,  18,  5],
  ['CS-CASA-007', 'Toalha de Rosto Premium 50×80cm',    'Casa e Organização', LOJA_A, 18, 20,  50, 10],
  ['CS-CASA-008', 'Escova Massageadora Escalpo',         'Casa e Organização', LOJA_A, 12, 15,  40, 10],
  ['CS-CASA-009', 'Difusor Elétrico Aromaterapia',       'Casa e Organização', LOJA_A, 35,  8,  18,  6],
  ['CS-CASA-010', 'Bandeja Espelho Decorativa',          'Casa e Organização', LOJA_A, 30,  8,  20,  5],

  // ── Saúde e Bem-estar — CORE Shop ──────────────────────────────────────────
  ['CS-SAUD-001', 'Termômetro Digital Infravermelho',    'Saúde',            LOJA_A,  28,  10,  24,  7],
  ['CS-SAUD-002', 'Medidor Pressão Arterial Digital',    'Saúde',            LOJA_A, 120,   5,  10,  3],
  ['CS-SAUD-003', 'Massageador Elétrico Pescoço',        'Saúde',            LOJA_A,  45,   8,  16,  5],
  ['CS-SAUD-004', 'Bolsa Térmica Fitness 2L',            'Saúde',            LOJA_A,  18,  12,  28,  8],
  ['CS-SAUD-005', 'Garrafa Térmica 500ml Aço Inox',     'Saúde',            LOJA_A,  28,  12,  30,  8],
  ['CS-SAUD-006', 'Tapete Yoga Antiderrapante',          'Saúde',            LOJA_A,  40,   8,  18,  5],
  ['CS-SAUD-007', 'Massageador Facial Elétrico',         'Saúde',            LOJA_A,  35,   8,  18,  6],

  // ── Kits e Combos — Ambas ──────────────────────────────────────────────────
  ['KT-001', 'Kit Perfume + Body Splash Ocean',          'Kit/Combo',      'Ambas',   28,  10,  25, 10],
  ['KT-002', 'Kit Cabo USB-C + Carregador 20W',          'Kit/Combo',      'Ambas',   22,  10,  32, 12],
  ['KT-003', 'Kit Capa + Película iPhone 15',            'Kit/Combo',      'Ambas',   10,  15,  45, 14],
  ['KT-004', 'Kit Skincare Básico (shampoo + cond)',     'Kit/Combo',      'Ambas',   38,   8,  20,  8],
  ['KT-005', 'Kit Casa Organizada (3 peças Bambu)',      'Kit/Combo',      'Ambas',   55,   5,  12,  5],
  ['KT-006', 'Kit Fone + Carregador + Cabo',             'Kit/Combo',      'Ambas',   55,   5,  15,  6],
  ['KT-007', 'Kit Perfume + Desodorante Men',            'Kit/Combo',      'Ambas',   32,   8,  22,  8],
  ['KT-008', 'Kit Skincare Noturno (creme + sérum)',     'Kit/Combo',      'Ambas',   45,   5,  16,  6],
  ['KT-009', 'Kit Escritório Home Office',               'Kit/Combo',      'Ambas',   90,   4,  10,  4],

  // ── CORE Premium ──────────────────────────────────────────────────────────
  ['CP-PERF-001', 'Perfume Importado Noir 100ml',        'Perfumaria',       LOJA_B,  85,   5,  12,  4],
  ['CP-PERF-002', 'Perfume Importado Gold 50ml',         'Perfumaria',       LOJA_B,  68,   5,   8,  3],
  ['CP-SKIN-001', 'Kit Skincare Premium 5 itens',        'Perfumaria',       LOJA_B, 180,   3,   9,  3],
  ['CP-SKIN-002', 'Sérum Facial Vitamina C 30ml',        'Perfumaria',       LOJA_B,  65,   5,  14,  4],
  ['CP-ELET-001', 'Fone Over-Ear Noise Cancelling',      'Eletrônicos',      LOJA_B,  95,   5,  10,  3],
  ['CP-ELET-002', 'Smartwatch Fitness Pro GPS',          'Eletrônicos',      LOJA_B, 150,   5,   7,  3],
  ['CP-ELET-003', 'Carregador 140W GaN Multi-porta',     'Eletrônicos',      LOJA_B,  85,   4,   9,  2],
  ['CP-ACES-001', 'Mochila Couro Legítimo 30L',         'Acessórios',       LOJA_B, 180,   3,   5,  2],
  ['CP-ACES-002', 'Relógio Automático Luxo',             'Acessórios',       LOJA_B, 280,   2,   4,  1],
  ['CP-SAUD-001', 'Escova Dente Elétrica Pro',           'Saúde',            LOJA_B,  95,   3,   8,  2],
  ['CP-CASA-001', 'Umidificador Ultrassônico Premium',   'Casa e Organização', LOJA_B, 120, 3,   6,  2],
  ['CP-KITS-001', 'Kit Home Office Premium',             'Kit/Combo',        LOJA_B, 250,   2,   4,  1],
];

// ── Fornecedores ──────────────────────────────────────────────────────────────
const FORNECEDORES = [
  { nome: 'Distribuidora Alfa Beleza',    telefone: '(11) 91234-5678', email: 'compras@alfa.com.br',     leadTimeDias: 7,  termosPagamento: '30/60 dias',  observacoes: 'Fornecedor principal de perfumaria e cosméticos' },
  { nome: 'Tech Import Brasil',           telefone: '(11) 98765-4321', email: 'vendas@techimport.com.br', leadTimeDias: 10, termosPagamento: 'À vista (Pix 3%)',  observacoes: 'Cabos, carregadores e acessórios eletrônicos' },
  { nome: 'Casa & Decoração LTDA',        telefone: '(11) 93322-1100', email: 'pedidos@casadec.com.br',   leadTimeDias: 5,  termosPagamento: '15/30 dias',  observacoes: 'Organização, bambu e itens de casa' },
  { nome: 'Prime Saúde Distribuidora',    telefone: '(11) 94455-6677', email: 'prime@primesaude.com.br',  leadTimeDias: 8,  termosPagamento: '30 dias',     observacoes: 'Equipamentos e produtos de saúde' },
  { nome: 'Fashion Acessórios SP',        telefone: '(11) 99988-7766', email: 'fash@fashionaces.com.br',  leadTimeDias: 6,  termosPagamento: '30/60 dias',  observacoes: 'Bolsas, carteiras, relógios e acessórios moda' },
];

// ── Tarefas ───────────────────────────────────────────────────────────────────
const TAREFAS = [
  { titulo: 'Repor Suporte Celular Veicular (RUPTURA)',    descricao: 'CS-ELET-009 com apenas 2 unidades — fazer pedido urgente à Tech Import', coluna: 'todo',        posicao: 0, prioridade: 'alta',  dataVencimento: '2026-06-25' },
  { titulo: 'Repor Creme Hidratante Corporal',            descricao: 'CS-PERF-015 com 8 unidades (seg=30) — solicitar 100 unidades à Alfa',    coluna: 'todo',        posicao: 1, prioridade: 'alta',  dataVencimento: '2026-06-27' },
  { titulo: 'Criar campanha Dia dos Pais (Agosto)',       descricao: 'Planejar campanha com desconto 12% nos kits de perfumaria',              coluna: 'todo',        posicao: 2, prioridade: 'media', dataVencimento: '2026-07-15' },
  { titulo: 'Negociar frete com Alfa Beleza',             descricao: 'Volume atual justifica revisão de termos — reunião solicitada',          coluna: 'todo',        posicao: 3, prioridade: 'media', dataVencimento: null },
  { titulo: 'Revisar ads — ACOS >12% em Abril e Maio',   descricao: 'Revisar segmentação das campanhas Shopee Ads para reduzir gasto',        coluna: 'in_progress', posicao: 0, prioridade: 'alta',  dataVencimento: '2026-06-30' },
  { titulo: 'Atualizar fotos do Fone Bluetooth TWS',     descricao: 'CS-ELET-010 — novas fotos com fundo branco e dimensões corretas',        coluna: 'in_progress', posicao: 1, prioridade: 'media', dataVencimento: null },
  { titulo: 'Fechar DRE de Maio 2026',                   descricao: 'Conferir despesas e fechar no Financeiro — meta não atingida (R$42k vs R$50k)', coluna: 'in_progress', posicao: 2, prioridade: 'alta', dataVencimento: '2026-06-24' },
  { titulo: 'Importar pedidos de Maio 2026',              descricao: 'Pedidos já importados via planilha Shopee',                              coluna: 'done',        posicao: 0, prioridade: 'alta',  dataVencimento: null },
  { titulo: 'Cadastrar produtos CORE Premium',            descricao: 'Todos os 12 SKUs premium já cadastrados e com estoque',                  coluna: 'done',        posicao: 1, prioridade: 'media', dataVencimento: null },
  { titulo: 'Configurar alíquota DAS e marketing',        descricao: 'Configurado: DAS 6%, Marketing 2%',                                     coluna: 'done',        posicao: 2, prioridade: 'media', dataVencimento: null },
];

// ── Campanhas ─────────────────────────────────────────────────────────────────
const CAMPANHAS_DEF = [
  {
    nome: 'Dia das Mães',
    inicio: '2026-04-15', fim: '2026-05-11',
    desconto: 10,
    skus: ['CS-PERF-001','CS-PERF-004','CS-PERF-006','CS-PERF-010','KT-001','KT-007'],
    cor: '#ec4899',
    observacoes: 'Foco em perfumaria e body splashes femininos',
  },
  {
    nome: 'Queima de Inverno',
    inicio: '2026-06-01', fim: '2026-06-30',
    desconto: 8,
    skus: ['CS-ELET-009','CS-ELET-010','CS-ELET-006','CS-ELET-008','KT-002'],
    cor: '#3b82f6',
    observacoes: 'Campanha ativa — eletrônicos com desconto especial',
  },
  {
    nome: 'Dia dos Pais — Planejada',
    inicio: '2026-07-25', fim: '2026-08-10',
    desconto: 12,
    skus: ['KT-006','KT-007','CS-ACES-002','CS-ACES-007','CP-PERF-001'],
    cor: '#f97316',
    observacoes: 'Planejada — foco em combos masculinos',
  },
  {
    nome: 'Black November 2025',
    inicio: '2025-11-01', fim: '2025-11-30',
    desconto: 18,
    skus: ['CS-ELET-001','CS-ELET-002','CS-ELET-006','CS-PERF-001','KT-002','KT-003'],
    cor: '#1e293b',
    observacoes: 'Black Friday + semana toda — maior campanha do ano',
  },
];

// ── Contas a Pagar ────────────────────────────────────────────────────────────
const CONTAS_DEF = [
  { descricao: 'Embalagens — Fatura Junho',     categoria: 'Operacional', valor: 890,  vencimento: '2026-06-15', status: 'pendente', recorrente: false, loja: LOJA_A },
  { descricao: 'Aluguel Galpão Estoque',         categoria: 'Fixo',        valor: 1200, vencimento: '2026-06-20', status: 'pendente', recorrente: true,  loja: 'Ambas' },
  { descricao: 'Plano Internet Fibra',           categoria: 'Fixo',        valor: 120,  vencimento: '2026-06-10', status: 'pago',     recorrente: true,  loja: 'Ambas', pagoEm: '2026-06-09' },
  { descricao: 'Shopee Gestão — Plano Pro',     categoria: 'Software',    valor: 89,   vencimento: '2026-06-05', status: 'pago',     recorrente: true,  loja: 'Ambas', pagoEm: '2026-06-04' },
  { descricao: 'Ads Shopee — Junho',            categoria: 'Marketing',   valor: 1800, vencimento: '2026-06-28', status: 'pendente', recorrente: false, loja: LOJA_A },
  { descricao: 'Ads Shopee Premium — Junho',    categoria: 'Marketing',   valor: 600,  vencimento: '2026-06-28', status: 'pendente', recorrente: false, loja: LOJA_B },
  { descricao: 'Frete Correios — Contrato',     categoria: 'Logística',   valor: 350,  vencimento: '2026-06-25', status: 'pendente', recorrente: true,  loja: 'Ambas' },
  { descricao: 'Contador MEI — Honorários',     categoria: 'Contábil',    valor: 200,  vencimento: '2026-06-30', status: 'pendente', recorrente: true,  loja: 'Ambas' },
];

// ── Histórico Mensal (Jul 2025 – Mai 2026, 11 meses fechados) ─────────────────
// Nota: ACOS alto em Abr/Mai 2026 → ads_marketing = 15% do faturamento
// Meta de faturamento = R$50.000 → Mai 2026 ficou em R$42.000 (não atingida)
const HISTORICO_DEF = [
  { mesAno: '2025-07', fat: 22000, nPed: 95,  ticket: 231, uni: 148, cmv: 6800,  taxShopee: 4400, das: 1320, ads: 440,  desp: 2100 },
  { mesAno: '2025-08', fat: 24500, nPed: 108, ticket: 226, uni: 165, cmv: 7500,  taxShopee: 4900, das: 1470, ads: 490,  desp: 2100 },
  { mesAno: '2025-09', fat: 22800, nPed: 100, ticket: 228, uni: 152, cmv: 7000,  taxShopee: 4560, das: 1368, ads: 456,  desp: 2100 },
  { mesAno: '2025-10', fat: 28000, nPed: 122, ticket: 229, uni: 182, cmv: 8600,  taxShopee: 5600, das: 1680, ads: 560,  desp: 2200 },
  { mesAno: '2025-11', fat: 36000, nPed: 158, ticket: 227, uni: 240, cmv: 11000, taxShopee: 7200, das: 2160, ads: 720,  desp: 2800 }, // Black Friday
  { mesAno: '2025-12', fat: 39000, nPed: 170, ticket: 229, uni: 260, cmv: 12000, taxShopee: 7800, das: 2340, ads: 780,  desp: 2900 }, // Natal
  { mesAno: '2026-01', fat: 29000, nPed: 126, ticket: 230, uni: 193, cmv: 9000,  taxShopee: 5800, das: 1740, ads: 580,  desp: 2200 },
  { mesAno: '2026-02', fat: 31000, nPed: 135, ticket: 229, uni: 206, cmv: 9600,  taxShopee: 6200, das: 1860, ads: 620,  desp: 2200 },
  { mesAno: '2026-03', fat: 33000, nPed: 144, ticket: 229, uni: 220, cmv: 10200, taxShopee: 6600, das: 1980, ads: 660,  desp: 2200 },
  { mesAno: '2026-04', fat: 37000, nPed: 162, ticket: 228, uni: 247, cmv: 11500, taxShopee: 7400, das: 2220, ads: 5550, desp: 2200 }, // ACOS 15%
  { mesAno: '2026-05', fat: 42000, nPed: 183, ticket: 229, uni: 280, cmv: 13000, taxShopee: 8400, das: 2520, ads: 6300, desp: 2200 }, // ACOS 15%, meta R$50k NÃO ATINGIDA
];

// ── Distribuição de pedidos por mês ──────────────────────────────────────────
const MONTH_ORDERS = [
  { ym: '2025-01', count: 15 }, { ym: '2025-02', count: 18 }, { ym: '2025-03', count: 20 },
  { ym: '2025-04', count: 22 }, { ym: '2025-05', count: 25 }, { ym: '2025-06', count: 22 },
  { ym: '2025-07', count: 28 }, { ym: '2025-08', count: 32 }, { ym: '2025-09', count: 30 },
  { ym: '2025-10', count: 38 }, { ym: '2025-11', count: 50 }, { ym: '2025-12', count: 55 },
  { ym: '2026-01', count: 35 }, { ym: '2026-02', count: 38 }, { ym: '2026-03', count: 42 },
  { ym: '2026-04', count: 45 }, { ym: '2026-05', count: 52 }, { ym: '2026-06', count: 33 },
];

// ── Helpers financeiros ───────────────────────────────────────────────────────
function priceFromCusto(custo) {
  // target margin ~30%; shopee 20% + DAS 6% + ads 2% + margem 30% = 58%
  const raw = custo / 0.42;
  return Math.ceil(raw / 0.10) * 0.10 - 0.01; // arredonda para .99 ou .90
}

function calcOrder(custo, qty, monthYM, basePrice) {
  const receita = basePrice * qty;
  const desconto = parseFloat((receita * 0.015).toFixed(2));
  const custoTotal = parseFloat((custo * qty).toFixed(2));
  const taxaShopee = parseFloat((receita * 0.20).toFixed(2));
  const dasImposto = parseFloat((receita * 0.06).toFixed(2));
  // ACOS alto em Abril e Maio 2026
  const adsRate = (monthYM === '2026-04' || monthYM === '2026-05') ? 0.15 : 0.02;
  const adsMarketing = parseFloat((receita * adsRate).toFixed(2));
  const lucroOp = parseFloat((receita - desconto - custoTotal - taxaShopee - dasImposto - adsMarketing).toFixed(2));
  const margemSCustoProduto = receita > 0
    ? parseFloat(((receita - desconto - taxaShopee - dasImposto - adsMarketing) / receita * 100).toFixed(2))
    : 0;
  const margemSCustoTotal = receita > 0
    ? parseFloat((lucroOp / receita * 100).toFixed(2))
    : 0;
  return { receita, desconto, custoTotal, taxaShopee, dasImposto, adsMarketing,
           lucroOp, margemSCustoProduto, margemSCustoTotal };
}

// ── Gerar pedidos ─────────────────────────────────────────────────────────────
function generateOrders(uid, products) {
  const orders = [];
  const weights = products.map(p => p.demanda);
  let orderSeq = 1000;

  // Produtos recentes para simular ruptura do CS-ELET-009
  const recentSkus = ['CS-ELET-009', 'CS-ELET-009', 'CS-ELET-009']; // forçar vários pedidos recentes

  for (const { ym, count } of MONTH_ORDERS) {
    const [year, month] = ym.split('-').map(Number);

    // Para o suporte veicular: inserir 8–12 pedidos recentes (Jun 2026) para criar velocidade de saída
    const extraForAlert = ym === '2026-06' ? 10 : 0;
    const totalCount = count + extraForAlert;

    for (let i = 0; i < totalCount; i++) {
      let prod;
      if (ym === '2026-06' && i < extraForAlert) {
        // Pedidos do CS-ELET-009 para criar situação de ruptura
        prod = products.find(p => p.sku === 'CS-ELET-009') ?? pickWeighted(products, weights);
      } else {
        prod = pickWeighted(products, weights);
      }

      const qty = rng() < 0.85 ? 1 : randInt(2, 3);
      const day = randDay(year, month);
      const date = `${ym}-${day}`;
      const loja = prod.loja === 'Ambas'
        ? (rng() < 0.7 ? LOJA_A : LOJA_B)
        : prod.loja;

      // Status: recentes têm mix de statuses, antigos são Concluído
      const monthsAgo = (2026 - year) * 12 + (6 - month);
      let status;
      if (monthsAgo === 0) {
        status = rng() < 0.4 ? 'Em processo' : rng() < 0.6 ? 'Enviado' : 'Concluído';
      } else if (monthsAgo === 1) {
        status = rng() < 0.05 ? 'Devolvido' : 'Concluído';
      } else {
        status = rng() < 0.03 ? 'Devolvido' : 'Concluído';
      }

      const fin = calcOrder(prod.custoUnitario, qty, ym, prod.basePrice);
      const id = `SEED-${ym.replace('-','')}-${String(orderSeq++).padStart(5,'0')}`;

      orders.push({
        id,
        user_id: uid,
        numero_pedido: `ORD-${orderSeq}`,
        data: date,
        status,
        loja,
        sku: prod.sku,
        produto: prod.nome,
        quantidade: qty,
        multiplicador_kit: 1,
        unidades_estoque: qty,
        receita: fin.receita,
        desconto: fin.desconto,
        custo_total: fin.custoTotal,
        taxa_shopee: fin.taxaShopee,
        das_imposto: fin.dasImposto,
        ads_marketing: fin.adsMarketing,
        lucro_operacional: fin.lucroOp,
        margem_s_custo_produto: fin.margemSCustoProduto,
        margem_s_custo_total: fin.margemSCustoTotal,
      });
    }
  }

  return orders;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 CORE Commerce — Seed Demo\n');

  // 1. Encontrar ou criar usuário demo
  const uid = await resolveUser();

  // 2. Limpar dados anteriores (idempotência)
  console.log('🗑️  Limpando dados anteriores...');
  const tables = ['metas_produto','campanhas','fornecedores','contas_pagar',
                  'historico_mensal','despesas','compras','pedidos','tarefas',
                  'configuracoes','produtos'];
  for (const t of tables) {
    const { error } = await db.from(t).delete().eq('user_id', uid);
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  ⚠️  ${t}: ${error.message}`);
    }
  }

  // 3. Preparar produtos
  const products = PRODUCTS_DEF.map(([sku, nome, categoria, loja, custo, seg, atual, demanda]) => ({
    sku, nome, categoria, loja,
    custoUnitario: custo, estoqueSeguranca: seg, estoqueAtual: atual, ativo: true,
    demanda, basePrice: priceFromCusto(custo),
  }));

  // 4. Inserir produtos
  console.log(`📦 Inserindo ${products.length} produtos...`);
  const prodRows = products.map(p => ({
    sku: p.sku, user_id: uid, nome: p.nome, categoria: p.categoria, loja: p.loja,
    custo_unitario: p.custoUnitario, estoque_seguranca: p.estoqueSeguranca,
    estoque_atual: p.estoqueAtual, ativo: p.ativo,
  }));
  { const { error } = await db.from('produtos').upsert(prodRows);
    if (error) { console.error('❌ produtos:', error.message); process.exit(1); } }

  // 5. Gerar e inserir pedidos em lotes de 200
  const orders = generateOrders(uid, products);
  console.log(`🛒 Inserindo ${orders.length} pedidos...`);
  for (let i = 0; i < orders.length; i += 200) {
    const chunk = orders.slice(i, i + 200);
    const { error } = await db.from('pedidos').upsert(chunk);
    if (error) { console.error('❌ pedidos (lote):', error.message); process.exit(1); }
    process.stdout.write(`  ${Math.min(i + 200, orders.length)}/${orders.length}\r`);
  }
  console.log('\n');

  // 6. Compras (reposições de estoque — 3 por fornecedor principal)
  console.log('🏭 Inserindo compras...');
  const COMPRAS = [
    { sku: 'CS-PERF-010', produto: 'Body Splash Ocean 200ml',       data: '2026-05-10', qtd: 100, custo: 10,   forn: 'Distribuidora Alfa Beleza',  pag: 'Pix' },
    { sku: 'CS-ELET-001', produto: 'Cabo USB-C para USB-C 1m Nylon', data: '2026-05-15', qtd: 200, custo: 5,    forn: 'Tech Import Brasil',          pag: 'Boleto 30d' },
    { sku: 'CS-ELET-006', produto: 'Carregador Rápido 20W USB-C',    data: '2026-05-15', qtd: 100, custo: 18,   forn: 'Tech Import Brasil',          pag: 'Boleto 30d' },
    { sku: 'CS-PERF-001', produto: 'Perfume Essence Black 30ml',     data: '2026-04-20', qtd: 80,  custo: 14,   forn: 'Distribuidora Alfa Beleza',   pag: '2x Boleto' },
    { sku: 'CS-CASA-003', produto: 'Kit Panos Microfibra 5un',       data: '2026-04-25', qtd: 100, custo: 10,   forn: 'Casa & Decoração LTDA',       pag: 'Pix' },
    { sku: 'CS-PERF-023', produto: 'Desodorante Roll-on 24h 50ml',   data: '2026-03-10', qtd: 150, custo: 6,    forn: 'Distribuidora Alfa Beleza',   pag: '30/60 dias' },
    { sku: 'CS-ELET-013', produto: 'Película Vidro Temperado 9H',     data: '2026-03-15', qtd: 300, custo: 3,    forn: 'Tech Import Brasil',          pag: 'Pix' },
    { sku: 'CP-PERF-001', produto: 'Perfume Importado Noir 100ml',   data: '2026-02-01', qtd: 20,  custo: 85,   forn: 'Distribuidora Alfa Beleza',   pag: '60 dias' },
    { sku: 'CS-SAUD-001', produto: 'Termômetro Digital Infravermelho', data: '2026-02-20', qtd: 30, custo: 28,  forn: 'Prime Saúde Distribuidora',   pag: 'Pix' },
    { sku: 'CS-ACES-001', produto: 'Óculos Proteção UV400',          data: '2026-01-15', qtd: 50,  custo: 18,   forn: 'Fashion Acessórios SP',       pag: '30 dias' },
  ];
  const compraRows = [];
  const despesaRows = [];
  for (const c of COMPRAS) {
    const cid = randomUUID();
    const custoTotal = c.qtd * c.custo;
    const valorParcela = c.pag.includes('2x') ? custoTotal / 2 : custoTotal;
    const parcelas = c.pag.includes('2x') ? 2 : 1;
    compraRows.push({
      id: cid, user_id: uid, sku: c.sku, produto: c.produto, data: c.data,
      quantidade_entrada: c.qtd, custo_unitario: c.custo, custo_total: custoTotal,
      fornecedor: c.forn, nf_ref: '', pagamento: c.pag,
      parcelas, valor_parcela: valorParcela, loja: LOJA_A, observacoes: '',
    });
    despesaRows.push({
      id: randomUUID(), user_id: uid, data: c.data, categoria: 'Mercadoria',
      descricao: `${c.produto} — ${c.qtd} un. (${c.forn})`,
      valor: custoTotal, loja: LOJA_A, compra_ref: cid,
    });
  }
  { const { error } = await db.from('compras').upsert(compraRows);
    if (error) console.warn('⚠️  compras:', error.message); }
  { const { error } = await db.from('despesas').upsert(despesaRows);
    if (error) console.warn('⚠️  despesas (compras):', error.message); }

  // 7. Despesas operacionais adicionais
  console.log('💸 Inserindo despesas operacionais...');
  const DESP_OP = [
    { data: '2026-06-01', cat: 'Embalagem',   desc: 'Caixas kraft P, M, G — Fatura Junho',       val: 420,  loja: LOJA_A },
    { data: '2026-06-01', cat: 'Embalagem',   desc: 'Envelopes plásticos 100un',                   val: 85,   loja: LOJA_A },
    { data: '2026-06-03', cat: 'Marketing',   desc: 'Shopee Ads — Campanha Queima Inverno',        val: 600,  loja: LOJA_A },
    { data: '2026-06-03', cat: 'Marketing',   desc: 'Shopee Ads — CORE Premium',                  val: 200,  loja: LOJA_B },
    { data: '2026-06-04', cat: 'Outro',       desc: 'Assinatura Shopee Gestão Pro',                val: 89,   loja: 'Ambas' },
    { data: '2026-05-15', cat: 'Embalagem',   desc: 'Caixas e embalagens — Maio',                 val: 480,  loja: LOJA_A },
    { data: '2026-05-05', cat: 'Marketing',   desc: 'Shopee Ads — Dia das Mães (boost)',           val: 2200, loja: LOJA_A },
    { data: '2026-04-10', cat: 'Marketing',   desc: 'Shopee Ads — Dia das Mães (lançamento)',     val: 1800, loja: LOJA_A },
    { data: '2026-04-05', cat: 'Embalagem',   desc: 'Caixas e embalagens — Abril',                val: 420,  loja: LOJA_A },
    { data: '2026-03-10', cat: 'Embalagem',   desc: 'Embalagens Março',                            val: 380,  loja: LOJA_A },
    { data: '2026-03-01', cat: 'Combustível', desc: 'Gasolina — entregas locais Março',            val: 120,  loja: 'Ambas' },
    { data: '2026-02-08', cat: 'Embalagem',   desc: 'Embalagens Fevereiro',                        val: 360,  loja: LOJA_A },
    { data: '2026-01-10', cat: 'Embalagem',   desc: 'Embalagens Janeiro',                          val: 340,  loja: LOJA_A },
    { data: '2025-12-05', cat: 'Embalagem',   desc: 'Embalagens Especiais Natal',                  val: 650,  loja: LOJA_A },
    { data: '2025-11-02', cat: 'Embalagem',   desc: 'Embalagens Black Friday (estoque extra)',     val: 580,  loja: LOJA_A },
    { data: '2025-11-01', cat: 'Marketing',   desc: 'Shopee Ads — Black November',                 val: 1200, loja: LOJA_A },
  ];
  const despOpRows = DESP_OP.map(d => ({
    id: randomUUID(), user_id: uid, data: d.data, categoria: d.cat,
    descricao: d.desc, valor: d.val, loja: d.loja, compra_ref: null,
  }));
  { const { error } = await db.from('despesas').upsert(despOpRows);
    if (error) console.warn('⚠️  despesas (operacionais):', error.message); }

  // 8. Tarefas
  console.log('✅ Inserindo tarefas...');
  const tarefaRows = TAREFAS.map((t, i) => ({
    id: randomUUID(), user_id: uid,
    titulo: t.titulo, descricao: t.descricao, coluna: t.coluna,
    posicao: t.posicao, prioridade: t.prioridade,
    data_vencimento: t.dataVencimento ?? null,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
  { const { error } = await db.from('tarefas').upsert(tarefaRows);
    if (error) console.warn('⚠️  tarefas:', error.message); }

  // 9. Histórico mensal
  console.log('📊 Inserindo histórico mensal...');
  const histRows = HISTORICO_DEF.map(h => {
    const lucroBruto = h.fat - h.cmv;
    const lucroOp = lucroBruto - h.taxShopee - h.das - h.ads;
    const lucroLiq = lucroOp - h.desp;
    const margem = parseFloat((lucroLiq / h.fat * 100).toFixed(2));
    return {
      mes_ano: h.mesAno, user_id: uid,
      faturamento_bruto: h.fat, pedidos_qtd: h.nPed,
      ticket_medio: parseFloat((h.fat / h.nPed).toFixed(2)),
      unidades_vendidas: h.uni, cmv: h.cmv,
      taxas_shopee: h.taxShopee, das_imposto: h.das,
      marketing_ads: h.ads, despesas_operacionais: h.desp,
      lucro_bruto: lucroBruto, lucro_operacional: lucroOp,
      lucro_liquido: lucroLiq, margem_percentual: margem,
    };
  });
  { const { error } = await db.from('historico_mensal').upsert(histRows);
    if (error) console.warn('⚠️  historico_mensal:', error.message); }

  // 10. Configurações
  console.log('⚙️  Inserindo configurações...');
  { const { error } = await db.from('configuracoes').upsert({
      user_id: uid,
      aliquota_das: 0.06,
      percentual_marketing: 0.02,
      meta_faturamento: 50000,
      meta_margem: 18,
      meta_pedidos: 200,
      meta_lucro: 9000,
      nome_empresa: 'CORE Commerce',
      tipo_empresa: 'MEI',
      cnpj: '12.345.678/0001-90',
      lojas: [LOJA_A, LOJA_B],
    });
    if (error) console.warn('⚠️  configuracoes:', error.message); }

  // 11. Fornecedores
  console.log('🏭 Inserindo fornecedores...');
  const fornRows = FORNECEDORES.map(f => ({
    id: randomUUID(), user_id: uid,
    nome: f.nome, telefone: f.telefone, email: f.email,
    lead_time_dias: f.leadTimeDias, termos_pagamento: f.termosPagamento,
    observacoes: f.observacoes,
  }));
  { const { error } = await db.from('fornecedores').upsert(fornRows);
    if (error) console.warn('⚠️  fornecedores:', error.message); }

  // 12. Contas a Pagar
  console.log('💳 Inserindo contas a pagar...');
  const contaRows = CONTAS_DEF.map(c => ({
    id: randomUUID(), user_id: uid,
    descricao: c.descricao, categoria: c.categoria, valor: c.valor,
    vencimento: c.vencimento, status: c.status,
    pago_em: c.pagoEm ?? null, recorrente: c.recorrente, loja: c.loja,
    observacoes: null,
  }));
  { const { error } = await db.from('contas_pagar').upsert(contaRows);
    if (error) console.warn('⚠️  contas_pagar:', error.message); }

  // 13. Campanhas
  console.log('📣 Inserindo campanhas...');
  const campRows = CAMPANHAS_DEF.map(c => ({
    id: randomUUID(), user_id: uid,
    nome: c.nome, inicio: c.inicio, fim: c.fim,
    desconto: c.desconto, skus: c.skus, cor: c.cor,
    observacoes: c.observacoes,
  }));
  { const { error } = await db.from('campanhas').upsert(campRows);
    if (error) console.warn('⚠️  campanhas:', error.message); }

  // 14. Metas por produto (mês atual e anterior)
  console.log('🎯 Inserindo metas por produto...');
  const topSkus = [
    { sku: 'CS-ELET-013', nome: 'Película Vidro',  metaUni: 60,  metaRec: 900  },
    { sku: 'CS-ELET-001', nome: 'Cabo USB-C 1m',   metaUni: 50,  metaRec: 600  },
    { sku: 'CS-PERF-010', nome: 'Body Splash',      metaUni: 45,  metaRec: 900  },
    { sku: 'CS-ELET-006', nome: 'Carregador 20W',   metaUni: 40,  metaRec: 1600 },
    { sku: 'KT-003',      nome: 'Kit Capa + Película', metaUni: 30, metaRec: 750 },
  ];
  const metaRows = [];
  for (const mes of ['2026-05', '2026-06']) {
    for (const p of topSkus) {
      metaRows.push({
        user_id: uid, sku: p.sku, mes_ano: mes,
        meta_unidades: p.metaUni, meta_receita: p.metaRec,
      });
    }
  }
  { const { error } = await db.from('metas_produto').upsert(metaRows);
    if (error) console.warn('⚠️  metas_produto:', error.message); }

  // ── Sumário ──────────────────────────────────────────────────────────────
  console.log('\n🎉 Seed concluído!\n');
  console.log('  Login:   demo@core.com');
  console.log('  Senha:   12345678');
  console.log(`  Lojas:   ${LOJA_A} | ${LOJA_B}`);
  console.log(`  Produtos: ${products.length}`);
  console.log(`  Pedidos:  ${orders.length}`);
  console.log('');
  console.log('  Alertas propositais:');
  console.log('  ⚠️  CS-PERF-015 — Creme Hidratante: estoque 8, segurança 30 → Comprar');
  console.log('  🚨 CS-ELET-009 — Suporte Veicular: estoque 2, segurança 25 → Ruptura');
  console.log('  📉 Mai/2026: faturamento R$42k vs meta R$50k (não atingida)');
  console.log('  📊 Abr+Mai/2026: ACOS 15% (meta ≤ 10%) → ponto de atenção no DRE');
  console.log('');
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err.message ?? err);
  process.exit(1);
});
