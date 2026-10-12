#!/usr/bin/env node
/* ds-check — keep the production CSS in sync with the design system.

   Source of truth: docs/design/tokens.json (exported from Claude Design).

   1. Token parity — every token the export defines exists in assets/css
      with the same value: light and shared tokens in tokens.css and
      theme-light.css, dark tokens as --_dk-* in theme-dark.css. Production
      may add tokens; only a missing or different one fails.
   2. Token adherence — .vue files and non-token stylesheets carry no raw
      hex colour; they use var(). A deliberate exception carries a
      `ds-allow-hex` comment on its line. */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { normalize, parseDeclarations } from './lib/ds-css.js';
import { loadTokens } from './lib/ds-tokens.js';

const ROOT = resolve(import.meta.dirname, '..');
const TOKENS = join(ROOT, 'docs/design/tokens.json');
const CSS_DIR = join(ROOT, 'assets/css');
const DARK_PREFIX = '--_dk-';
const TOKEN_FILES = ['tokens.css', 'theme-light.css', 'theme-dark.css'];
const VUE_ROOTS = ['app'];
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/;

const readCss = (name) => readFileSync(join(CSS_DIR, name), 'utf8');

const collectProdTokens = () => {
  const light = new Map();
  for (const file of ['tokens.css', 'theme-light.css']) {
    for (const [name, value] of parseDeclarations(readCss(file))) {
      if (!name.startsWith(DARK_PREFIX)) light.set(name, value);
    }
  }
  const dark = new Map();
  for (const [name, value] of parseDeclarations(readCss('theme-dark.css'))) {
    if (name.startsWith(DARK_PREFIX)) {
      dark.set('--' + name.slice(DARK_PREFIX.length), value);
    }
  }
  return { light, dark };
};

const compare = (expected, actual, label, failures) => {
  for (const [name, value] of expected) {
    if (!actual.has(name)) {
      failures.push(`MISSING  ${name}${label} — not defined in production CSS`);
      continue;
    }
    if (normalize(value) !== normalize(actual.get(name))) {
      failures.push(
        `MISMATCH ${name}${label} — export ${value} ≠ prod ${actual.get(name)}`,
      );
    }
  }
};

const checkParity = () => {
  const tokens = JSON.parse(readFileSync(TOKENS, 'utf8'));
  const { light, dark, shared } = loadTokens(tokens);
  const prod = collectProdTokens();
  const failures = [];
  compare(light, prod.light, '', failures);
  compare(shared, prod.light, '', failures);
  compare(dark, prod.dark, ' (dark)', failures);
  const known = new Set([...light.keys(), ...shared.keys()]);
  const extensions = [...prod.light.keys()].filter((name) => !known.has(name));
  return { failures, extensions };
};

const walk = (entry, acc) => {
  const abs = join(ROOT, entry);
  let stat;
  try {
    stat = statSync(abs);
  } catch {
    return acc;
  }
  if (stat.isDirectory()) {
    for (const child of readdirSync(abs)) walk(join(entry, child), acc);
  } else if (entry.endsWith('.vue')) {
    acc.push(entry);
  }
  return acc;
};

const appCss = () =>
  readdirSync(CSS_DIR)
    .filter((name) => name.endsWith('.css') && !TOKEN_FILES.includes(name))
    .map((name) => join('assets/css', name));

const checkAdherence = () => {
  const files = [];
  for (const root of VUE_ROOTS) walk(root, files);
  files.push(...appCss());
  const violations = [];
  for (const rel of files) {
    if (TOKEN_FILES.includes(basename(rel))) continue;
    const lines = readFileSync(join(ROOT, rel), 'utf8').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('ds-allow-hex')) continue;
      if (HEX_RE.test(line)) violations.push(`${rel}:${i + 1}  ${line.trim()}`);
    }
  }
  return violations;
};

const main = () => {
  const { failures, extensions } = checkParity();
  const violations = checkAdherence();
  if (extensions.length > 0) {
    console.log(
      `ds-check: ${extensions.length} production-only token(s) (allowed): ` +
        extensions.join(', '),
    );
  }
  let failed = false;
  if (failures.length > 0) {
    failed = true;
    console.error(`\nds-check: ${failures.length} token parity failure(s):`);
    for (const line of failures) console.error('  ' + line);
  }
  if (violations.length > 0) {
    failed = true;
    console.error(
      `\nds-check: ${violations.length} raw-hex adherence violation(s) ` +
        '(use a var() token, or annotate with `ds-allow-hex`):',
    );
    for (const line of violations) console.error('  ' + line);
  }
  if (failed) process.exit(1);
  console.log('ds-check: production CSS is in sync with the design system ✓');
};

main();
