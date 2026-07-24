'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImportCompetitorsMutation } from '@/api/hooks';
import type { CompetitorImportResponse } from '@/api/types/competitors';
import {
  COMPETITOR_IMPORT_SAMPLE_CSV,
  COMPETITOR_IMPORT_SAMPLE_FILENAME,
} from '@/api/types/competitors';
import { triggerDownloadCompetitorImportSampleXlsx } from '@/lib/competitors-import-sample-xlsx';
import {
  countLeadImportDataRows,
  LARGE_IMPORT_ROW_THRESHOLD,
} from '@/lib/count-lead-import-data-rows';
import { Loader2Icon } from '@/lib/icons';
import { CircleHelp, Download, FileSpreadsheet, Upload, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ImportCompetitorsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'form' | 'receipt';
type RowCountStatus = 'idle' | 'loading' | 'ready' | 'error';

function fileRowCountKey(f: File) {
  return `${f.name}:${f.size}:${f.lastModified}`;
}

export function ImportCompetitorsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportCompetitorsModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [lastResult, setLastResult] = useState<CompetitorImportResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const [rowCountStatus, setRowCountStatus] = useState<RowCountStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rowCountJobRef = useRef(0);
  const rowCountCacheRef = useRef<{ key: string; n: number } | null>(null);

  const importMutation = useImportCompetitorsMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null;
    if (next) {
      const lower = next.name.toLowerCase();
      if (!lower.endsWith('.csv') && !lower.endsWith('.xlsx')) {
        toast.error('Please choose a CSV or Excel (.xlsx) file.');
        e.target.value = '';
        return;
      }
      if (next.size > 2 * 1024 * 1024) {
        toast.error('File size exceeds 2MB. Please upload a smaller file.');
        e.target.value = '';
        return;
      }
      setFile(next);
      const key = fileRowCountKey(next);
      const cached = rowCountCacheRef.current;
      if (cached?.key === key) {
        setRowCount(cached.n);
        setRowCountStatus('ready');
        return;
      }
      setRowCount(null);
      setRowCountStatus('loading');
      const seq = ++rowCountJobRef.current;
      countLeadImportDataRows(next)
        .then((n) => {
          if (seq !== rowCountJobRef.current) return;
          rowCountCacheRef.current = { key, n };
          setRowCount(n);
          setRowCountStatus('ready');
        })
        .catch(() => {
          if (seq !== rowCountJobRef.current) return;
          setRowCountStatus('error');
          toast.error('Could not read row count from file.');
        });
    } else {
      rowCountJobRef.current += 1;
      setFile(null);
      setRowCount(null);
      setRowCountStatus('idle');
      rowCountCacheRef.current = null;
    }
  };

  function resetFormForNewUpload() {
    rowCountJobRef.current += 1;
    setStep('form');
    setLastResult(null);
    setFile(null);
    setRowCount(null);
    setRowCountStatus('idle');
    rowCountCacheRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetFormForNewUpload();
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a CSV or Excel file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const key = fileRowCountKey(file);
    let dataRows: number;
    const cached = rowCountCacheRef.current;
    if (cached?.key === key) {
      dataRows = cached.n;
    } else {
      try {
        dataRows = await countLeadImportDataRows(file);
        rowCountCacheRef.current = { key, n: dataRows };
        setRowCount(dataRows);
        setRowCountStatus('ready');
      } catch {
        toast.error('Could not read rows from file. Try again or re-upload.');
        return;
      }
    }

    if (dataRows > LARGE_IMPORT_ROW_THRESHOLD) {
      toast(
        'Competitors are importing in the background. You can keep working—check back shortly.',
        { duration: 6000 }
      );
      importMutation.mutate(
        { formData, longRunning: true },
        {
          onSuccess: (result) => {
            if (result.success) {
              toast.success(
                result.message ||
                  `Imported ${result.imported}, updated ${result.updated}.`
              );
              onSuccess?.();
            } else {
              const errMsg =
                result.errors?.[0]?.error || result.message || 'Import failed.';
              toast.error(errMsg);
            }
          },
          onError: (err: unknown) => {
            const message =
              err && typeof err === 'object' && 'message' in err
                ? String((err as { message: string }).message)
                : 'Import failed.';
            toast.error(message);
          },
        }
      );
      handleOpenChange(false);
      return;
    }

    try {
      const result = await importMutation.mutateAsync({ formData });
      if (result.success) {
        toast.success(
          result.message ||
            `Imported ${result.imported}, updated ${result.updated}.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`
        );
        onSuccess?.();
        setLastResult(result);
        setStep('receipt');
      } else {
        const errMsg =
          result.errors?.[0]?.error || result.message || 'Import failed.';
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Import failed.';
      toast.error(message);
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([COMPETITOR_IMPORT_SAMPLE_CSV], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = COMPETITOR_IMPORT_SAMPLE_FILENAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-3rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Upload className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            Import competitors from CSV or Excel
          </DialogTitle>
          <div className="space-y-2 text-left">
            <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
              <CircleHelp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              How this works
            </h3>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
              <li>
                Use a <strong>CSV</strong> or <strong>Excel .xlsx</strong> file (max 2MB). Excel uses the first
                worksheet only. Download <strong>both</strong> sample files below to see supported columns.
                Only populated columns are applied—empty cells do not overwrite existing data on re-import.
              </li>
              <li>
                Each row needs a <strong>name</strong>. Include <strong>competitorRef</strong> to upsert
                existing competitors (safe to re-run, matching the SQL import script).
              </li>
              <li>
                Address can be flat columns (<code>street</code>, <code>city</code>, etc.) or a JSON{' '}
                <code>address</code> column. Missing address parts use sensible defaults.
              </li>
            </ul>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
              <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                Sample files
              </span>
              <button
                type="button"
                onClick={handleDownloadSample}
                className="inline-flex items-center gap-1.5 text-left text-sm font-normal text-purple-600 underline underline-offset-2 hover:text-purple-700"
              >
                <Download className="size-4 shrink-0" aria-hidden />
                Download sample CSV
              </button>
              <button
                type="button"
                onClick={() => triggerDownloadCompetitorImportSampleXlsx()}
                className="inline-flex items-center gap-1.5 text-left text-sm font-normal text-purple-600 underline underline-offset-2 hover:text-purple-700"
              >
                <FileSpreadsheet className="size-4 shrink-0" aria-hidden />
                Download sample Excel (.xlsx)
              </button>
            </div>
          </div>
        </DialogHeader>

        {step === 'receipt' && lastResult ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/80 p-4 dark:border-green-900 dark:bg-green-950/40">
              <CheckCircle2 className="size-6 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">Import complete</p>
                <p className="text-muted-foreground text-sm">
                  {lastResult.message ||
                    `Imported ${lastResult.imported}, updated ${lastResult.updated}${lastResult.failed > 0 ? `, ${lastResult.failed} failed` : ''}.`}
                </p>
                <p className="text-muted-foreground text-xs">
                  Addresses are geocoded after import. Open the Visualiser and use Re-geocode map
                  if any competitors still show as not mapped.
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Imported</p>
                <p className="text-2xl font-semibold tabular-nums">{lastResult.imported}</p>
              </div>
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Updated</p>
                <p className="text-2xl font-semibold tabular-nums">{lastResult.updated}</p>
              </div>
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Failed rows</p>
                <p className="text-2xl font-semibold tabular-nums">{lastResult.failed}</p>
              </div>
            </div>
            {(lastResult.errors?.length ?? 0) > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-destructive">Row errors</p>
                <ScrollArea className="h-[min(120px,24vh)] rounded-md border border-destructive/30 bg-destructive/5 p-2">
                  <ul className="space-y-1 text-xs text-destructive">
                    {lastResult.errors.slice(0, 20).map((e, i) => (
                      <li key={`${e.row}-${i}`}>
                        Row {e.row}: {e.error}
                      </li>
                    ))}
                    {lastResult.errors.length > 20 ? (
                      <li>…and {lastResult.errors.length - 20} more</li>
                    ) : null}
                  </ul>
                </ScrollArea>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Label htmlFor="import-competitors-file">Spreadsheet file</Label>
              </div>
              <input
                id="import-competitors-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="space-y-1">
                  <p className="text-foreground text-sm">Uploaded file</p>
                  <p className="text-sm">
                    <span className="font-bold text-purple-600">{file.name}</span>{' '}
                    <span className="text-muted-foreground">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </p>
                  {rowCountStatus === 'loading' ? (
                    <p className="text-muted-foreground flex items-center gap-2 text-xs">
                      <Loader2Icon className="size-3.5 shrink-0 animate-spin" aria-hidden />
                      Counting data rows…
                    </p>
                  ) : rowCountStatus === 'error' ? (
                    <p className="text-destructive text-xs">
                      Could not read this file—choose another or try again.
                    </p>
                  ) : rowCountStatus === 'ready' && rowCount != null ? (
                    <div className="space-y-1">
                      <p className="text-muted-foreground text-xs">
                        <span className="tabular-nums">{rowCount}</span> data row
                        {rowCount === 1 ? '' : 's'} detected (excluding header).
                      </p>
                      {rowCount > LARGE_IMPORT_ROW_THRESHOLD ? (
                        <p className="text-foreground text-xs font-medium">
                          Large import: the dialog will close while the file uploads and the server
                          processes rows—this can take several minutes.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'receipt' ? (
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                disabled={!file || importMutation.isPending}
                onClick={() => void handleSubmit()}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2Icon className="mr-2 size-4 animate-spin" aria-hidden />
                    Importing…
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
