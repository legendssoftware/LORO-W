import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(__dirname, '../../messages');
const locales = ['en', 'pt', 'fr', 'es'] as const;

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('locale catalogs', () => {
  it('gives every locale the same keys as English', () => {
    const namespaces = readdirSync(path.join(root, 'en')).filter((file) => file.endsWith('.json'));
    expect(namespaces.length).toBeGreaterThan(0);

    for (const namespace of namespaces) {
      const english = flatten(JSON.parse(readFileSync(path.join(root, 'en', namespace), 'utf8')));
      for (const locale of locales) {
        const file = path.join(root, locale, namespace);
        const keys = flatten(JSON.parse(readFileSync(file, 'utf8')));
        expect(keys.sort(), `${locale}/${namespace}`).toEqual(english.sort());
      }
    }
  });
});
