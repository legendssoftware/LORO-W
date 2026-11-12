'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  cancelDelivery,
  createDelivery,
  getDelivery,
  getDeliveryPdf,
  listAssignableOrders,
  listDeliveries,
  listDrivers,
} from '@/api/endpoints/epod';
import type {
  AssignableOrder,
  CreateDeliveryBody,
  DeliveryListQuery,
  DeliveryStatus,
  DeliverySummary,
} from '@/api/types/epod';

export const EPOD_QUERY_KEY = ['epod'] as const;

/** Statuses a dispatcher may still cancel. A recorded proof is permanent. */
const CANCELLABLE_STATUSES = new Set<DeliveryStatus>(['assigned', 'in_progress']);

/**
 * True when a dispatcher may cancel this stop. Mirrors EpodService.cancel.
 * @param status Delivery status from the API
 */
export function canCancelDelivery(status: DeliveryStatus | undefined): boolean {
  if (!status) return false;
  return CANCELLABLE_STATUSES.has(status);
}

/**
 * Narrows the deliveries overview by ERP invoice number.
 * An empty search returns every row. Matching is case-insensitive and partial, same as staff search.
 * @param deliveries Rows already limited by day, status, and driver
 * @param search Raw search box text
 */
export function filterDeliveriesByInvoice(
  deliveries: readonly DeliverySummary[],
  search: string,
): DeliverySummary[] {
  const term = search.trim().toLowerCase();
  if (!term) return [...deliveries];
  return deliveries.filter((delivery) =>
    (delivery.invoiceNumber ?? '').toLowerCase().includes(term),
  );
}

/**
 * Narrows the assign dialog order list by order number or client name.
 * @param orders Rows from GET /epod/assignable-orders
 * @param search Raw search box text
 */
export function filterAssignableOrders(
  orders: readonly AssignableOrder[],
  search: string,
): AssignableOrder[] {
  const term = search.trim().toLowerCase();
  if (!term) return [...orders];
  return orders.filter(
    (order) =>
      order.orderNumber.toLowerCase().includes(term) ||
      order.clientName.toLowerCase().includes(term),
  );
}

export function useDeliveries(query: DeliveryListQuery = {}, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...EPOD_QUERY_KEY, 'list', query.date ?? null, query.driverUid ?? null, query.status ?? null],
    queryFn: () => listDeliveries(client, query),
    enabled,
  });
}

export function useDelivery(uid: number, enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...EPOD_QUERY_KEY, 'detail', uid],
    queryFn: () => getDelivery(client, uid),
    enabled: enabled && Number.isFinite(uid),
  });
}

export function useDeliveryDrivers(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...EPOD_QUERY_KEY, 'drivers'],
    queryFn: () => listDrivers(client),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAssignableOrders(enabled = true) {
  const client = useApiClient();
  return useQuery({
    queryKey: [...EPOD_QUERY_KEY, 'assignable-orders'],
    queryFn: () => listAssignableOrders(client),
    enabled,
  });
}

export function useAssignDeliveryMutation() {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateDeliveryBody) => createDelivery(client, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...EPOD_QUERY_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...EPOD_QUERY_KEY, 'assignable-orders'] });
    },
  });
}

export function useCancelDeliveryMutation(uid: number) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelDelivery(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...EPOD_QUERY_KEY, 'list'] });
      queryClient.invalidateQueries({ queryKey: [...EPOD_QUERY_KEY, 'detail', uid] });
    },
  });
}

/** Generates or re-reads the ePOD PDF on demand, for stops whose detail has no pdfUrl yet. */
export function useDeliveryPdfMutation(uid: number) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getDeliveryPdf(client, uid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...EPOD_QUERY_KEY, 'detail', uid] });
    },
  });
}
