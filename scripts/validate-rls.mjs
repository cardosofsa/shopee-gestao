#!/usr/bin/env node
/**
 * validate-rls.mjs — Fase 9
 * Verifica que toda tabela criada no schema tem:
 *   1. ALTER TABLE ... ENABLE ROW LEVEL SECURITY
 *   2. Ao menos uma CREATE POLICY
 *
 * Lê todos os arquivos .sql em /supabase/ e analisa o conteúdo combinado.
 */
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SUPABASE_DIR = join(ROOT, 'supabase');

// Lê apenas schema.sql + migration_complete.sql (estado final de referência)
const PRIORITY_FILES = ['schema.sql', 'migration_complete.sql'];

function readSqlFiles() {
  const all = readdirSync(SUPABASE_DIR).filter((f) => f.endsWith('.sql'));
  // Prioriza os arquivos de referência; inclui os demais para migrations
  const ordered = [
    ...PRIORITY_FILES.filter((f) => all.includes(f)),
    ...all.filter((f) => !PRIORITY_FILES.includes(f)).sort(),
  ];
  return ordered.map((f) => readFileSync(join(SUPABASE_DIR, f), 'utf8')).join('\n');
}

const sql = readSqlFiles().toLowerCase();

// Extrai nomes de tabelas criadas
const TABLE_RE = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:\w+\.)?(\w+)\s*\(/g;
const tables = new Set();
let m;
while ((m = TABLE_RE.exec(sql)) !== null) {
  // Ignora tabelas de schema do sistema
  const name = m[1];
  if (!['schema_migrations', 'buckets', 'objects', 'policies'].includes(name)) {
    tables.add(name);
  }
}

// Verifica RLS habilitado
const rlsEnabled = new Set();
const RLS_RE = /alter\s+table\s+(?:\w+\.)?(\w+)\s+enable\s+row\s+level\s+security/g;
while ((m = RLS_RE.exec(sql)) !== null) {
  rlsEnabled.add(m[1]);
}

// Verifica políticas existentes — aceita nomes com ou sem aspas duplas
const policyCounts = {};
const POLICY_RE = /create\s+policy\s+(?:"[^"]+"|[\w]+)\s+on\s+(?:\w+\.)?(\w+)/g;
while ((m = POLICY_RE.exec(sql)) !== null) {
  policyCounts[m[1]] = (policyCounts[m[1]] ?? 0) + 1;
}

// ── Relatório ─────────────────────────────────────────────────────────────────

console.log('\n╔══════════════════════════════════════════╗');
console.log('║         RLS Validation — Fase 9          ║');
console.log('╚══════════════════════════════════════════╝\n');
console.log(`Tabelas encontradas: ${[...tables].join(', ')}\n`);

let exitCode = 0;
const rows = [];

for (const table of [...tables].sort()) {
  const hasRls = rlsEnabled.has(table);
  const policyCount = policyCounts[table] ?? 0;
  const ok = hasRls && policyCount > 0;
  if (!ok) exitCode = 1;
  rows.push({ table, hasRls, policyCount, ok });
}

const col = (s, w) => s.padEnd(w);
console.log(`${col('Tabela', 22)} ${col('RLS', 6)} ${col('Políticas', 10)} Status`);
console.log('─'.repeat(55));
for (const { table, hasRls, policyCount, ok } of rows) {
  const status = ok ? '✓ OK' : '✗ FALHOU';
  console.log(
    `${col(table, 22)} ${col(hasRls ? 'sim' : 'não', 6)} ${col(String(policyCount), 10)} ${status}`
  );
}

console.log('');
if (exitCode === 0) {
  console.log('Todas as tabelas têm RLS e políticas configuradas.');
} else {
  console.log('Tabelas sem RLS ou sem políticas detectadas.');
  console.log('Adicione ENABLE ROW LEVEL SECURITY e CREATE POLICY para cada uma.');
}

process.exit(exitCode);
