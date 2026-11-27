import { describe, expect, it } from 'vitest';
import { canClientCancelOrder, canClientEditOrder } from '@/lib/client-order-actions';

describe('client order actions', () => {
  it('allows edits before fulfillment and blocks them once sourcing starts', () => {
    expect(canClientEditOrder('pending_internal')).toBe(true);
    expect(canClientEditOrder('approved')).toBe(true);
    expect(canClientEditOrder('sourcing')).toBe(false);
    expect(canClientEditOrder('paid')).toBe(false);
    expect(canClientEditOrder('cancelled')).toBe(false);
  });

  it('allows cancel from pending internal and blocks a completed order', () => {
    expect(canClientCancelOrder('pending_internal')).toBe(true);
    expect(canClientCancelOrder('completed')).toBe(false);
    expect(canClientCancelOrder('cancelled')).toBe(false);
  });
});
