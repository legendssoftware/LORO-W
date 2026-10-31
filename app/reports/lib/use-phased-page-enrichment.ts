'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import type { UserTargetDashboardShape } from '@/api/endpoints/user';
import {
  applyErpSalesToRow,
  applyProductivityToRow,
  enrichRowWithTargetDashboard,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';

export type PageRowEnrichment = {
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null;
  erpRevenue: number | null;
  erpSalesRepCode: string | null;
  erpSalesCountryCode: string | null;
  erpLoading: boolean;
  productivityScore: number | null;
  productivityLoading: boolean;
};

const EMPTY_ENRICHMENT: PageRowEnrichment = {
  dashboard: null,
  erpRevenue: null,
  erpSalesRepCode: null,
  erpSalesCountryCode: null,
  erpLoading: false,
  productivityScore: null,
  productivityLoading: false,
};

export type CustomerCategoryOption = {
  id: string;
  name: string;
};

type EnrichmentApiRow = {
  userId: number;
  userTarget: UserTargetDashboardShape | Record<string, unknown> | null;
  erpRevenue: number | null;
  productivityScore: number | null;
};

type EnrichmentApiBody = {
  data?: EnrichmentApiRow[];
  customerCategories?: CustomerCategoryOption[];
};

export function getPageRowEnrichmentKey(row: ReportsTargetRow): string {
  return `${row.ref}:${row.userId}`;
}

function mergeEnrichment(
  row: ReportsTargetRow,
  enrich: PageRowEnrichment | undefined,
  options?: { preserveRangeMetrics?: boolean }
): ReportsTargetRow {
  if (!enrich) return row;
  let next = enrich.dashboard
    ? enrichRowWithTargetDashboard(row, enrich.dashboard, {
        preserveRangeMetrics: options?.preserveRangeMetrics,
      })
    : row;
  if (enrich.erpRevenue != null) {
    next = applyErpSalesToRow(next, enrich.erpRevenue);
  }
  next = {
    ...next,
    erpSalesRepCode: enrich.erpSalesRepCode,
    erpSalesCountryCode: enrich.erpSalesCountryCode,
  };
  next = applyProductivityToRow(next, enrich.productivityScore, {
    isLoading: enrich.productivityLoading,
  });
  return next;
}

/**
 * Targets and productivity stay on one batch. ERP sales is a second request so the
 * Sales column paints without waiting for those heavier rows.
 */
export function usePhasedPageEnrichment(opts: {
  pageRows: ReportsTargetRow[];
  client: AxiosInstance;
  enabled: boolean;
  rangeFrom: string | null;
  rangeTo: string | null;
  excludeCustomerCategories?: string[];
  includeCustomerCategories?: string[];
  preserveRangeMetrics?: boolean;
}): {
  enrichmentByKey: Map<string, PageRowEnrichment>;
  customerCategories: CustomerCategoryOption[];
  isEnriching: boolean;
  enrichRow: (row: ReportsTargetRow) => ReportsTargetRow;
} {
  const {
    pageRows,
    client,
    enabled,
    rangeFrom,
    rangeTo,
    excludeCustomerCategories,
    includeCustomerCategories,
    preserveRangeMetrics,
  } = opts;
  const excludedKey = (excludeCustomerCategories ?? []).slice().sort().join(',');
  const includedKey = (includeCustomerCategories ?? []).slice().sort().join(',');
  const [enrichmentByKey, setEnrichmentByKey] = useState(
    () => new Map<string, PageRowEnrichment>()
  );
  const [customerCategories, setCustomerCategories] = useState<CustomerCategoryOption[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);
  const generationRef = useRef(0);

  const pageSignature = useMemo(
    () => pageRows.map((r) => getPageRowEnrichmentKey(r)).join('|'),
    [pageRows]
  );

  useEffect(() => {
    if (!enabled || pageRows.length === 0) {
      setEnrichmentByKey(new Map());
      setCustomerCategories([]);
      setIsEnriching(false);
      return;
    }

    const generation = ++generationRef.current;
    const abort = new AbortController();
    const rows = [...pageRows];
    const userIds = [...new Set(rows.map((row) => row.userId).filter((id) => id > 0))].slice(0, 25);

    setEnrichmentByKey(() => {
      const next = new Map<string, PageRowEnrichment>();
      for (const row of rows) {
        next.set(getPageRowEnrichmentKey(row), {
          ...EMPTY_ENRICHMENT,
          erpLoading: true,
          productivityLoading: !!(rangeFrom && rangeTo),
        });
      }
      return next;
    });
    setIsEnriching(true);

    const excludeCustomerCategoriesBody = excludedKey ? excludedKey.split(',') : undefined;
    const includeCustomerCategoriesBody = includedKey ? includedKey.split(',') : undefined;
    const requestBody = {
      userIds,
      from: rangeFrom ?? undefined,
      to: rangeTo ?? undefined,
      excludeCustomerCategories: excludeCustomerCategoriesBody,
      includeCustomerCategories: includeCustomerCategoriesBody,
    };

    const salesRequest = client
      .post<{
        data?: Array<{
          userId: number;
          erpRevenue: number | null;
          erpSalesRepCode?: string | null;
          erpCountryCode?: string | null;
        }>;
      }>(
        '/reports/targets-page-sales',
        requestBody,
        { signal: abort.signal }
      )
      .then((response) => {
        if (generation !== generationRef.current) return;
        const byUser = new Map((response.data?.data ?? []).map((row) => [row.userId, row]));
        setEnrichmentByKey((prev) => {
          const next = new Map(prev);
          for (const row of rows) {
            const key = getPageRowEnrichmentKey(row);
            const current = next.get(key) ?? { ...EMPTY_ENRICHMENT };
            const item = byUser.get(row.userId);
            next.set(key, {
              ...current,
              erpRevenue: item?.erpRevenue ?? null,
              erpSalesRepCode: item?.erpSalesRepCode ?? null,
              erpSalesCountryCode: item?.erpCountryCode ?? null,
              erpLoading: false,
            });
          }
          return next;
        });
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        setEnrichmentByKey((prev) => {
          const next = new Map(prev);
          for (const row of rows) {
            const key = getPageRowEnrichmentKey(row);
            const current = next.get(key) ?? { ...EMPTY_ENRICHMENT };
            next.set(key, { ...current, erpLoading: false });
          }
          return next;
        });
      });

    const enrichRequest = client
      .post<EnrichmentApiBody>(
        '/reports/targets-page-enrichment',
        { ...requestBody, skipErp: true },
        { signal: abort.signal }
      )
      .then((response) => {
        if (generation !== generationRef.current) return;
        const categories = (response.data?.customerCategories ?? []).filter(
          (category) => category.id && category.name
        );
        setCustomerCategories(categories);
        const byUser = new Map((response.data?.data ?? []).map((row) => [row.userId, row]));
        setEnrichmentByKey((prev) => {
          const next = new Map(prev);
          for (const row of rows) {
            const key = getPageRowEnrichmentKey(row);
            const current = next.get(key) ?? { ...EMPTY_ENRICHMENT };
            const item = byUser.get(row.userId);
            next.set(key, {
              ...current,
              dashboard: item?.userTarget ?? null,
              productivityScore: item?.productivityScore ?? null,
              productivityLoading: false,
            });
          }
          return next;
        });
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        setEnrichmentByKey((prev) => {
          const next = new Map(prev);
          for (const row of rows) {
            const key = getPageRowEnrichmentKey(row);
            const current = next.get(key) ?? { ...EMPTY_ENRICHMENT };
            next.set(key, { ...current, productivityLoading: false });
          }
          return next;
        });
      });

    void Promise.allSettled([salesRequest, enrichRequest]).finally(() => {
      if (generation === generationRef.current) setIsEnriching(false);
    });

    return () => {
      abort.abort();
    };
  }, [enabled, pageSignature, rangeFrom, rangeTo, excludedKey, includedKey, client]);

  const enrichRow = useMemo(() => {
    return (row: ReportsTargetRow) =>
      mergeEnrichment(row, enrichmentByKey.get(getPageRowEnrichmentKey(row)), {
        preserveRangeMetrics,
      });
  }, [enrichmentByKey, preserveRangeMetrics]);

  return { enrichmentByKey, customerCategories, isEnriching, enrichRow };
}
