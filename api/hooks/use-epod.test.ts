import { describe, expect, it } from 'vitest';
import type { AssignableOrder } from '@/api/types/epod';
import { canCancelDelivery, filterAssignableOrders } from './use-epod';

function order(uid: number, orderNumber: string, clientName: string): AssignableOrder {
  return { uid, orderNumber, status: 'packing', clientName, itemCount: 3 };
}

describe('filterAssignableOrders', () => {
  const orders = [
    order(1, 'ORD-10482', 'ABC Ceilings & Projects'),
    order(2, 'ORD-10483', 'Prime Construction'),
    order(3, 'ORD-10484', 'BuildRight Hardware'),
  ];

  it('returns every order when the search box is empty', () => {
    expect(filterAssignableOrders(orders, '').map((o) => o.uid)).toEqual([1, 2, 3]);
    expect(filterAssignableOrders(orders, '   ').map((o) => o.uid)).toEqual([1, 2, 3]);
  });

  it('matches on order number', () => {
    expect(filterAssignableOrders(orders, '10483').map((o) => o.uid)).toEqual([2]);
  });

  it('matches on client name regardless of case', () => {
    expect(filterAssignableOrders(orders, 'buildright').map((o) => o.uid)).toEqual([3]);
    expect(filterAssignableOrders(orders, 'PRIME').map((o) => o.uid)).toEqual([2]);
  });

  it('returns nothing when no order matches', () => {
    expect(filterAssignableOrders(orders, 'no-such-order')).toEqual([]);
  });

  it('does not mutate the source list', () => {
    const copy = [...orders];
    filterAssignableOrders(orders, 'prime');
    expect(orders).toEqual(copy);
  });
});

describe('canCancelDelivery', () => {
  it('allows an assigned or in-progress stop', () => {
    expect(canCancelDelivery('assigned')).toBe(true);
    expect(canCancelDelivery('in_progress')).toBe(true);
  });

  it('blocks a recorded proof and an already cancelled stop', () => {
    expect(canCancelDelivery('recorded')).toBe(false);
    expect(canCancelDelivery('cancelled')).toBe(false);
  });

  it('blocks a missing status', () => {
    expect(canCancelDelivery(undefined)).toBe(false);
  });
});
