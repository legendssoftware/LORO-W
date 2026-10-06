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
  erpLoading: boolean;
  productivityScore: number | null;
  productivityLoading: boolean;
};

const EMPTY_ENRICHMENT: PageRowEnrichment = {
  dashboard: null,
  erpRevenue: null,
  erpLoading: false,
  productivityScore: null,
  productivityLoading: false,
};

type EnrichmentApiRow = {
  userId: number;
  userTarget: UserTargetDashboardShape | Record<string, unknown> | null;
  erpRevenue: number | null;
  productivityScore: number | null;
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
  next = applyProductivityToRow(next, enrich.productivityScore, {
    isLoading: enrich.productivityLoading,
  });
  return next;
}

/**
 * One batch request for the visible targets page (target, ERP sales, productivity).
 */
export function usePhasedPageEnrichment(opts: {
  pageRows: ReportsTargetRow[];
  client: AxiosInstance;
  enabled: boolean;
  rangeFrom: string | null;
  rangeTo: string | null;
  preserveRangeMetrics?: boolean;
}): {
  enrichmentByKey: Map<string, PageRowEnrichment>;
  isEnriching: boolean;
  enrichRow: (row: ReportsTargetRow) => ReportsTargetRow;
} {
  const { pageRows, client, enabled, rangeFrom, rangeTo, preserveRangeMetrics } = opts;
  const [enrichmentByKey, setEnrichmentByKey] = useState(
    () => new Map<string, PageRowEnrichment>()
  );
  const [isEnriching, setIsEnriching] = useState(false);
  const generationRef = useRef(0);

  const pageSignature = useMemo(
    () => pageRows.map((r) => getPageRowEnrichmentKey(r)).join('|'),
    [pageRows]
  );

  useEffect(() => {
    if (!enabled || pageRows.length === 0) {
      setEnrichmentByKey(new Map());
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

    void client
      .post<{ data?: EnrichmentApiRow[] }>(
        '/reports/targets-page-enrichment',
        {
          userIds,
          from: rangeFrom ?? undefined,
          to: rangeTo ?? undefined,
        },
        { signal: abort.signal }
      )
      .then((response) => {
        if (generation !== generationRef.current) return;
        const byUser = new Map((response.data?.data ?? []).map((row) => [row.userId, row]));
        setEnrichmentByKey(() => {
          const next = new Map<string, PageRowEnrichment>();
          for (const row of rows) {
            const item = byUser.get(row.userId);
            next.set(getPageRowEnrichmentKey(row), {
              dashboard: item?.userTarget ?? null,
              erpRevenue: item?.erpRevenue ?? null,
              erpLoading: false,
              productivityScore: item?.productivityScore ?? null,
              productivityLoading: false,
            });
          }
          return next;
        });
      })
      .catch(() => {
        if (generation !== generationRef.current) return;
        setEnrichmentByKey(() => {
          const next = new Map<string, PageRowEnrichment>();
          for (const row of rows) {
            next.set(getPageRowEnrichmentKey(row), { ...EMPTY_ENRICHMENT });
          }
          return next;
        });
      })
      .finally(() => {
        if (generation === generationRef.current) setIsEnriching(false);
      });

    return () => {
      abort.abort();
    };
  }, [enabled, pageSignature, rangeFrom, rangeTo, client]);

  const enrichRow = useMemo(() => {
    return (row: ReportsTargetRow) =>
      mergeEnrichment(row, enrichmentByKey.get(getPageRowEnrichmentKey(row)), {
        preserveRangeMetrics,
      });
  }, [enrichmentByKey, preserveRangeMetrics]);

  return { enrichmentByKey, isEnriching, enrichRow };
}
