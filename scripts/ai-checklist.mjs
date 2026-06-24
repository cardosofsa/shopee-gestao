#!/usr/bin/env node
/**
 * Checklist IA — Fase 9
 * Verifica padrões obrigatórios antes do merge.
 *
 * Escape hatch: adicione o comentário `// checklist-ignore` na linha acima
 * de um false positive justificado. Use com moderação.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

// Apenas emojis reais (faces, objetos, símbolos de natureza/comida/transporte).
// Exclui dingbats (✓ ✗ ➤) e símbolos matemáticos que são uso legítimo.
const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FA9F}\u{1F600}-\u{1F64F}]/u;

// ── Helpers ──────────────────────────────────────────────────────────────────

function walk(dir, exts = ['.ts', '.tsx']) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory() && !['node_modules', 'dist', '.git', 'coverage'].includes(entry)) {
      results.push(...walk(full, exts));
    } else if (stat.isFile() && exts.some((e) => entry.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function rel(p) {
  return relative(ROOT, p);
}

function check(name, files, testFn) {
  const hits = [];
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // Escape hatch: linha anterior contém "checklist-ignore"
      const prev = i > 0 ? lines[i - 1] : '';
      if (/checklist-ignore/.test(prev)) return;

      const result = testFn(line, file);
      if (result) hits.push(`  ${rel(file)}:${i + 1}  ${result}`);
    });
  }
  return { name, ok: hits.length === 0, hits };
}

// ── Checks ───────────────────────────────────────────────────────────────────

const files = walk(SRC);

const checks = [
  check('sem console.log', files, (line) => {
    if (/console\.log\s*\(/.test(line)) return 'console.log detectado';
    return null;
  }),

  check('sem TODO/FIXME', files, (line) => {
    // Case-sensitive + word boundary: evita falso positivo com "Todos" (pt-BR)
    if (/\/\/\s*\b(TODO|FIXME|HACK|XXX)\b/.test(line)) return 'comentário proibido';
    return null;
  }),

  check('sem emojis no código', files, (line) => {
    if (EMOJI_RE.test(line)) return 'emoji detectado';
    return null;
  }),

  // SVGs de data-viz (recharts, sparklines, gauges) e brand icons (Google)
  // são legítimos. Flagamos apenas SVGs com viewBox típico de ícone (0 0 24 24
  // ou 0 0 16 16) que deveriam vir do lucide-react.
  check('ícones via lucide-react (sem SVG inline de ícone)', files, (line) => {
    const iconViewBox = /viewBox="0 0 (16|20|24) (16|20|24)"/;
    if (/<svg\b/.test(line) && iconViewBox.test(line)) {
      return '<svg> de ícone (24×24) inline — use lucide-react';
    }
    return null;
  }),
];

// ── Relatório ─────────────────────────────────────────────────────────────────

let exitCode = 0;

console.log('\n╔══════════════════════════════════════════╗');
console.log('║         Checklist IA — Fase 9            ║');
console.log('╚══════════════════════════════════════════╝\n');

for (const { name, ok, hits } of checks) {
  const icon = ok ? '✓' : '✗';
  const status = ok ? 'PASSOU' : 'FALHOU';
  console.log(`${icon} ${name.padEnd(42)} ${status}`);
  if (!ok) {
    exitCode = 1;
    hits.slice(0, 10).forEach((h) => console.log(h));
    if (hits.length > 10) console.log(`  ... e mais ${hits.length - 10} ocorrências`);
  }
}

// Cobertura mínima: delegada ao vitest --coverage (thresholds no vitest.config.ts)
console.log(`✓ ${'cobertura mínima (via test:coverage)'.padEnd(42)} INFO`);

console.log('');
if (exitCode === 0) {
  console.log('Todos os checks passaram.');
} else {
  console.log('Checklist falhou. Corrija os itens acima antes do merge.');
}

process.exit(exitCode);
