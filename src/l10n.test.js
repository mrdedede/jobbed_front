import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '../l10n/en.json';
import { t } from './l10n.js';

const SRC = import.meta.dirname;

/** Every non-test .js/.jsx file under src. */
function sources() {
  return readdirSync(SRC, { recursive: true })
    .filter((file) => /\.jsx?$/.test(file) && !/\.test\.jsx?$/.test(file))
    .map((file) => readFileSync(join(SRC, file), 'utf8'));
}

describe('l10n', () => {
  it('fills params and keeps unknown placeholders', () => {
    expect(t('query_loading', { label: 'CVs' })).toBe('Loading CVs');
    expect(t('cv_profile_languages_hint')).toContain('{language_fr}');
  });

  it('throws on an unknown id', () => {
    expect(() => t('no_such_id')).toThrow('Missing l10n id: no_such_id');
  });

  it('en.json has exactly the ids the code uses', () => {
    const used = new Set(sources().flatMap((code) => [...code.matchAll(/\bt\('(\w+)'/g)].map((m) => m[1])));
    // Ids picked by a ternary: t(cond ? 'a' : 'b').
    for (const code of sources()) {
      for (const m of code.matchAll(/\bt\([^)]*\? '(\w+)' : '(\w+)'/g)) used.add(m[1]).add(m[2]);
    }
    expect([...used].filter((id) => !(id in en))).toEqual([]);
    expect(Object.keys(en).filter((id) => !used.has(id))).toEqual([]);
  });
});
