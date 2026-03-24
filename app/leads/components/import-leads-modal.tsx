'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
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
import { useImportLeadsMutation, useUsers, useBranches, useApiClient } from '@/api/hooks';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import type { ImportLeadsFromCSVParams } from '@/api/endpoints/leads';
import type { LeadImportResponse } from '@/api/types/leads';
import {
  LEAD_IMPORT_SAMPLE_CSV,
  LEAD_IMPORT_SAMPLE_FILENAME,
} from '@/api/types/leads';
import { Loader2Icon } from '@/lib/icons';
import {
  CircleHelp,
  Download,
  FileSpreadsheet,
  Tag,
  Upload,
  Users,
  Building2,
  CheckCircle2,
} from 'lucide-react';
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
  /** Optional: pre-selected user IDs when the dialog opens (seeds assignee checkboxes). */
  assignedUserIds?: number[];
  /** Callback when import succeeds (e.g. refresh list). */
  onSuccess?: () => void;
}

type AssignmentMode = 'users' | 'branch';
type Step = 'form' | 'receipt';

function branchLabel(b: { name?: string; alias?: string | null }) {
  const n = (b.alias || b.name || '').trim();
  return n || 'Branch';
}

export function ImportLeadsModal({
  open,
  onOpenChange,
  assignedUserIds,
  onSuccess,
}: ImportLeadsModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [lastResult, setLastResult] = useState<LeadImportResponse | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<string>('');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('users');
  const [branchPoolIds, setBranchPoolIds] = useState<number[]>([]);
  const [leadFileBranchId, setLeadFileBranchId] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useImportLeadsMutation();
  const apiClient = useApiClient();
  const { data: teamUsers = [] } = useUsers({
    limit: 100,
    enabled: open && assignmentMode === 'users',
  });
  const branchUsersQueries = useQueries({
    queries: branchPoolIds.map((bid) => ({
      queryKey: ['users', 1, 500, '', bid] as const,
      queryFn: () =>
        getUsers(apiClient, { page: 1, limit: 500, branchId: bid }),
      enabled: open && assignmentMode === 'branch' && branchPoolIds.length > 0,
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    })),
  });
  const branchUsers = useMemo(() => {
    const map = new Map<number, UserListItem>();
    for (const q of branchUsersQueries) {
      const rows = q.data?.data;
      if (!rows) continue;
      for (const u of rows) {
        map.set(u.uid, u);
      }
    }
    return Array.from(map.values());
  }, [branchUsersQueries]);
  const branchPoolLoading =
    assignmentMode === 'branch' &&
    branchPoolIds.length > 0 &&
    branchUsersQueries.some((q) => q.isLoading || q.isFetching);
  const branchPoolFetched =
    branchPoolIds.length > 0 &&
    branchUsersQueries.length > 0 &&
    branchUsersQueries.every((q) => q.isFetched || q.isError);
  const branchPoolEmpty =
    assignmentMode === 'branch' &&
    branchPoolIds.length > 0 &&
    branchPoolFetched &&
    !branchPoolLoading &&
    branchUsers.length === 0;

  const { data: branches = [] } = useBranches({ enabled: open });

  const filteredUsers = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return teamUsers;
    return teamUsers.filter((u) => {
      const name = `${u.name} ${u.surname}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teamUsers, assigneeSearch]);

  useEffect(() => {
    if (open) {
      setStep('form');
      setLastResult(null);
      setSelectedUserIds(
        assignedUserIds?.length ? [...assignedUserIds] : []
      );
      setAssignmentMode('users');
      setBranchPoolIds([]);
      setLeadFileBranchId('');
    }
  }, [open, assignedUserIds]);

  function toggleAssigneeUser(uid: number) {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  function toggleBranchPool(uid: number) {
    setBranchPoolIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  }

  let assigneesSummary = 'All active sales reps in your branch (round-robin)';
  if (assignmentMode === 'branch') {
    if (branchPoolIds.length === 0) {
      assigneesSummary =
        'Select one or more branches to load the assignment pool (round-robin across all active users in those branches).';
    } else if (branchPoolIds.length === 1) {
      const b = branches.find((x) => x.uid === branchPoolIds[0]);
      assigneesSummary = b
        ? `Round-robin among active users at ${branchLabel(b)}—see the list below.`
        : 'Round-robin among active users in the selected branch—see the list below.';
    } else {
      assigneesSummary =
        'Round-robin among active users across the selected branches—see the list below.';
    }
  } else if (selectedUserIds.length === 1) {
    const u = teamUsers.find((x) => x.uid === selectedUserIds[0]);
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
    if (assignmentMode === 'branch') {
      if (branches.length === 0) {
        toast.error('No branches are available to assign by branch.');
        return;
      }
      if (branchPoolIds.length === 0) {
        toast.error('Select at least one branch to assign leads to its team members.');
        return;
      }
    }
    const formData = new FormData();
    formData.append('file', file);
    const params: ImportLeadsFromCSVParams = {
      followUpInterval: 'WEEKLY',
      followUpDuration: 90,
    };
    if (assignmentMode === 'branch') {
      params.targetBranchIds = branchPoolIds;
    } else {
      if (selectedUserIds.length > 0) {
        params.assignedUserIds = selectedUserIds;
      }
      if (leadFileBranchId) {
        params.targetBranchId = Number(leadFileBranchId);
      }
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

  function resetFormForNewUpload() {
    setStep('form');
    setLastResult(null);
    setFile(null);
    setSource('');
    setSelectedUserIds([]);
    setAssigneeSearch('');
    setAssignmentMode('users');
    setBranchPoolIds([]);
    setLeadFileBranchId('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next && !importMutation.isPending) {
      resetFormForNewUpload();
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
                Choose assignment: pick specific team members, or pick one or more
                branches to round-robin among everyone in those branches. In team mode you can
                optionally file leads under another branch (when your role allows).
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
        {step === 'receipt' && lastResult ? (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/80 p-4 dark:border-green-900 dark:bg-green-950/40">
              <CheckCircle2 className="size-6 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-foreground">Import complete</p>
                <p className="text-muted-foreground text-sm">
                  {lastResult.message ||
                    `Imported ${lastResult.imported} leads${lastResult.failed > 0 ? `, ${lastResult.failed} failed` : ''}.`}
                </p>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Imported</p>
                <p className="text-2xl font-semibold tabular-nums">{lastResult.imported}</p>
              </div>
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Failed rows</p>
                <p className="text-2xl font-semibold tabular-nums">{lastResult.failed}</p>
              </div>
              <div className="rounded-md border border-input bg-muted/30 p-3">
                <p className="text-muted-foreground text-xs">Reminders created</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {lastResult.remindersCreated ?? 0}
                  {(lastResult.remindersFailed ?? 0) > 0 ? (
                    <span className="text-destructive text-sm font-normal">
                      {' '}
                      ({lastResult.remindersFailed} failed)
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            {(lastResult.assignmentSummary?.length ?? 0) > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">Leads per team member</p>
                <div className="max-h-[min(220px,40vh)] overflow-y-auto rounded-md border border-input">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80">
                      <tr className="border-b border-input text-left">
                        <th className="p-2 font-medium">Name</th>
                        <th className="p-2 font-medium text-right">Leads</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastResult.assignmentSummary!.map((row) => (
                        <tr key={row.userId} className="border-b border-input/60 last:border-0">
                          <td className="p-2">{row.userName}</td>
                          <td className="p-2 text-right tabular-nums">{row.leadsAssigned}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
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

            <div className="grid gap-3">
              <Label className="text-foreground">Assignment</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentMode === 'users' ? 'default' : 'outline'}
                  className={
                    assignmentMode === 'users'
                      ? 'border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white [&_svg]:text-white'
                      : ''
                  }
                  onClick={() => setAssignmentMode('users')}
                >
                  <Users className="mr-1.5 size-4" aria-hidden />
                  Selected team members
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={assignmentMode === 'branch' ? 'default' : 'outline'}
                  className={
                    assignmentMode === 'branch'
                      ? 'border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white [&_svg]:text-white'
                      : ''
                  }
                  onClick={() => setAssignmentMode('branch')}
                >
                  <Building2 className="mr-1.5 size-4" aria-hidden />
                  Assign by branch
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">{assigneesSummary}</p>
            </div>

            {assignmentMode === 'branch' ? (
              <div className="grid gap-2">
                <Label id="import-branch-pool-label">Branches</Label>
                {branches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No branches available for this organization.
                  </p>
                ) : (
                  <>
                    <ScrollArea
                      className="h-[min(200px,32vh)] rounded-md border border-input"
                      aria-labelledby="import-branch-pool-label"
                    >
                      <div className="space-y-0 p-2">
                        {branches.map((b) => (
                          <label
                            key={b.uid}
                            htmlFor={`import-branch-pool-${b.uid}`}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                          >
                            <Checkbox
                              id={`import-branch-pool-${b.uid}`}
                              checked={branchPoolIds.includes(b.uid)}
                              onCheckedChange={() => toggleBranchPool(b.uid)}
                            />
                            <span className="text-sm">{branchLabel(b)}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <span className="text-muted-foreground text-xs">
                      With multiple branches, each lead is filed under the assignee&apos;s branch.
                      Imports rotate (load-aware) across the active users shown below.
                    </span>
                    {branchPoolLoading ? (
                      <p className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Loader2Icon className="size-3.5 shrink-0 animate-spin" aria-hidden />
                        Loading teams for selected branches…
                      </p>
                    ) : branchPoolEmpty ? (
                      <p className="text-destructive text-xs">
                        No active users in the selected branches—choose different branches or use
                        team member selection.
                      </p>
                    ) : branchUsers.length > 0 ? (
                      <div className="rounded-md border border-dashed border-input bg-muted/20 px-2 py-1.5">
                        <p className="text-muted-foreground mb-1 text-[10px] font-medium uppercase tracking-wide">
                          Assignment pool
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {branchUsers
                            .map((u) =>
                              [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                              u.email ||
                              `User ${u.uid}`
                            )
                            .join(' · ')}
                        </p>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Label>Team members (optional)</Label>
                  </div>
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
                      {teamUsers.length === 0 ? (
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
                    Round-robin among selected users; leave empty for all reps in your
                    branch.
                  </span>
                </div>

                {branches.length > 0 ? (
                  <div className="grid gap-2">
                    <Label htmlFor="import-lead-branch">File leads under branch (optional)</Label>
                    <Select
                      value={leadFileBranchId || '__default__'}
                      onValueChange={(v) =>
                        setLeadFileBranchId(v === '__default__' ? '' : v)
                      }
                    >
                      <SelectTrigger id="import-lead-branch" className="w-full">
                        <SelectValue placeholder="Default (your branch)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__default__">Default (your branch)</SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.uid} value={String(b.uid)}>
                            {branchLabel(b)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-muted-foreground text-xs">
                      When set, imported leads use this branch; your role must allow it.
                    </span>
                  </div>
                ) : null}
              </>
            )}

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
        )}
        <DialogFooter className="shrink-0">
          {step === 'receipt' && lastResult ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  handleOpenChange(false);
                }}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={resetFormForNewUpload}
                className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus-visible:ring-purple-600/50"
              >
                <Upload className="mr-2 size-4" aria-hidden />
                Upload more
              </Button>
            </>
          ) : (
            <>
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
                disabled={
                  !file ||
                  importMutation.isPending ||
                  (assignmentMode === 'branch' &&
                    (branches.length === 0 ||
                      branchPoolIds.length === 0 ||
                      branchPoolLoading ||
                      branchPoolEmpty))
                }
                className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus-visible:ring-purple-600/50"
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
