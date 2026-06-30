#!/usr/bin/env node
/**
 * Scans source files for patterns that look like accidentally committed secrets.
 * Run before build; also run against dist/ after build (bundle-check mode).
 *
 * Usage:
 *   node scripts/secret-scan.mjs          # scan src/
 *   node scripts/secret-scan.mjs dist/    # scan built bundle
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const TARGET_DIR = process.argv[2] ?? 'src';

// Patterns that suggest real secrets were hard-coded
const PATTERNS = [
  { label: 'Supabase service_role key', re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/ },
  { label: 'Generic JWT with HS256 header (service key)', re: /eyJhbGciOiJIUzI1NiJ9\.[A-Za-z0-9_-]{20,}/ },
  { label: 'AWS Access Key', re: /AKIA[0-9A-Z]{16}/ },
  { label: 'AWS Secret Key', re: /aws_secret_access_key\s*=\s*[A-Za-z0-9+/]{40}/ },
  { label: 'Private key header', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'Slack webhook URL', re: /hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[A-Za-z0-9]+/ },
  { label: 'Stripe secret key', re: /sk_(live|test)_[0-9a-zA-Z]{24,}/ },
  { label: 'GitHub Personal Access Token', re: /ghp_[A-Za-z0-9]{36}/ },
  { label: 'Hardcoded password assignment', re: /password\s*[:=]\s*["'][^"']{8,}["']/ },
];

// File extensions to scan
const ALLOWED_EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.env', '.html', '.css']);

// Files/dirs to skip in src/ mode
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage', '.vite']);
const SKIP_FILES = new Set(['.env.example', 'secret-scan.mjs']);

let totalScanned = 0;
let findings = 0;

function scanFile(filePath) {
  const ext = extname(filePath);
  if (!ALLOWED_EXT.has(ext) && ext !== '') return;

  let content;
  try {
    content = readFileSync(filePath, 'utf8');
  } catch {
    return; // binary file or permission error
  }

  totalScanned++;
  const lines = content.split('\n');
  for (const { label, re } of PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) {
        console.error(`[SECRET-SCAN] ${label}`);
        console.error(`  File: ${filePath}:${i + 1}`);
        findings++;
      }
    }
  }
}

function walkDir(dir) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkDir(full);
    else scanFile(full);
  }
}

walkDir(TARGET_DIR);

if (findings > 0) {
  console.error(`\n[SECRET-SCAN] ${findings} potential secret(s) found in ${totalScanned} file(s). Aborting.`);
  process.exit(1);
} else {
  console.log(`[SECRET-SCAN] OK — ${totalScanned} file(s) scanned, no secrets found.`);
}
