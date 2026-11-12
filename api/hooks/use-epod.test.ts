import { describe, expect, it } from 'vitest';
import type { AssignableOrder, DeliverySummary } from '@/api/types/epod';
import { canCancelDelivery, filterAssignableOrders, filterDeliveriesByInvoice } from './use-epod';

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

function delivery(uid: number, invoiceNumber: string | null): DeliverySummary {
  return {
    uid,
    deliveryNumber: `DEL-${uid}`,
    status: 'assigned',
    routeCode: 'GP-07',
    scheduledDate: '2026-05-20',
    orderUid: uid,
    orderNumber: `SO-${uid}`,
    invoiceNumber,
    driverUid: 4,
    clientName: 'ABC',
    clientAddress: '123 Road',
    contactName: 'Thabo',
    contactPhone: '010',
    latitude: null,
    longitude: null,
    itemSummary: '10 boards',
    exception: null,
    pdfUrl: null,
  };
}

describe('filterDeliveriesByInvoice', () => {
  const deliveries = [delivery(1, 'INV-100'), delivery(2, 'INV-240'), delivery(3, null)];

  it('returns every delivery when the search box is empty', () => {
    expect(filterDeliveriesByInvoice(deliveries, '').map((row) => row.uid)).toEqual([1, 2, 3]);
    expect(filterDeliveriesByInvoice(deliveries, '   ').map((row) => row.uid)).toEqual([1, 2, 3]);
  });

  it('matches a partial invoice number regardless of case', () => {
    expect(filterDeliveriesByInvoice(deliveries, 'inv-24').map((row) => row.uid)).toEqual([2]);
    expect(filterDeliveriesByInvoice(deliveries, '100').map((row) => row.uid)).toEqual([1]);
  });

  it('returns nothing when no invoice matches', () => {
    expect(filterDeliveriesByInvoice(deliveries, 'INV-999')).toEqual([]);
  });

  it('does not mutate the source list', () => {
    const copy = [...deliveries];
    filterDeliveriesByInvoice(deliveries, '240');
    expect(deliveries).toEqual(copy);
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
