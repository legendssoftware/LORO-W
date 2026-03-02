'use client';

import { useRef, useState } from 'react';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers } from '@/api/hooks';
import { useImportLeadsMutation } from '@/api/hooks';
import { Upload as UploadIcon, Download, ChevronDown } from 'lucide-react';
import { Loader2Icon, XIcon } from '@/lib/icons';
import type { UserListItem } from '@/api/endpoints/user';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

/** CSV column headers supported by the server parser (must match server ParsedLeadRow). */
const SAMPLE_CSV_HEADERS = [
  'name',
  'email',
  'phone',
  'companyName',
  'notes',
  'image',
  'attachments',
  'latitude',
  'longitude',
  'category',
  'status',
  'intent',
  'userQualityRating',
  'temperature',
  'source',
  'priority',
  'lifecycleStage',
  'jobTitle',
  'decisionMakerRole',
  'industry',
  'businessSize',
  'budgetRange',
  'purchaseTimeline',
  'preferredCommunication',
  'timezone',
  'bestContactTime',
  'painPoints',
  'estimatedValue',
  'competitorInfo',
  'referralSource',
  'campaignName',
  'landingPage',
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',
  'leadScore',
  'lastContactDate',
  'nextFollowUpDate',
  'totalInteractions',
  'averageResponseTime',
  'daysSinceLastResponse',
  'customFields',
];

/** Example row with valid enum values for sample CSV. */
const SAMPLE_CSV_EXAMPLE_ROW: Record<string, string> = {
  name: 'Jane Smith',
  email: 'jane.smith@example.com',
  phone: '+27123456789',
  companyName: 'Acme Corp',
  notes: 'Interested in enterprise plan',
  image: '',
  attachments: '',
  latitude: '',
  longitude: '',
  category: 'BUSINESS',
  status: 'PENDING',
  intent: 'PURCHASE',
  userQualityRating: '4',
  temperature: 'WARM',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  lifecycleStage: 'LEAD',
  jobTitle: 'Marketing Manager',
  decisionMakerRole: 'MANAGER',
  industry: 'TECHNOLOGY',
  businessSize: 'MEDIUM',
  budgetRange: 'R10K_25K',
  purchaseTimeline: 'SHORT_TERM',
  preferredCommunication: 'EMAIL',
  timezone: 'Africa/Johannesburg',
  bestContactTime: '9:00-17:00',
  painPoints: 'High costs, Manual processes',
  estimatedValue: '50000',
  competitorInfo: '',
  referralSource: '',
  campaignName: 'Summer 2024',
  landingPage: 'https://example.com/landing',
  utmSource: 'google',
  utmMedium: 'cpc',
  utmCampaign: 'summer-2024',
  utmTerm: '',
  utmContent: '',
  leadScore: '65',
  lastContactDate: '2024-01-15T10:00:00.000Z',
  nextFollowUpDate: '2024-02-01T09:00:00.000Z',
  totalInteractions: '2',
  averageResponseTime: '24.5',
  daysSinceLastResponse: '1',
  customFields: '',
};

function escapeCsvCell(value: string): string {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildSampleCsv(): string {
  const headerRow = SAMPLE_CSV_HEADERS.map(escapeCsvCell).join(',');
  const exampleRow = SAMPLE_CSV_HEADERS.map((h) => escapeCsvCell(SAMPLE_CSV_EXAMPLE_ROW[h] ?? '')).join(',');
  return [headerRow, exampleRow].join('\r\n');
}

function downloadSampleCsv(): void {
  const csv = buildSampleCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'leads-import-sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Validates a file for CSV import. Mirrors server CsvFileValidator rules.
 * @returns Error message if invalid, null if valid.
 */
function validateFile(file: File): string | null {
  if (!file) return 'Please select a file.';
  const fileName = file.name ?? '';
  const hasCsvExtension = fileName.toLowerCase().endsWith('.csv');
  const mimetype = (file.type ?? '').toLowerCase();
  const validCsvMimeTypes = ['text/csv', 'application/csv'];
  const isValidCsvMimeType = validCsvMimeTypes.includes(mimetype);
  const isTextPlainWithCsvExtension = mimetype === 'text/plain' && hasCsvExtension;
  if (hasCsvExtension || isValidCsvMimeType || isTextPlainWithCsvExtension) {
    return null;
  }
  return 'Please upload a CSV file.';
}

export interface ImportLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportLeadsModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportLeadsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileValidationError, setFileValidationError] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);

  const usersQuery = useUsers({ limit: 200, enabled: open });
  const users: UserListItem[] = usersQuery.data ?? [];
  const importMutation = useImportLeadsMutation();

  const selectedUsers = users.filter((u) => selectedUserIds.includes(String(u.uid)));
  const canSubmit =
    selectedFile &&
    selectedUserIds.length > 0 &&
    !fileValidationError &&
    !importMutation.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const error = validateFile(file);
    setFileValidationError(error);
    setSelectedFile(file);
  };

  const toggleUser = (uid: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async () => {
    if (!selectedFile || selectedUserIds.length === 0) return;
    const error = validateFile(selectedFile);
    if (error) {
      setFileValidationError(error);
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const data = await importMutation.mutateAsync({
        formData,
        params: {
          assignedUserIds: selectedUserIds.map(Number),
        },
      });
      if (data.errors?.length && (data.failed ?? 0) > 0) {
        const imported = data.imported ?? 0;
        const failed = data.failed ?? 0;
        const firstErrors = data.errors.slice(0, 3).map((e) => `Row ${e.row}: ${e.error}`);
        toast.success(
          `Imported ${imported} leads. ${failed} failed.${firstErrors.length ? ` ${firstErrors.join('; ')}` : ''}`
        );
      } else {
        toast.success('Leads imported successfully');
      }
      onOpenChange(false);
      setSelectedFile(null);
      setFileValidationError(null);
      setSelectedUserIds([]);
      onSuccess?.();
    } catch (err: unknown) {
      const axiosData = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data
        : undefined;
      const message =
        typeof axiosData?.message === 'string'
          ? axiosData.message
          : 'Import failed. Please check the file and try again.';
      toast.error(message);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedFile(null);
      setFileValidationError(null);
      setSelectedUserIds([]);
      setUserPopoverOpen(false);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[33.6rem]" showCloseButton>
        <DialogHeader>
          <DialogTitle>Import leads</DialogTitle>
          <DialogDescription>
            Upload a CSV file and assign the imported leads to a user.
          </DialogDescription>
          <button
            type="button"
            onClick={downloadSampleCsv}
            className="mt-1 flex items-center gap-1.5 text-sm text-purple-600 underline underline-offset-4 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <Download className="size-3.5" />
            Download sample CSV
          </button>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Select CSV file"
            />
            {selectedFile ? (
              <div className="flex max-w-full items-center gap-2 rounded-md border border-input bg-background px-3 py-2">
                <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-sm">{selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setFileValidationError(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  aria-label={`Remove ${selectedFile.name}`}
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon className="size-4" />
                Select file
              </Button>
            )}
            {fileValidationError && (
              <p className="text-sm text-destructive" role="alert">
                {fileValidationError}
              </p>
            )}
          </div>
          {selectedFile && !fileValidationError && (
            <>
              <div className="grid gap-2">
                <Label>Assign leads to</Label>
                <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={userPopoverOpen}
                      aria-label={
                        selectedUsers.length === 0
                          ? undefined
                          : selectedUsers.length === 1
                            ? `Assign to ${[selectedUsers[0].name, selectedUsers[0].surname].filter(Boolean).join(' ').trim() || selectedUsers[0].email}`
                            : `Assign to ${selectedUsers.length} users`
                      }
                      className="min-h-10 w-full justify-between gap-2 font-normal"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden text-left">
                        {selectedUserIds.length === 0 ? (
                          <span className="text-muted-foreground">Select users</span>
                        ) : selectedUsers.length === 0 ? (
                          <span className="text-muted-foreground">
                            {selectedUserIds.length} selected
                          </span>
                        ) : (
                          <span className="truncate">
                            {(() => {
                              const first = selectedUsers[0];
                              const firstLabel =
                                [first.name, first.surname].filter(Boolean).join(' ').trim() ||
                                first.email;
                              return selectedUsers.length === 1
                                ? firstLabel
                                : `${firstLabel}, and ${selectedUsers.length - 1} more`;
                            })()}
                          </span>
                        )}
                      </div>
                      <ChevronDown className="size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    {usersQuery.isLoading ? (
                      <div className="p-4 text-sm text-muted-foreground">Loading users…</div>
                    ) : (
                      <div className="max-h-60 overflow-auto p-1">
                        {users.map((u) => {
                          const uid = String(u.uid);
                          const label = [u.name, u.surname].filter(Boolean).join(' ').trim() || u.email;
                          return (
                            <label
                              key={u.uid}
                              className={cn(
                                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                                selectedUserIds.includes(uid) && 'bg-accent'
                              )}
                            >
                              <Checkbox
                                checked={selectedUserIds.includes(uid)}
                                onCheckedChange={() => toggleUser(uid)}
                              />
                              <span className="truncate">{label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
              {selectedUsers.length > 0 && (
                <p className="break-words text-sm text-muted-foreground">
                  Leads will be allocated round-robin to:{' '}
                  <span className="font-medium text-foreground">
                    {selectedUsers
                      .map((u) =>
                        [u.name, u.surname].filter(Boolean).join(' ').trim() || u.email
                      )
                      .join(', ')}
                  </span>
                </p>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="cancel" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {importMutation.isPending ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Uploading and processing…
              </>
            ) : (
              'Import leads'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
