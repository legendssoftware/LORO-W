import { describe, expect, it } from 'vitest';
import type { AssignableOrder, DeliverySummary } from '@/api/types/epod';
import { canCancelDelivery, filterAssignableOrders, filterDeliveries } from './use-epod';

function order(docNumber: string, clientName: string): AssignableOrder {
  return { docNumber, store: '001', orderNumber: docNumber, status: 'open', clientName, itemCount: 3 };
}

describe('filterAssignableOrders', () => {
  const orders = [
    order('ORD-10482', 'ABC Ceilings & Projects'),
    order('ORD-10483', 'Prime Construction'),
    order('ORD-10484', 'BuildRight Hardware'),
  ];

  it('returns every order when the search box is empty', () => {
    expect(filterAssignableOrders(orders, '').map((o) => o.docNumber)).toEqual([
      'ORD-10482',
      'ORD-10483',
      'ORD-10484',
    ]);
    expect(filterAssignableOrders(orders, '   ').map((o) => o.docNumber)).toEqual([
      'ORD-10482',
      'ORD-10483',
      'ORD-10484',
    ]);
  });

  it('matches on order number', () => {
    expect(filterAssignableOrders(orders, '10483').map((o) => o.docNumber)).toEqual(['ORD-10483']);
  });

  it('matches on client name regardless of case', () => {
    expect(filterAssignableOrders(orders, 'buildright').map((o) => o.docNumber)).toEqual(['ORD-10484']);
    expect(filterAssignableOrders(orders, 'PRIME').map((o) => o.docNumber)).toEqual(['ORD-10483']);
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

function delivery(
  uid: number,
  invoiceNumber: string | null,
  extras: Partial<Pick<DeliverySummary, 'driverName' | 'truckRegistration' | 'clientName'>> = {},
): DeliverySummary {
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
    driverName: extras.driverName ?? null,
    truckRegistration: extras.truckRegistration ?? null,
    clientName: extras.clientName ?? 'ABC',
    clientAddress: '123 Road',
    contactName: 'Thabo',
    contactPhone: '010',
    latitude: null,
    longitude: null,
    itemSummary: '10 boards',
    exception: null,
    pdfUrl: null,
    ratingScore: null,
  };
}

describe('filterDeliveries', () => {
  const deliveries = [
    delivery(1, 'INV-100', { driverName: 'Brandon Olifant', truckRegistration: 'CA 123 GP', clientName: 'Sandton Kitchens' }),
    delivery(2, 'INV-240', { driverName: 'Sam Driver', truckRegistration: 'ND 456 GP', clientName: 'Prime Construction' }),
    delivery(3, null, { clientName: 'BuildRight Hardware' }),
  ];

  it('returns every delivery when the search box is empty', () => {
    expect(filterDeliveries(deliveries, '').map((row) => row.uid)).toEqual([1, 2, 3]);
    expect(filterDeliveries(deliveries, '   ').map((row) => row.uid)).toEqual([1, 2, 3]);
  });

  it('matches a partial invoice number regardless of case', () => {
    expect(filterDeliveries(deliveries, 'inv-24').map((row) => row.uid)).toEqual([2]);
    expect(filterDeliveries(deliveries, '100').map((row) => row.uid)).toEqual([1]);
  });

  it('matches a driver name regardless of case', () => {
    expect(filterDeliveries(deliveries, 'olifant').map((row) => row.uid)).toEqual([1]);
  });

  it('matches a truck registration', () => {
    expect(filterDeliveries(deliveries, 'nd 456').map((row) => row.uid)).toEqual([2]);
  });

  it('matches a client name', () => {
    expect(filterDeliveries(deliveries, 'sandton').map((row) => row.uid)).toEqual([1]);
  });

  it('matches an ERP order number and a delivery number', () => {
    expect(filterDeliveries(deliveries, 'so-2').map((row) => row.uid)).toEqual([2]);
    expect(filterDeliveries(deliveries, 'del-3').map((row) => row.uid)).toEqual([3]);
  });

  it('returns nothing when nothing matches', () => {
    expect(filterDeliveries(deliveries, 'INV-999')).toEqual([]);
  });

  it('does not mutate the source list', () => {
    const copy = [...deliveries];
    filterDeliveries(deliveries, '240');
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
