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
  const dashboard = enrich.dashboard as {
    personalTargets?: { sales?: { target?: unknown; current?: unknown }; hours?: { target?: unknown; current?: unknown } };
    sales?: { target?: unknown };
  } | null;
  const personal = dashboard?.personalTargets;
  // #region agent log
  if (row.userId > 0) {
    fetch('http://127.0.0.1:7852/ingest/c5d038c6-84ee-4625-93ea-42139de8e50d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06c950'},body:JSON.stringify({sessionId:'06c950',runId:'pre-fix',hypothesisId:'B',location:'use-phased-page-enrichment.ts:mergeEnrichment',message:'sales target before dashboard merge',data:{userId:row.userId,rowSalesTarget:row.sales.target,rowHoursTarget:row.hours.target,rowPeriodStart:row.periodStartDate??null,rowPeriodEnd:row.periodEndDate??null,expectedDays:row.policy?.expectedDays??null,hasDashboard:!!enrich.dashboard,personalSalesTarget:personal?.sales?.target??null,personalSalesCurrent:personal?.sales?.current??null,personalHoursTarget:personal?.hours?.target??null,topSalesTarget:dashboard?.sales?.target??null,erpRevenue:enrich.erpRevenue},timestamp:Date.now()})}).catch(()=>{});
  }
  // #endregion
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

    void client
      .post<EnrichmentApiBody>(
        '/reports/targets-page-enrichment',
        {
          userIds,
          from: rangeFrom ?? undefined,
          to: rangeTo ?? undefined,
          excludeCustomerCategories: excludeCustomerCategoriesBody,
          includeCustomerCategories: includeCustomerCategoriesBody,
        },
        { signal: abort.signal }
      )
      .then((response) => {
        if (generation !== generationRef.current) return;
        const categories = (response.data?.customerCategories ?? []).filter(
          (category) => category.id && category.name
        );
        setCustomerCategories(categories);
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
  }, [enabled, pageSignature, rangeFrom, rangeTo, excludedKey, includedKey, client]);

  const enrichRow = useMemo(() => {
    return (row: ReportsTargetRow) =>
      mergeEnrichment(row, enrichmentByKey.get(getPageRowEnrichmentKey(row)), {
        preserveRangeMetrics,
      });
  }, [enrichmentByKey, preserveRangeMetrics]);

  return { enrichmentByKey, customerCategories, isEnriching, enrichRow };
}
