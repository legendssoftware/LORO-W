'use client';

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  MapPin,
  Play,
  Plus,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  useBranches,
  getBranchDisplayLabel,
  useSearchableUsersList,
  useSessionSync,
  useStartApifyLeadRunMutation,
  useImportApifyLeadsMutation,
} from '@/api/hooks';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { getUsers, type UserListItem } from '@/api/endpoints/user';
import {
  deleteApifyLeadScrapeJob,
  getApifyLeadScrapeJobs,
  patchApifyLeadScrapeJob,
  postApifyLeadScrapeJob,
  runApifyLeadScrapeJobNow,
} from '@/api/endpoints/apify-lead-job';
import { getApifyLeadRun, getApifyLeadRunPreview } from '@/api/endpoints/leads';
import type {
  ApifyJobRunStatus,
  ApifyLeadScrapeJobRecord,
  CreateApifyLeadScrapeJobBody,
} from '@/api/types/apify-lead-job';
import type {
  ApifyLeadRunPreview,
  ApifyLeadRunStatus,
  ImportApifyLeadsPayload,
  LeadImportResponse,
} from '@/api/types/leads';
import { settingsOrgApifyLeadJobsKey } from '@/api/query-keys/settings';
import { LEAD_SOURCE_OPTIONS } from '@/lib/lead-form-utils';
import { defaultBitdrywallSearchText } from '@/lib/bitdrywall-search-terms';
import { ApifySearchTermsField } from '@/components/apify-search-terms-field';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2Icon } from '@/lib/icons';

const PANEL_CLASS = 'rounded-xl border border-border bg-card shadow-sm';
const MAX_SEARCH_TERMS = 5;
const MAX_JOBS = 10;
const DEFAULT_MAX_PLACES = 50;
const DEFAULT_DAYS = [1, 2, 3, 4, 5];
const POLL_MS = 3000;
const FAILED_STATUSES = new Set(['FAILED', 'ABORTED', 'TIMED-OUT', 'TIMED_OUT']);
const ISO_DAYS: { id: number; label: string }[] = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 7, label: 'Sun' },
];

type AssignmentMode = 'users' | 'branch';
type NewJobStep = 'form' | 'scraping' | 'preview' | 'importing' | 'receipt' | 'error';

type JobFormState = {
  name: string;
  searchText: string;
  locationQuery: string;
  maxPlaces: string;
  skipClosedPlaces: boolean;
  scrapeContacts: boolean;
  source: string;
  assignmentMode: AssignmentMode;
  assignedUserIds: number[];
  targetBranchIds: number[];
  daysOfWeek: number[];
  time: string;
  isEnabled: boolean;
};

function emptyForm(): JobFormState {
  return {
    name: '',
    searchText: defaultBitdrywallSearchText(),
    locationQuery: '',
    maxPlaces: String(DEFAULT_MAX_PLACES),
    skipClosedPlaces: true,
    scrapeContacts: false,
    source: 'OTHER',
    assignmentMode: 'users',
    assignedUserIds: [],
    targetBranchIds: [],
    daysOfWeek: [...DEFAULT_DAYS],
    time: '06:00',
    isEnabled: true,
  };
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

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function recordToForm(job: ApifyLeadScrapeJobRecord): JobFormState {
  return {
    name: job.name,
    searchText: job.searchStrings.join('\n'),
    locationQuery: job.locationQuery,
    maxPlaces: String(job.maxPlaces),
    skipClosedPlaces: job.skipClosedPlaces,
    scrapeContacts: job.scrapeContacts,
    source: job.source || 'OTHER',
    assignmentMode: job.targetBranchIds && job.targetBranchIds.length > 0 ? 'branch' : 'users',
    assignedUserIds: job.assignedUserIds ?? [],
    targetBranchIds: job.targetBranchIds ?? [],
    daysOfWeek: job.daysOfWeek.length > 0 ? job.daysOfWeek : [...DEFAULT_DAYS],
    time: `${pad2(job.hour)}:${pad2(job.minute)}`,
    isEnabled: job.isEnabled,
  };
}

function parseTime(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(':');
  const hour = Number(h);
  const minute = Number(m);
  return {
    hour: Number.isFinite(hour) ? Math.min(23, Math.max(0, hour)) : 6,
    minute: Number.isFinite(minute) ? Math.min(59, Math.max(0, minute)) : 0,
  };
}

function weekdayLabel(days: number[]): string {
  if (days.length === 7) return 'Every day';
  const set = new Set(days);
  if (days.length === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return 'Weekdays';
  return ISO_DAYS.filter((d) => set.has(d.id)).map((d) => d.label).join(', ');
}

function formatWhen(iso: string | null, timeZone: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      timeZone,
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function statusBadge(status: ApifyJobRunStatus) {
  switch (status) {
    case 'idle':
      return <Badge variant="secondary">Idle</Badge>;
    case 'running':
      return <Badge className="bg-purple-600">Scraping</Badge>;
    case 'importing':
      return <Badge className="bg-purple-600">Importing</Badge>;
    case 'succeeded':
      return <Badge className="bg-green-600">Imported</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default: {
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: { message?: unknown } } }).response?.data;
    if (typeof data?.message === 'string') return data.message;
    if (Array.isArray(data?.message) && typeof data.message[0] === 'string') {
      return data.message[0];
    }
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

function buildPayload(form: JobFormState, timeZone: string): CreateApifyLeadScrapeJobBody {
  const { hour, minute } = parseTime(form.time);
  const payload: CreateApifyLeadScrapeJobBody = {
    name: form.name.trim() || undefined,
    searchStrings: parseSearchTerms(form.searchText),
    locationQuery: form.locationQuery.trim(),
    maxPlaces: Number(form.maxPlaces) || DEFAULT_MAX_PLACES,
    skipClosedPlaces: form.skipClosedPlaces,
    scrapeContacts: form.scrapeContacts,
    source: form.source,
    daysOfWeek: form.daysOfWeek,
    hour,
    minute,
    timeZone,
    isEnabled: form.isEnabled,
  };
  if (form.assignmentMode === 'branch') {
    payload.targetBranchIds = form.targetBranchIds;
    payload.assignedUserIds = [];
  } else {
    payload.assignedUserIds = form.assignedUserIds;
    payload.targetBranchIds = [];
  }
  return payload;
}

function newJobDialogTitle(step: NewJobStep): string {
  switch (step) {
    case 'form':
      return 'Add scrape';
    case 'scraping':
      return 'Scraping Google Maps';
    case 'preview':
      return 'Review and assign leads';
    case 'importing':
      return 'Importing leads';
    case 'receipt':
      return 'Import complete';
    case 'error':
      return 'Scrape failed';
    default: {
      const exhaustive: never = step;
      return exhaustive;
    }
  }
}

type ApifyLeadJobsSectionProps = {
  orgTimezone?: string;
};

export function ApifyLeadJobsSection({ orgTimezone }: ApifyLeadJobsSectionProps) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const { isTokenReady } = useTokenReady();
  const { backendUserData } = useSessionSync();
  const orgRef = backendUserData?.organisationRef ?? '';
  const enabled = Boolean(orgRef) && isTokenReady;
  const timeZone = orgTimezone?.trim() || 'Africa/Johannesburg';

  const [editingUid, setEditingUid] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<JobFormState>(emptyForm);
  const [deleteUid, setDeleteUid] = useState<number | null>(null);
  const [newJobStep, setNewJobStep] = useState<NewJobStep>('form');
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<ApifyLeadRunStatus | null>(null);
  const [preview, setPreview] = useState<ApifyLeadRunPreview | null>(null);
  const [lastResult, setLastResult] = useState<LeadImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const previewStartedRef = useRef(false);

  const isNew = editingUid === 'new';
  const isEdit = typeof editingUid === 'number';

  const jobsQuery = useQuery({
    queryKey: settingsOrgApifyLeadJobsKey(orgRef),
    queryFn: () => getApifyLeadScrapeJobs(client, orgRef),
    enabled,
    refetchInterval: (query) =>
      query.state.data?.jobs.some((job) => job.isRunning) ? 4000 : false,
  });

  const jobs = jobsQuery.data?.jobs ?? [];
  const apifyConfigured = jobsQuery.data?.apifyConfigured ?? true;
  const dialogOpen = editingUid !== null;
  const searchTerms = useMemo(() => parseSearchTerms(form.searchText), [form.searchText]);

  const showAssignment =
    isEdit || (isNew && (newJobStep === 'form' || newJobStep === 'preview'));

  const { data: branches = [] } = useBranches({ enabled: dialogOpen });
  const {
    users: teamUsers,
    searchQuery: assigneeSearch,
    setSearchQuery: setAssigneeSearch,
    isSearchLoading: isAssigneeSearchLoading,
  } = useSearchableUsersList({
    limit: 100,
    enabled: dialogOpen && showAssignment && form.assignmentMode === 'users',
  });

  const branchUsersQueries = useQueries({
    queries: form.targetBranchIds.map((bid) => ({
      queryKey: ['users', 1, 500, '', bid] as const,
      queryFn: () => getUsers(client, { page: 1, limit: 500, branchId: bid }),
      enabled:
        dialogOpen &&
        showAssignment &&
        form.assignmentMode === 'branch' &&
        form.targetBranchIds.length > 0,
      staleTime: 2 * 60 * 1000,
    })),
  });
  const branchPoolLoading =
    form.assignmentMode === 'branch' &&
    form.targetBranchIds.length > 0 &&
    branchUsersQueries.some((q) => q.isLoading || q.isFetching);
  const branchPoolFetched =
    form.targetBranchIds.length > 0 &&
    branchUsersQueries.length > 0 &&
    branchUsersQueries.every((q) => q.isFetched || q.isError);
  const branchPoolEmpty =
    form.assignmentMode === 'branch' &&
    form.targetBranchIds.length > 0 &&
    branchPoolFetched &&
    !branchPoolLoading &&
    !branchUsersQueries.some((q) => (q.data?.data?.length ?? 0) > 0);

  const startMutation = useStartApifyLeadRunMutation();
  const importMutation = useImportApifyLeadsMutation();

  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: settingsOrgApifyLeadJobsKey(orgRef) });
  }

  function resetNewJobWizard(nextForm?: JobFormState) {
    setNewJobStep('form');
    setRunId(null);
    setRunStatus(null);
    setPreview(null);
    setLastResult(null);
    setErrorMessage(null);
    previewStartedRef.current = false;
    if (nextForm) setForm(nextForm);
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form, timeZone);
      if (editingUid === 'new') {
        return postApifyLeadScrapeJob(client, orgRef, payload);
      }
      if (typeof editingUid === 'number') {
        return patchApifyLeadScrapeJob(client, orgRef, editingUid, payload);
      }
      throw new Error('Nothing to save');
    },
    onSuccess: async (result) => {
      toast.success(result.message);
      setEditingUid(null);
      await invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save scrape job.')),
  });

  const enabledMut = useMutation({
    mutationFn: ({ uid, isEnabled }: { uid: number; isEnabled: boolean }) =>
      patchApifyLeadScrapeJob(client, orgRef, uid, { isEnabled }),
    onSuccess: async (result) => {
      toast.success(result.job.isEnabled ? 'Schedule enabled' : 'Schedule paused');
      await invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update schedule.')),
  });

  const runMut = useMutation({
    mutationFn: (uid: number) => runApifyLeadScrapeJobNow(client, orgRef, uid),
    onSuccess: async (result) => {
      toast.success(result.message);
      await invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start scrape.')),
  });

  const deleteMut = useMutation({
    mutationFn: (uid: number) => deleteApifyLeadScrapeJob(client, orgRef, uid),
    onSuccess: async (result) => {
      toast.success(result.message);
      setDeleteUid(null);
      await invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete job.')),
  });

  useEffect(() => {
    if (editingUid !== 'new') return;
    resetNewJobWizard(emptyForm());
    setAssigneeSearch('');
    // Reset only when opening a new job, not on assignee-search callback identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- editingUid is the open signal
  }, [editingUid]);

  useEffect(() => {
    if (!dialogOpen || !isNew || newJobStep !== 'scraping' || !runId) return;
    let cancelled = false;

    async function poll() {
      if (!runId) return;
      try {
        const status = await getApifyLeadRun(client, runId, { skipErrorToast: true });
        if (cancelled) return;
        setRunStatus(status);
        if (status.status === 'SUCCEEDED') {
          if (previewStartedRef.current) return;
          previewStartedRef.current = true;
          const mapped = await getApifyLeadRunPreview(client, runId, { skipErrorToast: true });
          if (cancelled) return;
          setPreview(mapped);
          setNewJobStep('preview');
          return;
        }
        if (FAILED_STATUSES.has(status.status)) {
          setErrorMessage(status.errorMessage || `Apify run ${status.status}`);
          setNewJobStep('error');
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setErrorMessage(apiErrorMessage(err, 'Could not read Apify run status.'));
        setNewJobStep('error');
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
  }, [dialogOpen, isNew, newJobStep, runId, client]);

  function openEdit(job: ApifyLeadScrapeJobRecord) {
    setForm(recordToForm(job));
    setAssigneeSearch('');
    setEditingUid(job.uid);
  }

  function toggleDay(id: number) {
    setForm((s) => ({
      ...s,
      daysOfWeek: s.daysOfWeek.includes(id)
        ? s.daysOfWeek.filter((d) => d !== id)
        : [...s.daysOfWeek, id].sort((a, b) => a - b),
    }));
  }

  const canSaveSchedule =
    searchTerms.length > 0 &&
    form.locationQuery.trim().length > 0 &&
    form.daysOfWeek.length > 0 &&
    !(form.assignmentMode === 'branch' && (form.targetBranchIds.length === 0 || branchPoolEmpty));

  const canStartScrape =
    searchTerms.length > 0 && form.locationQuery.trim().length > 0 && apifyConfigured;

  const canImport =
    Boolean(runId) &&
    (preview?.mappedCount ?? 0) > 0 &&
    !(
      form.assignmentMode === 'branch' &&
      (branches.length === 0 ||
        form.targetBranchIds.length === 0 ||
        branchPoolLoading ||
        branchPoolEmpty)
    );

  async function handleStartScrape() {
    if (!canStartScrape) {
      toast.error('Enter search terms and a location before starting a scrape.');
      return;
    }
    const places = Number(form.maxPlaces);
    const maxPlacesN =
      Number.isFinite(places) && places >= 1
        ? Math.min(100, Math.floor(places))
        : DEFAULT_MAX_PLACES;
    try {
      const started = await startMutation.mutateAsync({
        searchStrings: searchTerms,
        locationQuery: form.locationQuery.trim(),
        maxPlaces: maxPlacesN,
        skipClosedPlaces: form.skipClosedPlaces,
        scrapeContacts: form.scrapeContacts,
      });
      previewStartedRef.current = false;
      setRunId(started.runId);
      setRunStatus({
        runId: started.runId,
        status: started.status,
        itemCount: 0,
      });
      setPreview(null);
      setLastResult(null);
      setErrorMessage(null);
      setNewJobStep('scraping');
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, 'Could not start Google Maps scrape.'));
    }
  }

  function buildImportPayload(id: string): ImportApifyLeadsPayload {
    const payload: ImportApifyLeadsPayload = {
      runId: id,
      followUpInterval: 'WEEKLY',
      followUpDuration: 90,
    };
    if (form.assignmentMode === 'branch') {
      payload.targetBranchIds = form.targetBranchIds;
    } else if (form.assignedUserIds.length > 0) {
      payload.assignedUserIds = form.assignedUserIds;
    }
    if (form.source?.trim()) payload.source = form.source.trim();
    return payload;
  }

  async function handleImport() {
    if (!runId) return;
    if (form.assignmentMode === 'branch') {
      if (branches.length === 0) {
        toast.error('No branches are available to assign by branch.');
        return;
      }
      if (form.targetBranchIds.length === 0) {
        toast.error('Select at least one branch to assign leads to its team members.');
        return;
      }
    }
    setNewJobStep('importing');
    try {
      const result = await importMutation.mutateAsync(buildImportPayload(runId));
      if (result.success) {
        toast.success(
          result.message ||
            `Imported ${result.imported} leads. ${result.failed > 0 ? `${result.failed} failed.` : ''}`
        );
        setLastResult(result);
        setNewJobStep('receipt');
        if (form.isEnabled && form.daysOfWeek.length > 0 && form.locationQuery.trim()) {
          try {
            const saved = await postApifyLeadScrapeJob(client, orgRef, buildPayload(form, timeZone));
            toast.success(saved.message || 'Schedule saved');
            await invalidate();
          } catch (err: unknown) {
            toast.error(apiErrorMessage(err, 'Leads imported, but the schedule could not be saved.'));
          }
        }
      } else {
        const errMsg = result.errors?.[0]?.error || result.message || 'Import failed.';
        setErrorMessage(errMsg);
        setLastResult(result);
        setNewJobStep('error');
        toast.error(errMsg);
      }
    } catch (err: unknown) {
      const msg = apiErrorMessage(err, 'Import failed.');
      setErrorMessage(msg);
      setNewJobStep('error');
      toast.error(msg);
    }
  }

  function closeDialog() {
    setEditingUid(null);
  }

  const showReceipt = isNew && newJobStep === 'receipt' && lastResult;

  return (
    <div className={PANEL_CLASS} data-tour="settings-active-panel">
      <div className="px-6 pt-6">
        <h2 className="flex items-center gap-2 text-lg font-medium">
          <MapPin className="size-5" />
          Scrapping
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Start a Google Maps scrape, review the places like a spreadsheet, then assign owners in
          the same dialog. Optionally save a weekday schedule so the server repeats it. One-off
          scrapes also live on Leads → Import → From Google Maps.
        </p>
      </div>
      <Separator className="mt-4" />
      <div className="space-y-4 px-6 py-4">
        {!apifyConfigured ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            Apify is not configured on the server. Set <code>APIFY_TOKEN</code> and restart the API.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Times use {timeZone}. Least-loaded assignment, then weekly follow-ups for 90 days.
            Cap is {MAX_JOBS} jobs.
          </p>
          <Button
            type="button"
            size="sm"
            className="bg-purple-600 text-white hover:bg-purple-700"
            disabled={jobs.length >= MAX_JOBS}
            onClick={() => {
              setAssigneeSearch('');
              setEditingUid('new');
            }}
          >
            <Plus className="mr-1.5 size-4" />
            Add scrape
          </Button>
        </div>

        {jobsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No scheduled scrapes yet. Add one for a city — search terms default to BitDrywall
            construction materials (drywall, plasterboard, ceiling boards, building materials).
          </p>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.uid} className="rounded-lg border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{job.name}</p>
                      {statusBadge(job.lastRunStatus)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.searchStrings.join(', ')} · {job.locationQuery} · up to {job.maxPlaces}{' '}
                      places/term
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="size-3.5 shrink-0" />
                      {weekdayLabel(job.daysOfWeek)} at {pad2(job.hour)}:{pad2(job.minute)}{' '}
                      ({job.timeZone})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Next {formatWhen(job.nextRunAt, job.timeZone)} · Last{' '}
                      {formatWhen(job.lastRunAt, job.timeZone)}
                      {job.lastImportSummary
                        ? ` · imported ${job.lastImportSummary.imported}, skipped ${job.lastImportSummary.skippedDuplicates}`
                        : ''}
                    </p>
                    {job.lastError ? (
                      <p className="text-xs text-destructive">{job.lastError}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={job.isEnabled}
                        disabled={enabledMut.isPending || job.isRunning}
                        onCheckedChange={(checked) =>
                          enabledMut.mutate({ uid: job.uid, isEnabled: checked })
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        {job.isEnabled ? 'On' : 'Off'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!apifyConfigured || job.isRunning || runMut.isPending}
                      onClick={() => runMut.mutate(job.uid)}
                    >
                      {job.isRunning ? (
                        <Loader2Icon className="mr-1.5 size-4 animate-spin" />
                      ) : (
                        <Play className="mr-1.5 size-4" />
                      )}
                      Run now
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(job)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="text-destructive"
                      disabled={job.isRunning}
                      onClick={() => setDeleteUid(job.uid)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="flex max-h-[90vh] max-w-[calc(100%-3rem)] flex-col overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {isEdit ? 'Edit scrape' : newJobDialogTitle(newJobStep)}
            </DialogTitle>
          </DialogHeader>

          {showReceipt ? (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50/80 p-4 dark:border-green-900 dark:bg-green-950/40">
                <CheckCircle2
                  className="size-6 shrink-0 text-green-600 dark:text-green-400"
                  aria-hidden
                />
                <div className="min-w-0 space-y-1">
                  <p className="font-semibold text-foreground">Import complete</p>
                  <p className="text-sm text-muted-foreground">
                    {lastResult.message ||
                      `Imported ${lastResult.imported} leads${lastResult.failed > 0 ? `, ${lastResult.failed} failed` : ''}.`}
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-input bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Imported</p>
                  <p className="text-2xl font-semibold tabular-nums">{lastResult.imported}</p>
                </div>
                <div className="rounded-md border border-input bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Failed rows</p>
                  <p className="text-2xl font-semibold tabular-nums">{lastResult.failed}</p>
                </div>
                <div className="rounded-md border border-input bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Skipped duplicates</p>
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
          ) : isNew && (newJobStep === 'scraping' || newJobStep === 'importing') ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 py-8">
              <Loader2Icon className="size-8 animate-spin text-purple-600" aria-hidden />
              <p className="font-medium text-foreground">
                {newJobStep === 'importing'
                  ? 'Importing places as leads…'
                  : 'Scraping Google Maps…'}
              </p>
              <p className="text-sm text-muted-foreground">
                {runStatus?.status ?? 'Starting'}
                {runStatus != null
                  ? ` · ${runStatus.itemCount} place${runStatus.itemCount === 1 ? '' : 's'} found`
                  : ''}
              </p>
              <p className="max-w-sm text-center text-xs text-muted-foreground">
                Keep this dialog open. Larger searches can take several minutes.
              </p>
            </div>
          ) : isNew && newJobStep === 'error' ? (
            <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto py-2">
              <p className="text-sm text-destructive">
                {errorMessage || 'The scrape or import failed.'}
              </p>
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
          ) : isNew && newJobStep === 'preview' && preview ? (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Label>Scrape results</Label>
                </div>
                <p className="text-sm">
                  <span className="font-bold text-purple-600">
                    {preview.mappedCount} place{preview.mappedCount === 1 ? '' : 's'}
                  </span>{' '}
                  <span className="text-muted-foreground">
                    mapped
                    {preview.skippedClosedCount > 0
                      ? ` · ${preview.skippedClosedCount} closed skipped`
                      : ''}
                    {preview.errorCount > 0 ? ` · ${preview.errorCount} invalid` : ''}
                    {preview.mappedCount > preview.rows.length
                      ? ` · showing first ${preview.rows.length}`
                      : ''}
                  </span>
                </p>
                {preview.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No importable places in this run. Try different search terms or a broader
                    location.
                  </p>
                ) : (
                  <div className="max-h-[min(240px,36vh)] overflow-auto rounded-md border border-input">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="sticky top-0 bg-muted/80">
                        <tr className="border-b border-input text-left">
                          <th className="p-2 font-medium">Name</th>
                          <th className="p-2 font-medium">Phone</th>
                          <th className="p-2 font-medium">Email</th>
                          <th className="p-2 font-medium">Address</th>
                          <th className="p-2 font-medium">Website</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.rows.map((row, i) => (
                          <tr
                            key={`${row.name ?? 'place'}-${i}`}
                            className="border-b border-input/60 last:border-0"
                          >
                            <td className="p-2 align-top">{row.name || row.companyName || '—'}</td>
                            <td className="p-2 align-top whitespace-nowrap">{row.phone || '—'}</td>
                            <td className="p-2 align-top">{row.email || '—'}</td>
                            <td className="max-w-[180px] truncate p-2 align-top" title={row.address}>
                              {row.address || '—'}
                            </td>
                            <td className="max-w-[140px] truncate p-2 align-top" title={row.website}>
                              {row.website || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <AssignmentFields
                form={form}
                setForm={setForm}
                branches={branches}
                teamUsers={teamUsers}
                assigneeSearch={assigneeSearch}
                setAssigneeSearch={setAssigneeSearch}
                isAssigneeSearchLoading={isAssigneeSearchLoading}
                branchPoolLoading={branchPoolLoading}
                branchPoolEmpty={branchPoolEmpty}
              />
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <Label htmlFor="apify-job-source-preview">Default source</Label>
                </div>
                <Select
                  value={form.source}
                  onValueChange={(value) => setForm((s) => ({ ...s, source: value }))}
                >
                  <SelectTrigger id="apify-job-source-preview" className="w-full">
                    <SelectValue />
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
          ) : (
            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto py-2">
              <div className="grid gap-2">
                <Label htmlFor="apify-job-name">Name (optional)</Label>
                <Input
                  id="apify-job-name"
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="BitDrywall — Johannesburg"
                />
              </div>
              <ApifySearchTermsField
                id="apify-job-terms"
                value={form.searchText}
                onChange={(searchText) => setForm((s) => ({ ...s, searchText }))}
                searchTerms={searchTerms}
                maxTerms={MAX_SEARCH_TERMS}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="apify-job-location">Location</Label>
                  <Input
                    id="apify-job-location"
                    value={form.locationQuery}
                    onChange={(e) => setForm((s) => ({ ...s, locationQuery: e.target.value }))}
                    placeholder="Johannesburg, South Africa"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apify-job-max">Max places per search</Label>
                  <Input
                    id="apify-job-max"
                    type="number"
                    min={1}
                    max={100}
                    value={form.maxPlaces}
                    onChange={(e) => setForm((s) => ({ ...s, maxPlaces: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.skipClosedPlaces}
                    onCheckedChange={(v) =>
                      setForm((s) => ({ ...s, skipClosedPlaces: v === true }))
                    }
                  />
                  Skip closed places
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.scrapeContacts}
                    onCheckedChange={(v) =>
                      setForm((s) => ({ ...s, scrapeContacts: v === true }))
                    }
                  />
                  Enrich emails (extra Apify cost)
                </label>
              </div>
              <div className="grid gap-2">
                <Label>Weekdays</Label>
                <div className="flex flex-wrap gap-1.5">
                  {ISO_DAYS.map((day) => {
                    const on = form.daysOfWeek.includes(day.id);
                    return (
                      <Button
                        key={day.id}
                        type="button"
                        size="sm"
                        variant={on ? 'default' : 'outline'}
                        className={on ? 'border-0 bg-purple-600 text-white hover:bg-purple-700' : ''}
                        onClick={() => toggleDay(day.id)}
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="apify-job-time">Time ({timeZone})</Label>
                  <Input
                    id="apify-job-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apify-job-source">Default source</Label>
                  <Select
                    value={form.source}
                    onValueChange={(value) => setForm((s) => ({ ...s, source: value }))}
                  >
                    <SelectTrigger id="apify-job-source" className="w-full">
                      <SelectValue />
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
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(checked) => setForm((s) => ({ ...s, isEnabled: checked }))}
                />
                Enable schedule
              </label>
              {isNew ? (
                <p className="text-xs text-muted-foreground">
                  Start scrape to review places and assign owners before import. Save schedule only
                  skips the preview and uses least-loaded assignment among your branch unless you
                  pick people below.
                </p>
              ) : null}
              <AssignmentFields
                form={form}
                setForm={setForm}
                branches={branches}
                teamUsers={teamUsers}
                assigneeSearch={assigneeSearch}
                setAssigneeSearch={setAssigneeSearch}
                isAssigneeSearchLoading={isAssigneeSearchLoading}
                branchPoolLoading={branchPoolLoading}
                branchPoolEmpty={branchPoolEmpty}
              />
            </div>
          )}

          <DialogFooter className="shrink-0 flex-wrap gap-2">
            {showReceipt ? (
              <>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                  onClick={() =>
                    resetNewJobWizard({
                      ...emptyForm(),
                      locationQuery: form.locationQuery,
                    })
                  }
                >
                  Scrape more
                </Button>
              </>
            ) : isNew && newJobStep === 'error' ? (
              <>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Close
                </Button>
                <Button
                  type="button"
                  className="border-0 bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                  onClick={() => {
                    previewStartedRef.current = false;
                    setErrorMessage(null);
                    setNewJobStep('form');
                  }}
                >
                  Try again
                </Button>
              </>
            ) : isNew && newJobStep === 'preview' ? (
              <>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!canImport || importMutation.isPending}
                  className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                  onClick={() => void handleImport()}
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
            ) : isNew && (newJobStep === 'scraping' || newJobStep === 'importing') ? (
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={newJobStep === 'importing'}
              >
                {newJobStep === 'scraping' ? 'Close' : 'Cancel'}
              </Button>
            ) : isNew ? (
              <>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSaveSchedule || saveMut.isPending}
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? 'Saving…' : 'Save schedule only'}
                </Button>
                <Button
                  type="button"
                  disabled={!canStartScrape || startMutation.isPending}
                  className="bg-purple-600 text-white hover:bg-purple-700 hover:text-white"
                  onClick={() => void handleStartScrape()}
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
              </>
            ) : isEdit ? (
              <>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={!canSaveSchedule || saveMut.isPending}
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => saveMut.mutate()}
                >
                  {saveMut.isPending ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={closeDialog}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteUid != null} onOpenChange={(open) => !open && setDeleteUid(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this scrape?</AlertDialogTitle>
            <AlertDialogDescription>
              The schedule will stop. Existing imported leads are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={deleteMut.isPending}
              onClick={() => deleteUid != null && deleteMut.mutate(deleteUid)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Team-member or branch assignment controls shared by Add scrape, preview, and Edit. */
type AssignmentFieldsProps = {
  form: JobFormState;
  setForm: Dispatch<SetStateAction<JobFormState>>;
  branches: Array<{ uid: number; name?: string; alias?: string | null }>;
  teamUsers: UserListItem[];
  assigneeSearch: string;
  setAssigneeSearch: (value: string) => void;
  isAssigneeSearchLoading: boolean;
  branchPoolLoading: boolean;
  branchPoolEmpty: boolean;
};

function AssignmentFields({
  form,
  setForm,
  branches,
  teamUsers,
  assigneeSearch,
  setAssigneeSearch,
  isAssigneeSearchLoading,
  branchPoolLoading,
  branchPoolEmpty,
}: AssignmentFieldsProps) {
  let assigneesSummary = 'Leave empty to assign among active users on your branch.';
  if (form.assignmentMode === 'branch') {
    assigneesSummary = 'Least-loaded among active users in the selected branches.';
  } else if (form.assignedUserIds.length > 0) {
    assigneesSummary = 'Least-loaded among the selected people.';
  }

  return (
    <>
      <div className="grid gap-3">
        <Label>Assignment</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={form.assignmentMode === 'users' ? 'default' : 'outline'}
            className={
              form.assignmentMode === 'users'
                ? 'border-0 bg-purple-600 text-white hover:bg-purple-700'
                : ''
            }
            onClick={() => setForm((s) => ({ ...s, assignmentMode: 'users' }))}
          >
            <Users className="mr-1.5 size-4" />
            Selected team members
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form.assignmentMode === 'branch' ? 'default' : 'outline'}
            className={
              form.assignmentMode === 'branch'
                ? 'border-0 bg-purple-600 text-white hover:bg-purple-700'
                : ''
            }
            onClick={() => setForm((s) => ({ ...s, assignmentMode: 'branch' }))}
          >
            <Building2 className="mr-1.5 size-4" />
            Assign by branch
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{assigneesSummary}</p>
      </div>
      {form.assignmentMode === 'branch' ? (
        <div className="grid gap-2">
          {branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No branches available for this organization.
            </p>
          ) : (
            <ScrollArea className="h-[min(180px,28vh)] rounded-md border border-input">
              <div className="space-y-0 p-2">
                {branches.map((b) => (
                  <label
                    key={b.uid}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                  >
                    <Checkbox
                      checked={form.targetBranchIds.includes(b.uid)}
                      onCheckedChange={() =>
                        setForm((s) => ({
                          ...s,
                          targetBranchIds: s.targetBranchIds.includes(b.uid)
                            ? s.targetBranchIds.filter((id) => id !== b.uid)
                            : [...s.targetBranchIds, b.uid],
                        }))
                      }
                    />
                    <span className="text-sm">{getBranchDisplayLabel(b) || 'Branch'}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}
          {branchPoolLoading ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 shrink-0 animate-spin" aria-hidden />
              Loading teams for selected branches…
            </p>
          ) : branchPoolEmpty ? (
            <p className="text-xs text-destructive">
              No active users in the selected branches—choose different branches or use team member
              selection.
            </p>
          ) : null}
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
          <ScrollArea className="h-[min(180px,28vh)] rounded-md border border-input">
            <div className="space-y-0 p-2">
              {isAssigneeSearchLoading && teamUsers.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">Searching…</p>
              ) : (
                teamUsers.map((u: UserListItem) => {
                  const fullName =
                    [u.name, u.surname].filter(Boolean).join(' ').trim() ||
                    u.email ||
                    `User ${u.uid}`;
                  return (
                    <label
                      key={u.uid}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted"
                    >
                      <Checkbox
                        checked={form.assignedUserIds.includes(u.uid)}
                        onCheckedChange={() =>
                          setForm((s) => ({
                            ...s,
                            assignedUserIds: s.assignedUserIds.includes(u.uid)
                              ? s.assignedUserIds.filter((id) => id !== u.uid)
                              : [...s.assignedUserIds, u.uid],
                          }))
                        }
                      />
                      <Avatar className="size-6 shrink-0">
                        <AvatarImage src={u.photoURL ?? u.avatar ?? undefined} alt={fullName} />
                        <AvatarFallback className="text-xs">
                          {fullName.slice(0, 2).toUpperCase()}
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
    </>
  );
}
