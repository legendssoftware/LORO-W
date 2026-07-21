'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarDays, Search } from 'lucide-react';
import { Loader2Icon } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePlanClientVisitsMutation } from '@/api/hooks/use-plan-client-visits';
import { useUserVisitPlanSchedules } from '@/api/hooks/use-user-visit-plan-schedules';
import {
  VISIT_DAY_OPTIONS,
  VISIT_DAY_PRESETS,
  computeVisitBatchPreviews,
  type VisitBatchPreviewClient,
} from '@/lib/visit-planning/compute-visit-batches';
import { deriveVisitPlanDefaultsFromActiveSchedule } from '@/lib/visit-planning/derive-visit-plan-defaults';

export interface PlanClientVisitsClient {
  uid: number;
  name?: string | null;
  erpClientCode?: string | null;
  clientCode?: string | null;
  code?: string | null;
  email?: string | null;
  contactPerson?: string | null;
}

export interface PlanClientVisitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRef: string | number;
  assignedClientIds: number[];
  clients: PlanClientVisitsClient[];
  onClientsAssigned?: (clientIds: number[]) => void;
}

function getClientCode(client: PlanClientVisitsClient): string | null {
  const code =
    client.erpClientCode?.trim() ||
    client.clientCode?.trim() ||
    client.code?.trim() ||
    null;
  return code || null;
}

function formatClientLabel(client: PlanClientVisitsClient): string {
  const name = client.name?.trim() || `Client ${client.uid}`;
  const code = getClientCode(client);
  return code ? `(${code}) ${name}` : name;
}

function clientMatchesSearch(client: PlanClientVisitsClient, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    client.name,
    client.email,
    client.contactPerson,
    String(client.uid),
    getClientCode(client),
  ]
    .filter((x) => x != null && String(x).trim() !== '')
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function PlanClientVisitsDialog({
  open,
  onOpenChange,
  userRef,
  assignedClientIds,
  clients,
  onClientsAssigned,
}: PlanClientVisitsDialogProps) {
  const planMutation = usePlanClientVisitsMutation(userRef);
  const { data: activeSchedules, isLoading: activeSchedulesLoading } =
    useUserVisitPlanSchedules(userRef);

  const [startDate, setStartDate] = useState<string | null>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [visitDaysOfWeek, setVisitDaysOfWeek] = useState<number[]>([2]);
  const [batchSize, setBatchSize] = useState('10');
  const [selectedClientIds, setSelectedClientIds] = useState<number[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [defaultsReady, setDefaultsReady] = useState(false);
  const [hasActivePlanDefaults, setHasActivePlanDefaults] = useState(false);

  useEffect(() => {
    if (!open) {
      setDefaultsReady(false);
      setHasActivePlanDefaults(false);
      return;
    }
    if (activeSchedulesLoading) return;

    const defaults = deriveVisitPlanDefaultsFromActiveSchedule(
      activeSchedules?.slots ?? [],
      assignedClientIds
    );

    setStartDate(defaults.startDate);
    setVisitDaysOfWeek(defaults.visitDaysOfWeek);
    setBatchSize(String(defaults.batchSize));
    setSelectedClientIds(defaults.selectedClientIds);
    setClientSearch('');
    setHasActivePlanDefaults(defaults.hasActivePlan);
    setDefaultsReady(true);
  }, [open, activeSchedulesLoading, activeSchedules?.slots, assignedClientIds]);

  const filteredClients = useMemo(
    () =>
      [...clients]
        .filter((c) => clientMatchesSearch(c, clientSearch))
        .sort((a, b) =>
          formatClientLabel(a).localeCompare(formatClientLabel(b))
        ),
    [clients, clientSearch]
  );

  const allFilteredSelected =
    filteredClients.length > 0 &&
    filteredClients.every((c) => selectedClientIds.includes(c.uid));

  const someFilteredSelected =
    filteredClients.some((c) => selectedClientIds.includes(c.uid)) &&
    !allFilteredSelected;

  const previewClients = useMemo((): VisitBatchPreviewClient[] => {
    return selectedClientIds
      .map((uid) => {
        const client = clients.find((c) => c.uid === uid);
        return {
          uid,
          name: client ? formatClientLabel(client) : `Client ${uid}`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedClientIds, clients]);

  const parsedBatchSize = Math.min(
    50,
    Math.max(1, Number.parseInt(batchSize, 10) || 10)
  );

  const batchPreviews = useMemo(() => {
    if (!startDate || visitDaysOfWeek.length === 0) return [];
    return computeVisitBatchPreviews(
      previewClients,
      startDate,
      visitDaysOfWeek,
      parsedBatchSize
    );
  }, [previewClients, startDate, visitDaysOfWeek, parsedBatchSize]);

  function toggleVisitDay(day: number, checked: boolean) {
    setVisitDaysOfWeek((current) => {
      if (checked) {
        return [...new Set([...current, day])].sort((a, b) => a - b);
      }
      return current.filter((d) => d !== day);
    });
  }

  function toggleSelectAllFiltered(checked: boolean) {
    if (checked) {
      setSelectedClientIds((current) => [
        ...new Set([...current, ...filteredClients.map((c) => c.uid)]),
      ]);
      return;
    }
    const filteredIds = new Set(filteredClients.map((c) => c.uid));
    setSelectedClientIds((current) =>
      current.filter((id) => !filteredIds.has(id))
    );
  }

  function toggleClient(uid: number, checked: boolean) {
    setSelectedClientIds((current) => {
      if (checked) return [...new Set([...current, uid])];
      return current.filter((id) => id !== uid);
    });
  }

  async function handleGeneratePlan() {
    if (!startDate) {
      toast.error('Choose a start date.');
      return;
    }
    if (visitDaysOfWeek.length === 0) {
      toast.error('Select at least one visit day.');
      return;
    }
    if (selectedClientIds.length === 0) {
      toast.error('Select at least one client.');
      return;
    }

    try {
      const result = await planMutation.mutateAsync({
        startDate,
        visitDaysOfWeek,
        batchSize: parsedBatchSize,
        clientIds: selectedClientIds,
      });

      const totalTasks = result.batches.reduce(
        (sum, batch) => sum + batch.tasksCreated,
        0
      );

      const assignedCount = result.newlyAssignedClientIds?.length ?? 0;
      const assignedNote =
        assignedCount > 0
          ? ` ${assignedCount} client(s) assigned to this user.`
          : '';

      toast.success(
        `Visit plan created: ${result.batches.length} batch(es), ${totalTasks} task(s).${assignedNote}`
      );

      if (onClientsAssigned) {
        onClientsAssigned([
          ...new Set([...assignedClientIds, ...selectedClientIds]),
        ]);
      }

      if (result.warnings?.length) {
        result.warnings.forEach((warning) =>
          toast.error(warning, { duration: 6000 })
        );
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create visit plan');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[80vw] max-w-[80vw] sm:max-w-[80vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Plan client visits
          </DialogTitle>
          <DialogDescription>
            {hasActivePlanDefaults
              ? 'Pre-filled from the active visit schedule. Adjust days, clients, or batch size, then generate to create additional visits.'
              : 'Choose visit days and clients. Clients are split into batches per day slot, scheduled chronologically from the start date. Clients not yet assigned to this user are assigned automatically when you generate the plan.'}
          </DialogDescription>
        </DialogHeader>

        {!defaultsReady ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            Loading current plan settings…
          </div>
        ) : (
        <>
        <div className="grid gap-6 py-2 sm:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Start date</Label>
              <DatePickerField
                value={startDate}
                onChange={setStartDate}
                placeholder={
                  hasActivePlanDefaults && startDate
                    ? startDate
                    : 'Pick start date'
                }
              />
              <p className="text-xs text-muted-foreground">
                Anchor date — the first slot lands on the first selected weekday
                on or after this date.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Visit days</Label>
              <div className="flex flex-wrap gap-2">
                {VISIT_DAY_OPTIONS.map((option) => {
                  const checked = visitDaysOfWeek.includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                        checked
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleVisitDay(option.value, value === true)
                        }
                      />
                      {option.shortLabel}
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setVisitDaysOfWeek([...VISIT_DAY_PRESETS.weekdays])
                  }
                >
                  Mon–Fri
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisitDaysOfWeek([...VISIT_DAY_PRESETS.monTue])}
                >
                  Mon + Tue
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisitDaysOfWeek([])}
                >
                  Clear
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batch-size">Clients per visit day</Label>
              <Input
                id="batch-size"
                type="number"
                min={1}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                placeholder={
                  hasActivePlanDefaults ? String(parsedBatchSize) : '10'
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label>Clients</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedClientIds.length} of {clients.length} selected
                </span>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder={
                    hasActivePlanDefaults
                      ? `Search ${selectedClientIds.length} scheduled client(s)…`
                      : 'Search clients…'
                  }
                  className="pl-9"
                />
              </div>

              <div className="rounded-md border">
                <label className="flex cursor-pointer items-center gap-2 border-b px-3 py-2 text-sm font-medium hover:bg-muted">
                  <Checkbox
                    checked={
                      allFilteredSelected
                        ? true
                        : someFilteredSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      toggleSelectAllFiltered(checked === true)
                    }
                  />
                  Select all
                  {clientSearch.trim() ? ` (${filteredClients.length} shown)` : ''}
                </label>
                <div className="max-h-48 overflow-y-auto p-2">
                  {filteredClients.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No clients found.
                    </p>
                  ) : (
                    filteredClients.map((client) => {
                      const selected = selectedClientIds.includes(client.uid);
                      const isAssigned = assignedClientIds.includes(client.uid);
                      return (
                        <label
                          key={client.uid}
                          className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted"
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              toggleClient(client.uid, checked === true)
                            }
                            className="mt-0.5"
                          />
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            {formatClientLabel(client)}
                            {!isAssigned && selected && (
                              <span className="ml-1 text-xs text-muted-foreground">
                                (will assign)
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {selectedClientIds.length > 0 && (
                <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                  {selectedClientIds.map((uid) => {
                    const client = clients.find((c) => c.uid === uid);
                    return (
                      <Badge
                        key={uid}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleClient(uid, false)}
                      >
                        {client ? formatClientLabel(client) : uid} ×
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {batchPreviews.length > 0 && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {hasActivePlanDefaults ? 'Preview (from current plan)' : 'Preview'}
                </p>
                <div className="max-h-52 space-y-3 overflow-y-auto">
                  {batchPreviews.map((batch) => (
                    <div key={batch.batchIndex} className="text-sm">
                      <p className="font-medium">
                        Batch {batch.batchIndex + 1} — {batch.visitDateLabel} (
                        {batch.clients.length} client
                        {batch.clients.length === 1 ? '' : 's'})
                      </p>
                      <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                        {batch.clients.map((c) => (
                          <li key={c.uid}>{c.name}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              planMutation.isPending ||
              selectedClientIds.length === 0 ||
              visitDaysOfWeek.length === 0
            }
            onClick={handleGeneratePlan}
          >
            {planMutation.isPending ? (
              <>
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate plan'
            )}
          </Button>
        </DialogFooter>
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}
