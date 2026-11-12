'use client';

import { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks';
import { fetchTravelAnalysis } from '@/api/endpoints/reports-travel-analysis';
import { downloadTravelExport } from '@/api/endpoints/reports-travel-export';
import {
  fetchTravelFuelQuote,
  type TravelFuelQuote,
  type TravelFuelQuoteSource,
} from '@/api/endpoints/reports-travel-fuel-quote';
import { UtcDateRangePicker } from '@/components/filters/utc-date-range-picker';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DialogCloseButton } from '@/components/dialog-close-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';
import { buildTravelAnalysisDocument } from '@/lib/travel-analysis/build-travel-analysis-document';
import { downloadTravelAnalysisPdf } from '@/lib/travel-analysis/travel-analysis-pdf';

function typedFuelPrice(raw: string): { price?: number; invalid: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) return { invalid: false };
  const price = Number(trimmed);
  if (!Number.isFinite(price) || price <= 0) return { invalid: true };
  return { price, invalid: false };
}

function formatRand(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function priceSourceLabel(source: TravelFuelQuoteSource, price: number | null): string {
  switch (source) {
    case 'custom':
      return `Using ${formatRand(price)}/L (custom)`;
    case 'saved':
      return `Using ${formatRand(price)}/L (saved override)`;
    case 'country':
      return price != null ? `Using ${formatRand(price)}/L (country price)` : 'Using the country price';
    case 'mixedCountry':
      return 'Country prices differ by day';
    default: {
      const unhandled: never = source;
      return unhandled;
    }
  }
}

/**
 * Date-range dialog that downloads the reports travel Excel workbook or Analysis PDF for one staff member.
 */
export function StaffTravelExportDialog({
  open,
  onOpenChange,
  userUid,
  userName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userUid: number;
  userName: string;
}) {
  const client = useApiClient();
  const [startDate, setStartDate] = useState(utcToday);
  const [endDate, setEndDate] = useState(utcToday);
  const [fuelPriceInput, setFuelPriceInput] = useState('');
  const [quote, setQuote] = useState<TravelFuelQuote | null>(null);
  const [quoteStale, setQuoteStale] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const isBusy = isExporting || isAnalysing;
  const typedPrice = typedFuelPrice(fuelPriceInput);

  useEffect(() => {
    if (!open) return;
    const today = utcToday();
    setStartDate(today);
    setEndDate(today);
    setFuelPriceInput('');
    setQuote(null);
    setQuoteStale(false);
    setIsExporting(false);
    setIsAnalysing(false);
  }, [open]);

  useEffect(() => {
    if (!open || typedPrice.invalid) return;
    let cancelled = false;
    setQuoteStale(true);
    const handle = setTimeout(() => {
      void fetchTravelFuelQuote(client, {
        from: formatUtcYmd(startDate),
        to: formatUtcYmd(endDate),
        userUid,
        ...(typedPrice.price != null ? { fuelPricePerLitreZar: typedPrice.price } : {}),
        skipErrorToast: true,
      })
        .then((next) => {
          if (cancelled) return;
          setQuote(next);
          setQuoteStale(false);
        })
        .catch(() => {
          if (!cancelled) setQuoteStale(true);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [open, client, startDate, endDate, userUid, typedPrice.invalid, typedPrice.price]);

  /**
   * Downloads the travel workbook (including the Claims sheet) scoped to this user and the selected UTC range.
   */
  async function handleExport() {
    if (isBusy || typedPrice.invalid) return;
    setIsExporting(true);
    try {
      await downloadTravelExport(client, {
        from: formatUtcYmd(startDate),
        to: formatUtcYmd(endDate),
        userUid,
        ...(typedPrice.price != null ? { fuelPricePerLitreZar: typedPrice.price } : {}),
        skipErrorToast: true,
      });
      toast.success('Travel report downloaded');
      onOpenChange(false);
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not download the travel report'));
    } finally {
      setIsExporting(false);
    }
  }

  /**
   * Downloads a visualiser-style A4 PDF briefing of day-by-day trips, areas, patterns, and fuel.
   */
  async function handleAnalysis() {
    if (isBusy || typedPrice.invalid) return;
    setIsAnalysing(true);
    try {
      const payload = await fetchTravelAnalysis(client, {
        from: formatUtcYmd(startDate),
        to: formatUtcYmd(endDate),
        userUid,
        ...(typedPrice.price != null ? { fuelPricePerLitreZar: typedPrice.price } : {}),
        skipErrorToast: true,
      });
      const document = buildTravelAnalysisDocument(payload, userName);
      downloadTravelAnalysisPdf(document);
      toast.success('Travel analysis downloaded');
      onOpenChange(false);
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not export travel analysis'));
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex flex-col w-full max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[85vh] p-4 sm:p-6 pt-12 pr-14"
      >
        <div className="absolute top-4 right-4 z-10">
          <DialogCloseButton />
        </div>
        <DialogHeader>
          <DialogTitle>Travel report — {userName}</DialogTitle>
          <DialogDescription>
            Choose a date range. Excel is the travel report workbook. Analysis is a day-by-day PDF briefing.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto min-h-0 flex-1 pt-2">
          <UtcDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={({ start, end }) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onReset={() => {
              const today = utcToday();
              setStartDate(today);
              setEndDate(today);
            }}
            showAllTime={false}
            defaultPreset="today"
            stackLayout
            commitOnSelect
            disabled={isBusy}
          />
          <div className="mt-4 space-y-2">
            <Label htmlFor="travel-fuel-price">Fuel price (R/L)</Label>
            <Input
              id="travel-fuel-price"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={fuelPriceInput}
              disabled={isBusy}
              placeholder={
                quote?.savedPricePerLitreZar != null
                  ? String(quote.savedPricePerLitreZar)
                  : 'Country price'
              }
              onChange={(event) => setFuelPriceInput(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to use the saved override, or the country price when none is saved.
            </p>
            {typedPrice.invalid ? (
              <p className="text-xs text-destructive">Enter a price greater than 0, or leave the field blank.</p>
            ) : null}
            {quote ? (
              <div className={quoteStale ? 'space-y-1 opacity-60' : 'space-y-1'} aria-live="polite">
                <p className="text-sm font-medium tabular-nums">{formatRand(quote.costZar)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {quote.billableKm.toLocaleString('en-ZA', { maximumFractionDigits: 1 })} km ·{' '}
                  {quote.litres.toLocaleString('en-ZA', { maximumFractionDigits: 2 })} L ·{' '}
                  {priceSourceLabel(quote.priceSource, quote.pricePerLitreZar)}
                </p>
                {quote.savedPricePerLitreZar != null && quote.priceSource !== 'saved' ? (
                  <p className="text-xs text-muted-foreground tabular-nums">
                    Saved override {formatRand(quote.savedPricePerLitreZar)}/L
                  </p>
                ) : null}
                {quoteStale ? <p className="text-xs text-muted-foreground">Updating…</p> : null}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Calculating fuel…</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:justify-stretch">
          <Button
            type="button"
            className="w-full"
            disabled={isBusy || typedPrice.invalid}
            onClick={() => void handleExport()}
            aria-label={isExporting ? 'Exporting…' : 'Travel report'}
          >
            {isExporting ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            Travel report
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isBusy || typedPrice.invalid}
            onClick={() => void handleAnalysis()}
            aria-label={isAnalysing ? 'Building analysis…' : 'Analysis'}
          >
            {isAnalysing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="size-4" aria-hidden />
            )}
            Analysis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
