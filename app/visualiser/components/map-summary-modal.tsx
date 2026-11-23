'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useCompetitorsMapData,
  useCompetitorsMissingGeocode,
} from '@/api/hooks/use-competitors-map-data';
import { MissingCompetitorsList } from '@/app/visualiser/components/missing-competitors-list';
import { formatZarShort } from '@/lib/site-opportunity/format-potential';
import {
  buildMarketAnalysisSummary,
  formatMarketAnalysisNumber,
  formatMarketAnalysisPercent,
  type MarketAnalysisBrandRow,
  type MarketAnalysisSection,
} from '@/lib/site-opportunity/market-analysis-summary';
import type {
  VisualiserLayerId,
  VisualiserMapPoint,
} from '@/lib/utils/visualiser-map-points';

interface MapSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: VisualiserMapPoint[];
  counts: Record<VisualiserLayerId, number>;
}

function MarketAnalysisTable({
  title,
  section,
  groupLabel,
}: {
  title: string;
  section: MarketAnalysisSection;
  groupLabel: string;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold tracking-wide uppercase">{title}</h3>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead colSpan={4} className="bg-muted/40" />
              <TableHead className="bg-muted/40 text-center text-[10px] font-semibold tracking-wide uppercase">
                Monthly average
              </TableHead>
              <TableHead
                colSpan={2}
                className="bg-muted/40 text-center text-[10px] font-semibold tracking-wide uppercase"
              >
                Monthly
              </TableHead>
              <TableHead
                colSpan={2}
                className="bg-muted/40 text-center text-[10px] font-semibold tracking-wide uppercase"
              >
                {groupLabel}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="text-[10px] font-semibold tracking-wide uppercase">
                Competition
              </TableHead>
              <TableHead className="text-[10px] font-semibold tracking-wide uppercase">
                Description
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                Qty
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                Turnover all
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                Average
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                5%
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                20%
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                5%
              </TableHead>
              <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                20%
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.rows.map((row) => (
              <BrandRow key={`${row.competition}-${row.brand}`} row={row} />
            ))}
          </TableBody>
          <TableFooter>
            <BrandRow row={section.totals} bold />
          </TableFooter>
        </Table>
      </div>
    </section>
  );
}

function BrandRow({
  row,
  bold = false,
}: {
  row: MarketAnalysisBrandRow;
  bold?: boolean;
}) {
  const weight = bold ? 'font-semibold' : '';
  return (
    <TableRow>
      <TableCell className={`text-xs ${weight}`}>{row.competition}</TableCell>
      <TableCell className={`text-xs ${weight}`}>{row.description}</TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.qty)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.turnoverAll)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.monthlyAverage)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.monthly5)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.monthly20)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.fullYear5)}
      </TableCell>
      <TableCell className={`text-right text-xs tabular-nums ${weight}`}>
        {formatMarketAnalysisNumber(row.fullYear20)}
      </TableCell>
    </TableRow>
  );
}

export function MapSummaryModal({
  open,
  onOpenChange,
  points,
  counts,
}: MapSummaryModalProps) {
  const mapQuery = useCompetitorsMapData({ enabled: open });
  const missingQuery = useCompetitorsMissingGeocode({ enabled: open });

  const catalog = useMemo(() => {
    const mapped = (mapQuery.data ?? []).map((marker) => ({
      name: marker.name,
      accountName: marker.accountName,
      LegalEntity: marker.LegalEntity,
      TradingName: marker.TradingName,
      isDirect: marker.isDirect,
    }));
    const missingCoords = (missingQuery.data ?? [])
      .filter((item) => item.missingCoords)
      .map((item) => ({
        name: item.name,
        accountName: item.accountName,
        LegalEntity: item.LegalEntity,
        TradingName: item.TradingName,
        isDirect: item.isDirect,
      }));
    return [...mapped, ...missingCoords];
  }, [mapQuery.data, missingQuery.data]);

  const analysis = useMemo(
    () => buildMarketAnalysisSummary(catalog),
    [catalog],
  );

  const missingItems = missingQuery.data ?? [];
  const missingCoordsCount = missingItems.filter((item) => item.missingCoords)
    .length;
  const isLoading = open && (mapQuery.isLoading || missingQuery.isLoading);
  const mappedTotal = points.length;
  const competitorMapped = counts.competitors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[min(96vw,1100px)] max-w-[1100px] flex-col overflow-hidden sm:max-w-[1100px]">
        <DialogHeader>
          <DialogTitle>Summary</DialogTitle>
          <DialogDescription>
            Market analysis for {analysis.competitorCount.toLocaleString()}{' '}
            competitor stores
            {analysis.monthlyPool > 0
              ? ` · modelled monthly pool ${formatZarShort(analysis.monthlyPool)}`
              : ''}
            .{' '}
            {competitorMapped.toLocaleString()} mapped
            {missingCoordsCount > 0
              ? ` · ${missingCoordsCount.toLocaleString()} missing coordinates`
              : ''}
            . Snapshot of {mappedTotal.toLocaleString()} mapped locations across
            all layers.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <>
              <MarketAnalysisTable
                title="Direct competition"
                section={analysis.direct}
                groupLabel="Full year"
              />

              <MarketAnalysisTable
                title="Indirect competition — hardwares"
                section={analysis.indirect}
                groupLabel="Hardwares"
              />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase">
                  Market pool summary
                </h3>
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-semibold tracking-wide uppercase">
                          Segment
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Qty
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Annual amount
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Share
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Months
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Hardwares 5% × 12
                        </TableHead>
                        <TableHead className="text-right text-[10px] font-semibold tracking-wide uppercase">
                          Hardwares 20% × 12
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-xs font-medium">
                          {analysis.rollup.scd.label}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(analysis.rollup.scd.qty)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.scd.amount,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisPercent(
                            analysis.rollup.scd.share,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {analysis.rollup.months}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.hardwaresFullYear5,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.hardwaresFullYear20,
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-xs font-medium">
                          {analysis.rollup.hardwares.label}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.hardwares.qty,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.hardwares.amount,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {formatMarketAnalysisPercent(
                            analysis.rollup.hardwares.share,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          —
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                          —
                        </TableCell>
                      </TableRow>
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell className="text-xs font-semibold">
                          {analysis.rollup.totals.label}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.totals.qty,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">
                          {formatMarketAnalysisNumber(
                            analysis.rollup.totals.amount,
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-semibold tabular-nums">
                          {formatMarketAnalysisPercent(
                            analysis.rollup.totals.share,
                          )}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
                <p className="text-muted-foreground text-xs">
                  Figures follow MARKET ANALYSIS SUMMARY.xlsx (monthly average ×
                  qty, 5% / 20% capture, full-year columns). SCD / HARDWARES
                  annual amounts use the sheet&apos;s rollup formulas.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">
                  Missing address / coordinates
                  {missingCoordsCount > 0
                    ? ` (${missingCoordsCount.toLocaleString()})`
                    : ''}
                </h3>
                {missingQuery.isLoading ? (
                  <Skeleton className="h-32 w-full" />
                ) : missingItems.length > 0 ? (
                  <div className="rounded-lg border p-3">
                    <MissingCompetitorsList
                      items={missingItems}
                      maxVisible={10}
                    />
                    <p className="text-muted-foreground mt-2 text-[11px]">
                      Open the list for full detail, or click a row to edit on
                      the Competitors page.{' '}
                      <Link
                        href="/competitors"
                        className="underline-offset-2 hover:underline"
                      >
                        Fix missing
                      </Link>
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    All competitors have an address and map coordinates.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
