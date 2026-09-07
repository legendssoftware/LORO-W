'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Building2, Check, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { useConsolidatedIncomeStatement } from '@/api/hooks/use-consolidated-income-statement';
import type {
  ConsolidatedBranchData,
  ConsolidatedIncomeStatementCountry,
  PerformanceExchangeRate,
  PerformanceFilters,
} from '@/api/types/reports-performance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { cn } from '@/lib/utils';
import { formatDateRangeLabel } from '../lib/dates';
import {
  formatPerformanceMoney,
  formatPerformancePercent,
  performanceAmountClassName,
  performanceGpPercentClassName,
} from '../lib/format';

function forexCodeForZarConversion(countryCode: string, currencyCode: string): string {
  if (currencyCode === 'ZAR') return 'ZAR';
  if (countryCode === 'ZW' || countryCode === 'ZWI') return 'USD';
  return currencyCode;
}

type ConvertToZARFn = (amount: number, countryCode: string, currencyCode: string) => number;

function getBranchTotals(
  branch: ConsolidatedBranchData,
  country: ConsolidatedIncomeStatementCountry,
  showInZAR: boolean,
  convertToZAR: ConvertToZARFn
) {
  const revenue = showInZAR
    ? convertToZAR(branch.totalRevenue, country.countryCode, country.currency.code)
    : branch.totalRevenue;
  const gpRaw = branch.grossProfit ?? 0;
  const gp = showInZAR ? convertToZAR(gpRaw, country.countryCode, country.currency.code) : gpRaw;
  const gpPercentage =
    branch.grossProfitPercentage ??
    (branch.totalRevenue > 0 ? (gpRaw / branch.totalRevenue) * 100 : 0);
  return { revenue, gp, gpPercentage };
}

function getCountryTotals(
  country: ConsolidatedIncomeStatementCountry,
  showInZAR: boolean,
  convertToZAR: ConvertToZARFn
) {
  const revenue = showInZAR
    ? convertToZAR(country.totalRevenue, country.countryCode, country.currency.code)
    : country.totalRevenue;
  const gpRaw = country.branches.reduce((sum, branch) => sum + (branch.grossProfit ?? 0), 0);
  const gp = country.branches.reduce((sum, branch) => {
    const branchGP = branch.grossProfit ?? 0;
    return sum + (showInZAR ? convertToZAR(branchGP, country.countryCode, country.currency.code) : branchGP);
  }, 0);
  const gpPercentage = country.totalRevenue > 0 ? (gpRaw / country.totalRevenue) * 100 : 0;
  return { revenue, gp, gpPercentage };
}

function computeZarForexIssues(
  countries: ConsolidatedIncomeStatementCountry[],
  exchangeRates: PerformanceExchangeRate[] | undefined
) {
  const rateMap = new Map((exchangeRates ?? []).map((r) => [r.code, r.rate]));
  const requiredCodes = new Set<string>();
  for (const country of countries) {
    const rateCode = forexCodeForZarConversion(country.countryCode, country.currency.code);
    if (rateCode === 'ZAR') continue;
    requiredCodes.add(rateCode);
  }
  const details: Array<{ code: string; reason: 'missing' | 'invalid' }> = [];
  for (const code of Array.from(requiredCodes).sort()) {
    const rate = rateMap.get(code);
    if (rate === undefined) {
      details.push({ code, reason: 'missing' });
      continue;
    }
    if (!Number.isFinite(rate) || rate <= 0) details.push({ code, reason: 'invalid' });
  }
  return { hasIssues: details.length > 0, details };
}

function formatZarPerForeignUnitLabel(forexCode: string, rate: number | undefined): string | null {
  if (forexCode === 'ZAR') return null;
  if (rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  const zarStr = (1 / rate).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `1 ${forexCode} = ${zarStr} ZAR`;
}

interface PerformanceConsolidatedStatementProps {
  filters: PerformanceFilters;
  enabled: boolean;
}

export function PerformanceConsolidatedStatement({
  filters,
  enabled,
}: PerformanceConsolidatedStatementProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showInZAR, setShowInZAR] = useState(true);
  const { data, isLoading, isError, error } = useConsolidatedIncomeStatement({
    filters,
    enabled,
  });

  const convertToZAR = useMemo<ConvertToZARFn>(() => {
    if (!showInZAR || !data?.exchangeRates) {
      return (amount) => amount;
    }
    const rateMap = new Map(data.exchangeRates.map((rate) => [rate.code, rate.rate]));
    return (amount, countryCode, currencyCode) => {
      const rateCode = forexCodeForZarConversion(countryCode, currencyCode);
      if (rateCode === 'ZAR') return amount;
      const rate = rateMap.get(rateCode);
      if (!rate) return amount;
      return amount / rate;
    };
  }, [showInZAR, data?.exchangeRates]);

  const zarForexIssues = useMemo(() => {
    if (!data?.data?.length) return { hasIssues: false, details: [] as Array<{ code: string; reason: 'missing' | 'invalid' }> };
    return computeZarForexIssues(data.data, data.exchangeRates);
  }, [data]);

  const exchangeRateMap = useMemo(() => {
    if (!data?.exchangeRates?.length) return new Map<string, number>();
    return new Map(data.exchangeRates.map((r) => [r.code, r.rate]));
  }, [data?.exchangeRates]);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12">
          <LoadingSpinner wrapperClassName="py-4" />
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Loading consolidated income statement…
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Error loading data</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : 'Failed to fetch consolidated income statement'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-10 text-center">
          <p className="font-medium">No data available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            No sales data found for the selected date range
          </p>
        </CardContent>
      </Card>
    );
  }

  const countries = data.data;
  const grandTotalZAR = data.grandTotalZAR || 0;
  const totalGPZAR = countries.reduce(
    (sum, country) =>
      sum +
      country.branches.reduce((branchSum, branch) => {
        const branchGP = branch.grossProfit || 0;
        return branchSum + convertToZAR(branchGP, country.countryCode, country.currency.code);
      }, 0),
    0
  );
  const consolidatedGPZAR = data.consolidatedGrossProfitZAR ?? totalGPZAR;
  const totalGPPercentage = grandTotalZAR > 0 ? (consolidatedGPZAR / grandTotalZAR) * 100 : 0;
  const showForexWarning = showInZAR && zarForexIssues.hasIssues;
  const startDate = filters.dateRange?.startDate ?? data.startDate;
  const endDate = filters.dateRange?.endDate ?? data.endDate;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-muted p-2 text-foreground">
            <Globe className="size-5" />
          </div>
          <div>
            <CardTitle className="text-base">Consolidated Statement</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.totalCountries} {data.totalCountries === 1 ? 'country' : 'countries'} · {data.totalBranches}{' '}
              {data.totalBranches === 1 ? 'branch' : 'branches'}
              {` · ${formatDateRangeLabel(startDate, endDate)}`}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          variant={showInZAR ? 'default' : 'outline'}
          className={cn(
            showForexWarning &&
              'border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20'
          )}
          onClick={() => setShowInZAR((v) => !v)}
        >
          {showInZAR ? <Check className="mr-1 size-4" /> : null}
          R
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 p-0">
        {showForexWarning ? (
          <Alert variant="destructive" className="mx-4">
            <AlertTriangle />
            <AlertTitle>Exchange rates missing or invalid</AlertTitle>
            <AlertDescription>
              ZAR amounts need valid forex rates from ERP. Figures shown as ZAR may not reflect true conversion.
              {zarForexIssues.details.length > 0
                ? ` ${zarForexIssues.details
                    .map((d) => (d.reason === 'missing' ? `${d.code}: missing` : `${d.code}: invalid rate`))
                    .join(' · ')}`
                : ''}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="divide-y">
          {countries.map((country, index) => {
            const isOpen = expanded.has(country.countryCode);
            const flag = getCountryFlag(country.countryCode);
            const forexCode = forexCodeForZarConversion(country.countryCode, country.currency.code);
            const rawRate = forexCode === 'ZAR' ? undefined : exchangeRateMap.get(forexCode);
            const fxLine = formatZarPerForeignUnitLabel(forexCode, rawRate);
            const totals = getCountryTotals(country, showInZAR, convertToZAR);
            const symbol = showInZAR ? 'R' : country.currency.symbol;

            return (
              <div key={country.countryCode || `country-${index}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-3 bg-muted/50 px-4 py-3 text-left hover:bg-muted"
                  onClick={() =>
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(country.countryCode)) next.delete(country.countryCode);
                      else next.add(country.countryCode);
                      return next;
                    })
                  }
                >
                  <span className="text-2xl leading-none">{flag.flag}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{country.countryName}</p>
                    <p className="text-xs text-muted-foreground">
                      {country.branchCount || country.branches.length}{' '}
                      {(country.branchCount || country.branches.length) === 1 ? 'branch' : 'branches'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('font-semibold', performanceAmountClassName(totals.revenue))}>
                      {formatPerformanceMoney(totals.revenue, symbol)}
                    </p>
                    <p className="text-xs">
                      <span className={performanceGpPercentClassName(totals.gpPercentage)}>
                        Avg GP {formatPerformancePercent(totals.gpPercentage)}
                      </span>
                      {' — '}
                      <span className={performanceAmountClassName(totals.gp)}>
                        {formatPerformanceMoney(totals.gp, symbol)}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {showInZAR ? fxLine || (forexCode === 'ZAR' ? 'ZAR' : 'Rate unavailable') : country.currency.code}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
                </button>
                {isOpen ? (
                  <div>
                    {country.branches.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">No branch data available</p>
                    ) : (
                      country.branches.map((branch, index) => {
                        const branchTotals = getBranchTotals(branch, country, showInZAR, convertToZAR);
                        return (
                          <div
                            key={`${country.countryCode}-${branch.branchId || branch.branchName}-${index}`}
                            className={cn(
                              'flex items-center justify-between gap-3 px-4 py-3',
                              index % 2 === 0 ? 'bg-background' : 'bg-muted/30'
                            )}
                          >
                            <div className="flex min-w-0 items-center gap-2">
                              <Building2 className="size-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{branch.branchName}</p>
                                {branch.transactionCount != null ? (
                                  <p className="text-xs text-muted-foreground">
                                    {branch.transactionCount}{' '}
                                    {branch.transactionCount === 1 ? 'invoice' : 'invoices'}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn('font-semibold', performanceAmountClassName(branchTotals.revenue))}>
                                {formatPerformanceMoney(branchTotals.revenue, symbol)}
                              </p>
                              <p className="text-xs">
                                <span className={performanceGpPercentClassName(branchTotals.gpPercentage)}>
                                  GP {formatPerformancePercent(branchTotals.gpPercentage)}
                                </span>
                                {' — '}
                                <span className={performanceAmountClassName(branchTotals.gp)}>
                                  {formatPerformanceMoney(branchTotals.gp, symbol)}
                                </span>
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="space-y-3 border-t bg-muted/50 p-4">
          <p className="font-semibold text-foreground">
            Grand Total ({data.totalCountries} {data.totalCountries === 1 ? 'country' : 'countries'})
          </p>
          {data.totalCountries > 1 ? (
            <p className={cn('text-sm font-medium', performanceAmountClassName(grandTotalZAR))}>
              Total Revenue (ZAR): {formatPerformanceMoney(grandTotalZAR, 'R')}
            </p>
          ) : null}
          <div
            className={cn(
              'rounded-lg border p-3',
              consolidatedGPZAR < 0 || totalGPPercentage < 30
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-green-500/30 bg-green-500/10'
            )}
          >
            <p
              className={cn(
                'mb-1 text-xs font-semibold uppercase',
                performanceAmountClassName(consolidatedGPZAR)
              )}
            >
              Consolidated Gross Profit
            </p>
            <p className={cn('text-lg font-bold', performanceAmountClassName(consolidatedGPZAR))}>
              {formatPerformanceMoney(consolidatedGPZAR, 'R')}
            </p>
            <p className={cn('text-xs', performanceGpPercentClassName(totalGPPercentage))}>
              {formatPerformancePercent(totalGPPercentage)} GP Margin
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Consolidated totals are in ZAR (or ZAR equivalent when multiple countries). Use the currency
            toggle to switch the country breakdown between ZAR and local currency.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
