'use client';

import { useState, useEffect, useMemo, useRef, startTransition } from 'react';
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
import { ApifySearchTermsField } from '@/components/apify-search-terms-field';
import { defaultBitdrywallSearchText } from '@/lib/bitdrywall-search-terms';
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
import {
  useStartApifyLeadRunMutation,
  useImportApifyLeadsMutation,
  useSearchableUsersList,
  useBranches,
  useApiClient,
  getBranchDisplayLabel,
} from '@/api/hooks';
import { getApifyLeadRun } from '@/api/endpoints/leads';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import type {
  ApifyLeadRunStatus,
  ImportApifyLeadsPayload,
  LeadImportResponse,
} from '@/api/types/leads';
import { Loader2Icon } from '@/lib/icons';
import {
  Building2,
  CheckCircle2,
  CircleHelp,
  MapPin,
  Tag,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const MAX_SEARCH_TERMS = 5;
const DEFAULT_MAX_PLACES = 50;
const POLL_MS = 3000;
const FAILED_STATUSES = new Set(['FAILED', 'ABORTED', 'TIMED-OUT', 'TIMED_OUT']);

export interface ImportFromApifyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedUserIds?: number[];
  onSuccess?: () => void;
}

type AssignmentMode = 'users' | 'branch';
type Step = 'form' | 'scraping' | 'importing' | 'receipt' | 'error';

function importBranchLabel(b: { name?: string; alias?: string | null }) {
  return getBranchDisplayLabel(b) || 'Branch';
}

function parseSearchTerms(raw: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const line of raw.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(t);
    if (terms.length >= MAX_SEARCH_TERMS) break;
  }
  return terms;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response
      ?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message) && typeof data.message[0] === 'string') {
      return data.message[0];
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function ImportFromApifyModal({
  open,
  onOpenChange,
  assignedUserIds,
  onSuccess,
}: ImportFromApifyModalProps) {
  const [step, setStep] = useState<Step>('form');
  const [lastResult, setLastResult] = useState<LeadImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchText, setSearchText] = useState(defaultBitdrywallSearchText());
  const [locationQuery, setLocationQuery] = useState('');
  const [maxPlaces, setMaxPlaces] = useState(String(DEFAULT_MAX_PLACES));
  const [skipClosedPlaces, setSkipClosedPlaces] = useState(true);
  const [scrapeContacts, setScrapeContacts] = useState(false);
  const [source, setSource] = useState<string>('OTHER');
  const [assignmentMode, setAssignmentMode] = useState<AssignmentMode>('users');
  const [branchPoolIds, setBranchPoolIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<ApifyLeadRunStatus | null>(null);

  const commitStartedRef = useRef(false);
  const startMutation = useStartApifyLeadRunMutation();
  const importMutation = useImportApifyLeadsMutation();
  const apiClient = useApiClient();
  const {
    users: teamUsers,
    searchQuery: assigneeSearch,
    setSearchQuery: setAssigneeSearch,
    isSearchLoading: isAssigneeSearchLoading,
  } = useSearchableUsersList({
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
    if (assigneeSearch.trim().length >= 2) return teamUsers;
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return teamUsers;
    return teamUsers.filter((u) => {
      const name = `${u.name} ${u.surname}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q);
    });
  }, [teamUsers, assigneeSearch]);

  const searchTerms = useMemo(() => parseSearchTerms(searchText), [searchText]);

  useEffect(() => {
    if (!open) return;
    startTransition(() => {
      setStep('form');
      setLastResult(null);
      setErrorMessage(null);
      setRunId(null);
      setRunStatus(null);
      setSelectedUserIds(assignedUserIds?.length ? [...assignedUserIds] : []);
      setAssignmentMode('users');
      setBranchPoolIds([]);
      commitStartedRef.current = false;
    });
  }, [open, assignedUserIds]);

  useEffect(() => {
    if (!open || step !== 'scraping' || !runId) return;
    let cancelled = false;

    async function poll() {
      if (!runId) return;
      try {
        const status = await getApifyLeadRun(apiClient, runId, {
          skipErrorToast: true,
        });
        if (cancelled) return;
        setRunStatus(status);
        if (status.status === 'SUCCEEDED') {
          if (commitStartedRef.current) return;
          await commitImport(runId);
          return;
        }
        if (FAILED_STATUSES.has(status.status)) {
          setErrorMessage(
            status.errorMessage || `Apify run ${status.status}`
          );
          setStep('error');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMessage(apiErrorMessage(err, 'Could not read Apify run status.'));
        setStep('error');
      }
    }

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, step, runId, apiClient]);

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
        ? `Round-robin among active users at ${importBranchLabel(b)}—see the list below.`
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

  function buildImportPayload(id: string): ImportApifyLeadsPayload {
    const payload: ImportApifyLeadsPayload = {
      runId: id,
      followUpInterval: 'WEEKLY',
      followUpDuration: 90,
    };
    if (assignmentMode === 'branch') {
      payload.targetBranchIds = branchPoolIds;
    } else if (selectedUserIds.length > 0) {
      payload.assignedUserIds = selectedUserIds;
    }
    if (source?.trim()) payload.source = source.trim();
    return payload;
  }

  async function commitImport(id: string) {
    if (commitStartedRef.current) return;
    commitStartedRef.current = true;
    setStep('importing');
    try {
      const result = await importMutation.mutateAsync(buildImportPayload(id));
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
        setErrorMessage(errMsg);
        setLastResult(result);
        setStep('error');
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Import failed.');
      setErrorMessage(msg);
      setStep('error');
      toast.error(msg);
    }
  }

  function resetForm() {
    setStep('form');
    setLastResult(null);
    setErrorMessage(null);
    setRunId(null);
    setRunStatus(null);
    setSearchText(defaultBitdrywallSearchText());
    setLocationQuery('');
    setMaxPlaces(String(DEFAULT_MAX_PLACES));
    setSkipClosedPlaces(true);
    setScrapeContacts(false);
    setSource('OTHER');
    setSelectedUserIds([]);
    setAssigneeSearch('');
    setAssignmentMode('users');
    setBranchPoolIds([]);
    commitStartedRef.current = false;
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (searchTerms.length === 0) {
      toast.error('Enter at least one Google Maps search term.');
      return;
    }
    if (!locationQuery.trim()) {
      toast.error('Enter a location (e.g. Johannesburg, South Africa).');
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
    const places = Number(maxPlaces);
    const maxPlacesN =
      Number.isFinite(places) && places >= 1
        ? Math.min(100, Math.floor(places))
        : DEFAULT_MAX_PLACES;

    try {
      const started = await startMutation.mutateAsync({
        searchStrings: searchTerms,
        locationQuery: locationQuery.trim(),
        maxPlaces: maxPlacesN,
        skipClosedPlaces,
        scrapeContacts,
      });
      commitStartedRef.current = false;
      setRunId(started.runId);
      setRunStatus({
        runId: started.runId,
        status: started.status,
        itemCount: 0,
      });
      setStep('scraping');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Could not start Google Maps scrape.'));
    }
  };

  const busy = startMutation.isPending || step === 'scraping' || step === 'importing';
  const showReceipt = step === 'receipt' && lastResult;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-3rem)] flex-col overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <MapPin className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            Import leads from Google Maps
          </DialogTitle>
          <div className="space-y-2 text-left">
            <h3 className="text-foreground flex items-center gap-2 text-base font-semibold">
              <CircleHelp className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              How this works
            </h3>
            <ul className="text-muted-foreground list-disc space-y-1.5 pl-4 text-sm">
              <li>
                LOR starts Apify&apos;s Google Maps scraper with your search terms and
                location, then imports businesses as leads (name, phone, coords, website).
              </li>
              <li>
                Billed by Apify at about $1.50 per 1,000 places. Cap is 100 places per
                search term and {MAX_SEARCH_TERMS} search terms.
              </li>
              <li>
                Choose assignment the same way as spreadsheet import. Follow-up tasks are
                created for imported leads. To run the same search on a schedule, open
                Settings → Scrapping.
              </li>
            </ul>
          </div>
        </DialogHeader>
        {showReceipt ? (
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
                <p className="text-muted-foreground text-xs">Skipped duplicates</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {lastResult.skippedDuplicates ?? 0}
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
          </div>
        ) : step === 'scraping' || step === 'importing' ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-8">
            <Loader2Icon className="size-8 animate-spin text-purple-600" aria-hidden />
            <p className="font-medium text-foreground">
              {step === 'importing' ? 'Importing places as leads…' : 'Scraping Google Maps…'}
            </p>
            <p className="text-muted-foreground text-sm">
              {runStatus?.status ?? 'Starting'}
              {runStatus != null ? ` · ${runStatus.itemCount} place${runStatus.itemCount === 1 ? '' : 's'} found` : ''}
            </p>
            <p className="text-muted-foreground max-w-sm text-center text-xs">
              Keep this dialog open. Larger searches can take several minutes.
            </p>
          </div>
        ) : step === 'error' ? (
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto py-2">
            <p className="text-destructive text-sm">{errorMessage || 'The scrape or import failed.'}</p>
            {(lastResult?.errors?.length ?? 0) > 0 ? (
              <ScrollArea className="h-[min(160px,30vh)] rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <ul className="space-y-1 text-xs text-destructive">
                  {lastResult!.errors.slice(0, 20).map((e, i) => (
                    <li key={`${e.row}-${i}`}>
                      Row {e.row}: {e.error}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : null}
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
            <ApifySearchTermsField
              id="apify-search-terms"
              value={searchText}
              onChange={setSearchText}
              searchTerms={searchTerms}
              maxTerms={MAX_SEARCH_TERMS}
            />
            <div className="grid gap-2">
              <Label htmlFor="apify-location">Location</Label>
              <Input
                id="apify-location"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="Johannesburg, South Africa"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
              <div className="grid gap-2">
                <Label htmlFor="apify-max-places">Max places per search</Label>
                <Input
                  id="apify-max-places"
                  type="number"
                  min={1}
                  max={100}
                  value={maxPlaces}
                  onChange={(e) => setMaxPlaces(e.target.value)}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
                <Checkbox
                  checked={skipClosedPlaces}
                  onCheckedChange={(v) => setSkipClosedPlaces(v === true)}
                />
                Skip closed places
              </label>
            </div>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={scrapeContacts}
                onCheckedChange={(v) => setScrapeContacts(v === true)}
              />
              <span>
                Enrich emails from business websites
                <span className="text-muted-foreground block text-xs">
                  Apify add-on with extra cost. Off by default — phone and name are enough to import.
                </span>
              </span>
            </label>

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
                <Label id="apify-branch-pool-label">Branches</Label>
                {branches.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No branches available for this organization.
                  </p>
                ) : (
                  <>
                    <ScrollArea
                      className="h-[min(200px,32vh)] rounded-md border border-input"
                      aria-labelledby="apify-branch-pool-label"
                    >
                      <div className="space-y-0 p-2">
                        {branches.map((b) => (
                          <label
                            key={b.uid}
                            htmlFor={`apify-branch-pool-${b.uid}`}
                            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                          >
                            <Checkbox
                              id={`apify-branch-pool-${b.uid}`}
                              checked={branchPoolIds.includes(b.uid)}
                              onCheckedChange={() => toggleBranchPool(b.uid)}
                            />
                            <span className="text-sm">{importBranchLabel(b)}</span>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
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
                    ) : null}
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Users className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Label>Team members (optional)</Label>
                </div>
                <Input
                  type="search"
                  placeholder="Search team members…"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  className="h-9"
                />
                <ScrollArea className="h-[min(200px,32vh)] rounded-md border border-input">
                  <div className="space-y-0 p-2">
                    {isAssigneeSearchLoading && filteredUsers.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-3 text-sm">Searching…</p>
                    ) : filteredUsers.length === 0 ? (
                      <p className="text-muted-foreground px-2 py-3 text-sm">No matches.</p>
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
              </div>
            )}

            <div className="grid gap-2">
              <div className="flex items-center gap-2">
                <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <Label htmlFor="apify-source">Default source</Label>
              </div>
              <Select value={source || undefined} onValueChange={setSource}>
                <SelectTrigger id="apify-source" className="w-full">
                  <SelectValue placeholder="Lead source" />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="shrink-0">
          {showReceipt ? (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={resetForm}
                className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus-visible:ring-purple-600/50"
              >
                Scrape more
              </Button>
            </>
          ) : step === 'error' ? (
            <>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Close
              </Button>
              <Button
                type="button"
                onClick={() => {
                  commitStartedRef.current = false;
                  setErrorMessage(null);
                  setStep('form');
                }}
                className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
              >
                Try again
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={step === 'importing'}
              >
                {step === 'scraping' ? 'Close' : 'Cancel'}
              </Button>
              {step === 'form' ? (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={
                    busy ||
                    searchTerms.length === 0 ||
                    !locationQuery.trim() ||
                    (assignmentMode === 'branch' &&
                      (branches.length === 0 ||
                        branchPoolIds.length === 0 ||
                        branchPoolLoading ||
                        branchPoolEmpty))
                  }
                  className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus-visible:ring-purple-600/50"
                >
                  {startMutation.isPending ? (
                    <>
                      <Loader2Icon className="mr-2 size-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    'Start scrape'
                  )}
                </Button>
              ) : null}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
