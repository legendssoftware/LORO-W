import { describe, expect, it } from 'vitest';
import { AccessLevel } from '@/api/types/user';

/** Drift guard: web AccessLevel values stay a unique set aligned with server enum. */
describe('AccessLevel', () => {
  it('has 36 distinct string values (matches server AccessLevel enum)', () => {
    const vals = Object.values(AccessLevel);
    expect(vals).toHaveLength(36);
    expect(new Set(vals).size).toBe(36);
  });
});
