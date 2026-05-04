import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Static audit: bans physical-side Tailwind utilities in RTL-critical surfaces.
 *
 * Subject v20.0 minor module requires "complete layout mirroring" — so the
 * audit covers everything an evaluator will see: every page, every shared
 * component, the comic-book viewer, the wizard, friends/status pages.
 *
 * BASELINE MODEL: rtl.baseline.json snapshots the violations that exist
 * today as legacy debt. The test:
 *   - PASSES if the current violation set ⊆ baseline (no NEW physical classes)
 *   - FAILS if any new physical class is added
 *   - FAILS if a baseline-listed violation is fixed but the baseline isn't
 *     updated (so cleanup ratchets the baseline downward)
 *
 * To clean up debt: fix the file, then regenerate the baseline by setting
 * UPDATE_RTL_BASELINE=1 and re-running this file.
 */

import { writeFileSync } from 'node:fs';

const projectRoot = resolve(__dirname, '..', '..');
const baselinePath = resolve(__dirname, 'rtl.baseline.json');

const RTL_CRITICAL_PATHS = [
  'app',
  'components',
  'pages',
];

const SKIP_DIRS = new Set([
  'node_modules',
]);

/**
 * Banned: physical-side utilities that do NOT mirror under dir="rtl".
 * Patterns match Tailwind's normal AND arbitrary-value syntax (e.g. `pl-4`,
 * `pl-[1rem]`, `pl-auto`).
 */
const BANNED_PATTERNS: Array<{ pattern: RegExp; rule: string; logical: string }> = [
  // text alignment
  { pattern: /\btext-left\b/, rule: 'text-left', logical: 'text-start' },
  { pattern: /\btext-right\b/, rule: 'text-right', logical: 'text-end' },
  // floats
  { pattern: /\bfloat-left\b/, rule: 'float-left', logical: 'float-start' },
  { pattern: /\bfloat-right\b/, rule: 'float-right', logical: 'float-end' },
  // transform origins
  { pattern: /\borigin-(?:top-|bottom-)?left\b/, rule: 'origin-left', logical: 'use logical equivalent or accept asymmetry' },
  { pattern: /\borigin-(?:top-|bottom-)?right\b/, rule: 'origin-right', logical: 'use logical equivalent or accept asymmetry' },
  // margins (numeric, arbitrary, auto)
  { pattern: /(?<![a-z])-?ml-(?:\d|\[|auto|px)/, rule: 'ml-*', logical: 'ms-*' },
  { pattern: /(?<![a-z])-?mr-(?:\d|\[|auto|px)/, rule: 'mr-*', logical: 'me-*' },
  // padding
  { pattern: /(?<![a-z])-?pl-(?:\d|\[|px)/, rule: 'pl-*', logical: 'ps-*' },
  { pattern: /(?<![a-z])-?pr-(?:\d|\[|px)/, rule: 'pr-*', logical: 'pe-*' },
  // borders
  { pattern: /\bborder-l\b/, rule: 'border-l', logical: 'border-s' },
  { pattern: /\bborder-r\b/, rule: 'border-r', logical: 'border-e' },
  { pattern: /\bborder-l-\d/, rule: 'border-l-*', logical: 'border-s-*' },
  { pattern: /\bborder-r-\d/, rule: 'border-r-*', logical: 'border-e-*' },
  // rounded corners
  { pattern: /\brounded-l(?:-|\b)/, rule: 'rounded-l-*', logical: 'rounded-s-*' },
  { pattern: /\brounded-r(?:-|\b)/, rule: 'rounded-r-*', logical: 'rounded-e-*' },
  { pattern: /\brounded-tl(?:-|\b)/, rule: 'rounded-tl-*', logical: 'rounded-ss-*' },
  { pattern: /\brounded-tr(?:-|\b)/, rule: 'rounded-tr-*', logical: 'rounded-se-*' },
  { pattern: /\brounded-bl(?:-|\b)/, rule: 'rounded-bl-*', logical: 'rounded-es-*' },
  { pattern: /\brounded-br(?:-|\b)/, rule: 'rounded-br-*', logical: 'rounded-ee-*' },
  // sibling spacing without -reverse fallback
  { pattern: /\bspace-x-(?:\d|\[)(?!-reverse)/, rule: 'space-x-* without -reverse', logical: 'gap-*' },
  { pattern: /\bdivide-x-(?:\d|\[)(?!-reverse)/, rule: 'divide-x-* without -reverse', logical: 'border with logical sides' },
  // physical positioning
  { pattern: /(?<![a-z])-?left-(?:\d|\[|auto|full|px)/, rule: 'left-*', logical: 'start-*' },
  { pattern: /(?<![a-z])-?right-(?:\d|\[|auto|full|px)/, rule: 'right-*', logical: 'end-*' },
];

/**
 * Lines containing any of these are intentionally direction-agnostic and skipped.
 * Centering combos and explicit -reverse variants are valid.
 */
const IGNORED_TOKENS: RegExp[] = [
  /^-?left-1\/2$/,
  /^-?right-1\/2$/,
  /^-?translate-x-1\/2$/,
  /\binset-x-/,
  /-reverse\b/,
  // Explicit per-line escape hatch for direction-aware helpers that branch
  // on LanguageDirection and intentionally return a physical class.
  /\/\/\s*rtl-ok\b/,
];

interface Violation {
  file: string;
  line: number;
  rule: string;
}

function* walk(dir: string): Generator<string> {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (/\.(tsx?|jsx?)$/.test(entry) && !/\.test\.(tsx?|jsx?)$/.test(entry)) {
      yield full;
    }
  }
}

function collectFiles(): string[] {
  const out: string[] = [];
  for (const target of RTL_CRITICAL_PATHS) {
    const abs = resolve(projectRoot, target);
    if (!existsSync(abs)) continue;
    const st = statSync(abs);
    if (st.isFile()) out.push(abs);
    else if (st.isDirectory()) out.push(...walk(abs));
  }
  return out;
}

function scanFile(absPath: string): Violation[] {
  const source = readFileSync(absPath, 'utf8');
  const rel = relative(projectRoot, absPath);
  const violations: Violation[] = [];

  source.split('\n').forEach((line, index) => {
    if (/\/\/\s*rtl-ok\b/.test(line)) return;

    const searchableLine = line
      .split(/\s+/)
      .filter((token) => !IGNORED_TOKENS.some((rx) => rx.test(token)))
      .join(' ');

    for (const { pattern, rule } of BANNED_PATTERNS) {
      if (pattern.test(searchableLine)) {
        violations.push({ file: rel, line: index + 1, rule });
      }
    }
  });

  return violations;
}

function violationKey(v: Violation): string {
  return `${v.file}:${v.line}:${v.rule}`;
}

interface Baseline {
  description: string;
  violations: string[];
}

function loadBaseline(): Baseline {
  if (!existsSync(baselinePath)) {
    return { description: '', violations: [] };
  }
  return JSON.parse(readFileSync(baselinePath, 'utf8')) as Baseline;
}

describe('RTL audit: physical-side classes across all rendered surfaces', () => {
  it('no new physical-side classes; baseline ratchets downward only', () => {
    const files = collectFiles();
    expect(files.length).toBeGreaterThan(20); // sanity: covers real surfaces

    const current = files.flatMap(scanFile);
    const currentKeys = new Set(current.map(violationKey));

    if (process.env.UPDATE_RTL_BASELINE === '1') {
      writeFileSync(
        baselinePath,
        `${JSON.stringify(
          {
            description:
              'Snapshot of legacy physical-class usage. Audit fails if NEW entries appear or if listed entries no longer match (regenerate with UPDATE_RTL_BASELINE=1).',
            violations: [...currentKeys].sort(),
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const baseline = loadBaseline();
    const baselineSet = new Set(baseline.violations);

    const newViolations = [...currentKeys].filter((k) => !baselineSet.has(k));
    const fixedButStillListed = [...baselineSet].filter((k) => !currentKeys.has(k));

    const errors: string[] = [];
    if (newViolations.length > 0) {
      errors.push(
        `Found ${newViolations.length} NEW physical-side class usage(s):\n` +
          newViolations.sort().map((v) => `  + ${v}`).join('\n') +
          '\n  → Replace with the logical equivalent (ml-*→ms-*, pr-*→pe-*, text-left→text-start, etc.)',
      );
    }
    if (fixedButStillListed.length > 0) {
      errors.push(
        `Baseline lists ${fixedButStillListed.length} violation(s) that no longer exist:\n` +
          fixedButStillListed.sort().map((v) => `  - ${v}`).join('\n') +
          '\n  → Regenerate baseline: UPDATE_RTL_BASELINE=1 npx vitest run tests/i18n/rtlAudit.test.ts',
      );
    }

    if (errors.length > 0) {
      throw new Error(errors.join('\n\n'));
    }
  });
});
