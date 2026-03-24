'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useImportLeadsMutation, useUsers } from '@/api/hooks';
import type { ImportLeadsFromCSVParams } from '@/api/endpoints/leads';
import {
  LEAD_IMPORT_SAMPLE_CSV,
  LEAD_IMPORT_SAMPLE_FILENAME,
} from '@/api/types/leads';
import { Loader2Icon } from '@/lib/icons';
import {
  CircleHelp,
  Download,
  FileSpreadsheet,
  Table2,
  Tag,
  Upload,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

/** Common CSV headers → persisted API field names (see server csv-parser). */
const CSV_TO_API_ROWS: ReadonlyArray<{ csv: string; api: string }> = [
  { csv: 'Created', api: 'createdAt' },
  { csv: 'Name', api: 'name' },
  { csv: 'Email', api: 'email' },
  { csv: 'Phone', api: 'phone' },
  { csv: 'Secondary phone number', api: 'secondaryPhoneNumber' },
  { csv: 'WhatsApp number', api: 'whatsAppNumber' },
  { csv: 'companyName', api: 'companyName' },
  { csv: 'Source', api: 'source' },
  { csv: 'Form', api: 'form' },
  { csv: 'Channel', api: 'channel' },
  { csv: 'Stage', api: 'lifecycleStage' },
  { csv: 'Owner', api: '(resolved server-side)' },
  { csv: 'Labels', api: 'labels' },
];

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
  /** Optional: pre-selected user IDs when the dialog opens (seeds assignee checkboxes). */
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
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportLeadsMutation();
  const { data: users = [] } = useUsers({ limit: 100, enabled: open });

  const filteredUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const name = `${u.name} ${u.surname}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [users, assigneeSearch]);

  useEffect(() => {
    if (open) {
      setSelectedUserIds(
        assignedUserIds?.length ? [...assignedUserIds] : []
      );
    }
  }, [open, assignedUserIds]);

  function toggleAssigneeUser(uid: number) {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  let assigneesSummary = 'All active sales reps (round-robin)';
  if (selectedUserIds.length === 1) {
    const u = users.find((x) => x.uid === selectedUserIds[0]);
    assigneesSummary =
      [u?.name, u?.surname].filter(Boolean).join(' ').trim() ||
      u?.email ||
      `User ${selectedUserIds[0]}`;
  } else if (selectedUserIds.length > 1) {
    assigneesSummary = `${selectedUserIds.length} people selected`;
  }

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
    if (selectedUserIds.length > 0) {
      params.assignedUserIds = selectedUserIds;
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
        setSelectedUserIds([]);
        setAssigneeSearch('');
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
      setSelectedUserIds([]);
      setAssigneeSearch('');
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
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-3rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Upload className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            Import leads from CSV
          </DialogTitle>
          <div className="space-y-2 text-left">
            <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
              <CircleHelp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              How this works
            </h3>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
              <li>
                Upload a CSV (max 2MB). Optional columns include Created, Name,
                Email, Source, and more—see the sample file for the full list.
                Each row needs at least one of name, email, or phone.
              </li>
              <li>
                Upload your file, optionally select team members below, then
                import. Leads are assigned in round-robin among selected users;
                leave none selected to use all active sales reps.
              </li>
              <li>
                Follow-up tasks are created for imported leads; team members may
                receive push notifications on their devices.
              </li>
            </ul>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="inline-flex items-center gap-1.5 text-left text-sm font-normal text-purple-600 underline underline-offset-2 hover:text-purple-700"
            >
              <Download className="size-4 shrink-0" aria-hidden />
              Download sample CSV
            </button>
          </div>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
          <details className="rounded-md border border-input bg-muted/20 text-sm">
            <summary className="cursor-pointer list-none px-3 py-2 font-medium text-foreground hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <Table2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                Column reference (CSV → API fields)
              </span>
            </summary>
            <div className="space-y-3 border-t border-input px-3 py-3">
              <p className="text-muted-foreground text-xs leading-relaxed">
                Headers in your file map to the same field names returned by GET{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">/leads</code>.
                Additional optional columns (notes, enums, UTM, scoring, etc.) match{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-[11px]">POST /leads/import-csv</code>{' '}
                API docs.
              </p>
              <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-xs">
                <div className="text-muted-foreground font-medium">CSV column</div>
                <div className="text-muted-foreground font-medium">API field</div>
                {CSV_TO_API_ROWS.map((row) => (
                  <div key={row.csv} className="contents">
                    <div className="font-mono text-[11px] text-foreground">{row.csv}</div>
                    <div className="font-mono text-[11px] text-foreground">{row.api}</div>
                  </div>
                ))}
              </div>
            </div>
          </details>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Label htmlFor="import-csv-file">CSV file</Label>
            </div>
            <input
              id="import-csv-file"
              ref={fileInputRef}
              type="file"
              accept=".csv"
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
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Label>Assign to team members (optional)</Label>
            </div>
            <p className="text-muted-foreground text-xs">{assigneesSummary}</p>
            <Label htmlFor="import-assignee-search" className="sr-only">
              Search team members
            </Label>
            <Input
              id="import-assignee-search"
              type="search"
              placeholder="Search team members…"
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              className="h-9"
            />
            <ScrollArea className="h-[min(240px,40vh)] rounded-md border border-input">
              <div className="space-y-0 p-2">
                {users.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-3 text-sm">
                    No users loaded.
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-muted-foreground px-2 py-3 text-sm">
                    No matches.
                  </p>
                ) : (
                  filteredUsers.map((u) => {
                    const fullName =
                      [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                      u.email ||
                      `User ${u.uid}`;
                    const imgSrc =
                      (u as { photoURL?: string | null; avatar?: string | null })
                        .photoURL ??
                      (u as { photoURL?: string | null; avatar?: string | null })
                        .avatar ??
                      undefined;
                    return (
                      <label
                        key={u.uid}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                      >
                        <Checkbox
                          checked={selectedUserIds.includes(u.uid)}
                          onCheckedChange={() => toggleAssigneeUser(u.uid)}
                        />
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={imgSrc} alt={fullName} />
                          <AvatarFallback className="text-xs">
                            {fullName !== `User ${u.uid}`
                              ? fullName.slice(0, 2).toUpperCase()
                              : String(u.uid).slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{fullName}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <span className="text-muted-foreground text-xs">
              Round-robin among selected users; empty = all reps.
            </span>
          </div>

          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <Label htmlFor="import-source">Default source (optional)</Label>
            </div>
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
        <DialogFooter className="shrink-0">
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
            className="bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-600/50"
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
