'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useImportLeadsMutation } from '@/api/hooks';
import type { ImportLeadsFromCSVParams } from '@/api/endpoints/leads';
import {
  LEAD_IMPORT_SAMPLE_CSV,
  LEAD_IMPORT_SAMPLE_FILENAME,
} from '@/api/types/leads';
import { Loader2Icon } from '@/lib/icons';
import toast from 'react-hot-toast';

/** LeadSource values accepted by POST /leads/import-csv (source query param). */
const LEAD_SOURCE_OPTIONS = [
  { value: 'WEBSITE', label: 'Website' },
  { value: 'SOCIAL_MEDIA', label: 'Social Media' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'COLD_CALL', label: 'Cold Call' },
  { value: 'EMAIL_CAMPAIGN', label: 'Email Campaign' },
  { value: 'TRADE_SHOW', label: 'Trade Show' },
  { value: 'ADVERTISING', label: 'Advertising' },
  { value: 'DIRECT_MAIL', label: 'Direct Mail' },
  { value: 'PARTNER', label: 'Partner' },
  { value: 'ORGANIC_SEARCH', label: 'Organic Search' },
  { value: 'PAID_SEARCH', label: 'Paid Search' },
  { value: 'CONTENT_MARKETING', label: 'Content Marketing' },
  { value: 'WEBINAR', label: 'Webinar' },
  { value: 'OTHER', label: 'Other' },
] as const;

export interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: pre-selected user IDs to assign leads to (comma-separated or array). */
  assignedUserIds?: number[];
  /** Callback when import succeeds (e.g. refresh list). */
  onSuccess?: () => void;
}

export function ImportLeadsModal({
  open,
  onOpenChange,
  assignedUserIds,
  onSuccess,
}: ImportLeadsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportLeadsMutation();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please select a CSV file.');
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        toast.error('File size must be under 2MB.');
        return;
      }
      setFile(selected);
    } else {
      setFile(null);
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a CSV file to upload.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    const params: ImportLeadsFromCSVParams = {
      followUpInterval: 'WEEKLY',
      followUpDuration: 90,
    };
    if (assignedUserIds?.length) {
      params.assignedUserIds = assignedUserIds;
    }
    if (source?.trim()) {
      params.source = source.trim();
    }
    try {
      const result = await importMutation.mutateAsync({ formData, params });
      if (result.success) {
        toast.success(
          result.message ||
            `Imported ${result.imported} leads. ${result.failed > 0 ? `${result.failed} failed.` : ''}`
        );
        onSuccess?.();
        onOpenChange(false);
        setFile(null);
        setSource('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
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

  const handleOpenChange = (next: boolean) => {
    if (!next && !importMutation.isPending) {
      setFile(null);
      setSource('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    onOpenChange(next);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([LEAD_IMPORT_SAMPLE_CSV], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = LEAD_IMPORT_SAMPLE_FILENAME;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file (max 2MB). Optional columns: Created, Name, Email,
            Source, Form, Channel, Stage, Owner, Labels, Phone, Secondary phone
            number, WhatsApp number. Required: companyName and at least one of
            name, email, or phone.
          </DialogDescription>
          <Button
            type="button"
            variant="link"
            className="h-auto justify-start px-0 py-1 text-sm font-normal"
            onClick={handleDownloadSample}
          >
            Download sample CSV
          </Button>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="import-csv-file">CSV file</Label>
            <input
              id="import-csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              onChange={handleFileChange}
            />
            {file && (
              <span className="text-muted-foreground text-xs">
                {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="import-source">Default source (optional)</Label>
            <Select value={source || undefined} onValueChange={setSource}>
              <SelectTrigger id="import-source" className="w-full">
                <SelectValue placeholder="Use CSV Source or leave blank" />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">
              Applied to all imported leads when the CSV does not provide a
              Source.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={importMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!file || importMutation.isPending}
          >
            {importMutation.isPending ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Importing…
              </>
            ) : (
              'Import'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
