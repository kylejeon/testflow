#!/usr/bin/env node
/**
 * scan-i18n.mjs — hard-coded English scanner + en/ko parity check.
 *
 * Part of dev-spec-i18n-coverage (§4-5, AC-3, AC-4).
 *
 * Usage:
 *   node scripts/scan-i18n.mjs                  # warn-only (exit 0 on matches)
 *   node scripts/scan-i18n.mjs --fail-on-match  # exit 1 on any match (CI gate)
 *   node scripts/scan-i18n.mjs --check-parity   # en/ko key parity (exit 1 on diff)
 *
 * Policy:
 *   - Phase 1 scope directories (see SCOPE_DIRS) — the directories that were
 *     already i18n-migrated in phase 1. New regressions land here first.
 *   - `.i18nignore` at repo root — lines of the form:
 *       literal         ← exact substring match
 *       /regex/flags    ← regex
 *       path/to/file    ← whole file ignored
 *   - Lines starting with # are comments. Blank lines ignored.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ── Phase 1 directories (dev-spec §4-1 A) + Phase 2a plan-detail ────────────
const SCOPE_DIRS = [
  'src/components/issues',
  'src/pages/milestone-detail',
  'src/pages/run-detail/components',
  'src/pages/plan-detail',
];

// Phase 2 files to ignore globally (dev-spec §9) — phase 2b (run-detail) still
// pending. plan-detail/page.tsx activated in Phase 2a (2026-04-21).
const GLOBAL_FILE_IGNORES = [
  'src/pages/run-detail/page.tsx',
];

// ── Patterns (regex source strings) ─────────────────────────────────────────
// JSX text node: >Capitalized Plain English<
const RE_JSX_TEXT = />([A-Z][a-zA-Z ]{2,})</g;
// Attributes: placeholder / aria-label / title / alt with capitalised first word
const RE_ATTR = /\b(?:placeholder|aria-label|title|alt)=\"([A-Z][^\"]{2,})\"/g;
// showToast('...', ...) or showToast("...")
const RE_TOAST = /showToast\(\s*['"]([^'"\n]{3,})['"]/g;

// ── Helpers ─────────────────────────────────────────────────────────────────

function loadIgnore() {
  const rules = { literals: [], regexes: [], files: new Set() };
  try {
    const txt = readFileSync(join(REPO_ROOT, '.i18nignore'), 'utf8');
    for (const line of txt.split(/\r?\n/)) {
      const l = line.trim();
      if (!l || l.startsWith('#')) continue;
      if (l.startsWith('/') && l.lastIndexOf('/') > 0) {
        const lastSlash = l.lastIndexOf('/');
        const body = l.slice(1, lastSlash);
        const flags = l.slice(lastSlash + 1);
        try {
          rules.regexes.push(new RegExp(body, flags));
        } catch { /* ignore invalid regex */ }
      } else if (/[/\\]/.test(l) && !l.includes(' ')) {
        rules.files.add(l.replace(/\\/g, '/'));
      } else {
        rules.literals.push(l);
      }
    }
  } catch {
    // no .i18nignore file → no extra rules
  }
  for (const f of GLOBAL_FILE_IGNORES) rules.files.add(f);
  return rules;
}

function matchesIgnore(snippet, rules) {
  for (const lit of rules.literals) {
    if (snippet.includes(lit)) return true;
  }
  for (const re of rules.regexes) {
    if (re.test(snippet)) return true;
  }
  return false;
}

function fileIgnored(relPath, rules) {
  const norm = relPath.replace(/\\/g, '/');
  return rules.files.has(norm);
}

function walkDir(dir, acc) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name.startsWith('.')) continue;
      walkDir(p, acc);
    } else if (ent.isFile()) {
      if (p.endsWith('.ts') || p.endsWith('.tsx')) acc.push(p);
    }
  }
}

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function scanFile(absPath, rules) {
  const content = readFileSync(absPath, 'utf8');
  const relPath = relative(REPO_ROOT, absPath).replace(/\\/g, '/');
  if (fileIgnored(relPath, rules)) return [];

  const hits = [];
  const harvest = (re, label) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const full = m[0];
      const cap = m[1];
      // Skip if entire match is on an ignore literal/regex.
      if (matchesIgnore(full, rules)) continue;
      if (matchesIgnore(cap, rules)) continue;
      // Skip if the matched region contains a t( call (means it's already i18n'd).
      const start = Math.max(0, m.index - 40);
      const end = Math.min(content.length, m.index + full.length + 40);
      const ctx = content.slice(start, end);
      if (/[\bt\s][ \t]*\(\s*['"][a-zA-Z0-9_.:-]+['"]\s*[,)]/.test(ctx) && !full.includes('showToast')) {
        // Looks like a nearby t('...') call — probably false positive for JSX text
        // right after a translated element. Only skip for JSX / attr forms.
        if (label !== 'toast') continue;
      }
      hits.push({
        file: relPath,
        line: lineOf(content, m.index),
        label,
        snippet: full.length > 120 ? full.slice(0, 117) + '…' : full,
      });
    }
  };

  harvest(RE_JSX_TEXT, 'jsx');
  harvest(RE_ATTR, 'attr');
  harvest(RE_TOAST, 'toast');
  return hits;
}

// ── Parity check ────────────────────────────────────────────────────────────

function walkKeys(obj, prefix, acc) {
  if (obj == null || typeof obj !== 'object') return;
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    const v = obj[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      walkKeys(v, path, acc);
    } else {
      acc.add(path);
    }
  }
}

async function checkParity() {
  const langs = ['en', 'ko'];
  const bundles = {};
  for (const lang of langs) {
    bundles[lang] = {};
    const dir = join(REPO_ROOT, 'src/i18n/local', lang);
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      console.error(`[scan-i18n] could not read ${dir}`);
      return 1;
    }
    for (const f of entries) {
      if (!f.endsWith('.ts')) continue;
      const nsName = f.replace(/\.ts$/, '');
      const mod = await import(new URL(`file://${join(dir, f)}`).href);
      bundles[lang][nsName] = mod[nsName] ?? mod.default ?? {};
    }
  }

  let diffs = 0;
  const allNs = new Set([...Object.keys(bundles.en), ...Object.keys(bundles.ko)]);
  for (const ns of allNs) {
    const enKeys = new Set();
    const koKeys = new Set();
    walkKeys(bundles.en[ns] || {}, '', enKeys);
    walkKeys(bundles.ko[ns] || {}, '', koKeys);
    const onlyEn = [...enKeys].filter(k => !koKeys.has(k));
    const onlyKo = [...koKeys].filter(k => !enKeys.has(k));
    for (const k of onlyEn) {
      diffs++;
      console.log(`[parity] missing in ko: ${ns}.${k}`);
    }
    for (const k of onlyKo) {
      diffs++;
      console.log(`[parity] missing in en: ${ns}.${k}`);
    }
  }
  if (diffs === 0) {
    console.log('[parity] en ↔ ko key trees match (0 diff).');
    return 0;
  }
  console.log(`[parity] ${diffs} key diff(s) found.`);
  return 1;
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const args = new Set(process.argv.slice(2));
  const failOnMatch = args.has('--fail-on-match');
  const doParity = args.has('--check-parity');

  if (doParity) {
    const code = await checkParity();
    process.exit(code);
  }

  const rules = loadIgnore();
  const files = [];
  for (const sub of SCOPE_DIRS) {
    walkDir(join(REPO_ROOT, sub), files);
  }

  let total = 0;
  for (const abs of files) {
    const hits = scanFile(abs, rules);
    for (const h of hits) {
      total++;
      console.log(`${h.file}:${h.line}  [${h.label}]  ${h.snippet}`);
    }
  }

  if (total === 0) {
    console.log(`[scan-i18n] clean — 0 hardcoded matches across ${files.length} files in scope.`);
    process.exit(0);
  }
  console.log(`[scan-i18n] ${total} match(es) across ${files.length} files in scope.`);
  if (failOnMatch) process.exit(1);
  process.exit(0);
}

main();
