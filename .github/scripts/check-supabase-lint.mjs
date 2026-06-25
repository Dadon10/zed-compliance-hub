#!/usr/bin/env node
// Parses Supabase linter JSON output and fails the CI job when any finding
// matches the blocking categories (SECURITY DEFINER misuse or RLS
// misconfiguration) and is not present in the allow-list.
//
// Usage: node check-supabase-lint.mjs <path-to-lint.json>

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ALLOWLIST_PATH = resolve(__dirname, '..', 'supabase-lint-allowlist.txt');

// Lint "name" values (and substrings) that are considered merge-blocking.
// Mirrors Supabase's documented lint rules:
// https://supabase.com/docs/guides/database/database-linter
const BLOCKING_PATTERNS = [
  'security_definer_view',
  'rls_disabled_in_public',
  'policy_exists_rls_disabled',
  'rls_enabled_no_policy',
  'rls_references_user_metadata',
  'function_search_path_mutable', // SECURITY DEFINER w/o pinned search_path
  'security_definer',             // catch-all substring
  'rls',                          // catch-all substring for RLS rules
];

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: check-supabase-lint.mjs <lint.json>');
  process.exit(2);
}

let raw;
try {
  raw = readFileSync(inputPath, 'utf8');
} catch (err) {
  console.error(`Failed to read ${inputPath}:`, err.message);
  process.exit(2);
}

let findings;
try {
  findings = JSON.parse(raw);
} catch {
  console.error('Linter output was not valid JSON. Treating as failure.');
  console.error(raw.slice(0, 2000));
  process.exit(1);
}

if (!Array.isArray(findings)) findings = findings?.findings ?? [];

const allowlist = new Set();
if (existsSync(ALLOWLIST_PATH)) {
  for (const line of readFileSync(ALLOWLIST_PATH, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) allowlist.add(trimmed);
  }
}

const isBlocking = (name = '') => {
  const lower = String(name).toLowerCase();
  return BLOCKING_PATTERNS.some((p) => lower.includes(p));
};

const blocking = findings.filter((f) => {
  const name = f.name ?? f.title ?? f.rule ?? '';
  if (!isBlocking(name)) return false;
  const key = `${name}:${f.metadata?.schema ?? ''}.${f.metadata?.name ?? ''}`;
  return !allowlist.has(name) && !allowlist.has(key);
});

if (blocking.length === 0) {
  console.log(`✅ No blocking Supabase security findings (${findings.length} total finding(s)).`);
  process.exit(0);
}

console.error(`❌ ${blocking.length} blocking Supabase security finding(s):\n`);
for (const f of blocking) {
  const name = f.name ?? f.title ?? f.rule ?? 'unknown';
  const target = `${f.metadata?.schema ?? '?'}.${f.metadata?.name ?? '?'}`;
  console.error(`  - [${f.level ?? 'warn'}] ${name} on ${target}`);
  if (f.detail) console.error(`      ${f.detail}`);
  if (f.remediation) console.error(`      fix: ${f.remediation}`);
}
console.error('\nResolve the findings or, if intentional, add the rule name to .github/supabase-lint-allowlist.txt with justification.');
process.exit(1);
