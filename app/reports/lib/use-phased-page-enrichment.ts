'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import {
  getDailyProductivity,
  getUserTarget,
  type GetUserTargetResponse,
  type UserTargetDashboardShape,
} from '@/api/endpoints/user';
import {
  getUserSales,
  profileSalesFromResponse,
} from '@/api/endpoints/erp-user-sales';
import {
  DAILY_PRODUCTIVITY_KEY_PREFIX,
  USER_TARGET_QUERY_KEY_PREFIX,
} from '@/api/hooks';
import { runWithConcurrency } from '@/app/reports/lib/run-with-concurrency';
import {
  applyErpSalesToRow,
  applyProductivityToRow,
  averageProductivityScore,
  enrichRowWithTargetDashboard,
  type ReportsTargetRow,
} from '@/app/reports/lib/reports-target-row';

const ERP_USER_SALES_QUERY_KEY = ['erp', 'user-sales'] as const;

/** Target dashboard fetches — moderate; usually CRM-backed. */
const TARGET_CONCURRENCY = 4;
/** ERP Pastel sales — keep low to avoid flooding / hanging the UI. */
const ERP_CONCURRENCY = 2;
/** Daily productivity — after targets/ERP. */
const PRODUCTIVITY_CONCURRENCY = 3;

export type PageRowEnrichment = {
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null;
  erpRevenue: number | null;
  /** True while ERP is queued or in flight for a row with a sales target. */
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

export function getPageRowEnrichmentKey(row: ReportsTargetRow): string {
  return `${row.ref}:${row.userId}`;
}

function salesTargetFromDashboard(
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null
): number {
  if (!dashboard || typeof dashboard !== 'object') return 0;
  const personal =
    'personalTargets' in dashboard &&
    dashboard.personalTargets &&
    typeof dashboard.personalTargets === 'object'
      ? (dashboard.personalTargets as { sales?: { target?: unknown } })
      : (dashboard as { sales?: { target?: unknown } });
  const t = personal?.sales?.target;
  const n = typeof t === 'number' ? t : Number(t);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function resolveSalesTarget(
  row: ReportsTargetRow,
  dashboard: UserTargetDashboardShape | Record<string, unknown> | null
): number {
  const fromDash = salesTargetFromDashboard(dashboard);
  if (fromDash > 0) return fromDash;
  return row.sales.target > 0 ? row.sales.target : 0;
}

function mergeEnrichment(
  row: ReportsTargetRow,
  enrich: PageRowEnrichment | undefined
): ReportsTargetRow {
  if (!enrich) return row;
  let next = enrich.dashboard
    ? enrichRowWithTargetDashboard(row, enrich.dashboard)
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
 * Progressively enrich the visible Targets page:
 * 1) user targets (warnings / personal targets)
 * 2) ERP sales only for rows with a sales target (concurrency-capped)
 * 3) daily productivity when a date range is set
 *
 * Rows paint immediately; cells update as each phase settles.
 */
export function usePhasedPageEnrichment(opts: {
  pageRows: ReportsTargetRow[];
  client: AxiosInstance;
  enabled: boolean;
  rangeFrom: string | null;
  rangeTo: string | null;
}): {
  enrichmentByKey: Map<string, PageRowEnrichment>;
  isEnriching: boolean;
  enrichRow: (row: ReportsTargetRow) => ReportsTargetRow;
} {
  const { pageRows, client, enabled, rangeFrom, rangeTo } = opts;
  const queryClient = useQueryClient();
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
    const hasProductivityRange = !!(rangeFrom && rangeTo);

    setEnrichmentByKey(() => {
      const next = new Map<string, PageRowEnrichment>();
      for (const row of rows) {
        next.set(getPageRowEnrichmentKey(row), {
          ...EMPTY_ENRICHMENT,
          erpLoading: row.sales.target > 0,
          productivityLoading: hasProductivityRange,
        });
      }
      return next;
    });
    setIsEnriching(true);

    function patchKey(key: string, patch: Partial<PageRowEnrichment>): void {
      if (generation !== generationRef.current) return;
      setEnrichmentByKey((prev) => {
        const next = new Map(prev);
        const cur = next.get(key) ?? { ...EMPTY_ENRICHMENT };
        next.set(key, { ...cur, ...patch });
        return next;
      });
    }

    async function run(): Promise<void> {
      // --- Phase 1: targets ---
      await runWithConcurrency(
        rows,
        TARGET_CONCURRENCY,
        async (row) => {
          if (abort.signal.aborted) return null;
          try {
            return await queryClient.fetchQuery({
              queryKey: [...USER_TARGET_QUERY_KEY_PREFIX, row.ref] as const,
              queryFn: () => getUserTarget(client, row.ref),
              staleTime: 60 * 1000,
              gcTime: 5 * 60 * 1000,
            });
          } catch {
            return null;
          }
        },
        {
          signal: abort.signal,
          onItemSettled: (res, row) => {
            const dashboard = res?.userTarget ?? null;
            const salesTarget = resolveSalesTarget(row, dashboard);
            patchKey(getPageRowEnrichmentKey(row), {
              dashboard,
              erpLoading: salesTarget > 0,
            });
          },
        }
      );

      if (abort.signal.aborted || generation !== generationRef.current) return;

      // --- Phase 2: ERP sales (capped) ---
      const erpQueue = rows.filter((row) => {
        const cached = queryClient.getQueryData<GetUserTargetResponse>([
          ...USER_TARGET_QUERY_KEY_PREFIX,
          row.ref,
        ]);
        return resolveSalesTarget(row, cached?.userTarget ?? null) > 0;
      });

      // Clear erpLoading for rows that will never hit ERP
      for (const row of rows) {
        if (!erpQueue.some((r) => r.ref === row.ref)) {
          patchKey(getPageRowEnrichmentKey(row), { erpLoading: false });
        }
      }

      await runWithConcurrency(
        erpQueue,
        ERP_CONCURRENCY,
        async (row) => {
          if (abort.signal.aborted) return null;
          try {
            return await queryClient.fetchQuery({
              queryKey: [...ERP_USER_SALES_QUERY_KEY, row.userId] as const,
              queryFn: async (): Promise<number | null> => {
                try {
                  const res = await getUserSales(client, row.userId);
                  const payload = profileSalesFromResponse(res);
                  return payload?.totalRevenue ?? null;
                } catch {
                  return null;
                }
              },
              staleTime: 2 * 60 * 1000,
              gcTime: 5 * 60 * 1000,
            });
          } catch {
            return null;
          }
        },
        {
          signal: abort.signal,
          onItemSettled: (revenue, row) => {
            patchKey(getPageRowEnrichmentKey(row), {
              erpRevenue: revenue,
              erpLoading: false,
            });
          },
        }
      );

      if (abort.signal.aborted || generation !== generationRef.current) return;

      for (const row of erpQueue) {
        patchKey(getPageRowEnrichmentKey(row), { erpLoading: false });
      }

      // --- Phase 3: productivity ---
      if (hasProductivityRange && rangeFrom && rangeTo) {
        await runWithConcurrency(
          rows,
          PRODUCTIVITY_CONCURRENCY,
          async (row) => {
            if (abort.signal.aborted) return null;
            try {
              const res = await queryClient.fetchQuery({
                queryKey: [
                  ...DAILY_PRODUCTIVITY_KEY_PREFIX,
                  row.ref,
                  rangeFrom,
                  rangeTo,
                ] as const,
                queryFn: () =>
                  getDailyProductivity(client, row.ref, {
                    startDate: rangeFrom,
                    endDate: rangeTo,
                  }),
                staleTime: 60 * 1000,
                gcTime: 5 * 60 * 1000,
              });
              return averageProductivityScore(res?.days);
            } catch {
              return null;
            }
          },
          {
            signal: abort.signal,
            onItemSettled: (score, row) => {
              patchKey(getPageRowEnrichmentKey(row), {
                productivityScore: score,
                productivityLoading: false,
              });
            },
          }
        );
      } else {
        for (const row of rows) {
          patchKey(getPageRowEnrichmentKey(row), {
            productivityScore: null,
            productivityLoading: false,
          });
        }
      }

      if (generation === generationRef.current) {
        setIsEnriching(false);
      }
    }

    void run().catch(() => {
      if (generation === generationRef.current) setIsEnriching(false);
    });

    return () => {
      abort.abort();
      if (generation === generationRef.current) {
        setIsEnriching(false);
      }
    };
    // pageSignature captures page row identity; ranges drive productivity phase
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional signature deps
  }, [enabled, pageSignature, rangeFrom, rangeTo, client, queryClient]);

  const enrichRow = useMemo(() => {
    return (row: ReportsTargetRow) =>
      mergeEnrichment(row, enrichmentByKey.get(getPageRowEnrichmentKey(row)));
  }, [enrichmentByKey]);

  return { enrichmentByKey, isEnriching, enrichRow };
}
