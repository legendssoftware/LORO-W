'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { CalendarDays } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlanClientVisitsMutation } from '@/api/hooks/use-plan-client-visits';
import {
  VISIT_DAY_OPTIONS,
  computeVisitBatchPreviews,
  type VisitBatchPreviewClient,
} from '@/lib/visit-planning/compute-visit-batches';

export interface PlanClientVisitsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userRef: string | number;
  assignedClientIds: number[];
  clients: { uid: number; name?: string | null }[];
}

export function PlanClientVisitsDialog({
  open,
  onOpenChange,
  userRef,
  assignedClientIds,
  clients,
}: PlanClientVisitsDialogProps) {
  const planMutation = usePlanClientVisitsMutation(userRef);
  const [startDate, setStartDate] = useState<string | null>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [visitDayOfWeek, setVisitDayOfWeek] = useState('2');
  const [batchSize, setBatchSize] = useState('10');

  const previewClients = useMemo((): VisitBatchPreviewClient[] => {
    return assignedClientIds
      .map((uid) => {
        const client = clients.find((c) => c.uid === uid);
        return {
          uid,
          name: client?.name?.trim() || `Client ${uid}`,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedClientIds, clients]);

  const parsedBatchSize = Math.min(
    50,
    Math.max(1, Number.parseInt(batchSize, 10) || 10)
  );

  const batchPreviews = useMemo(() => {
    if (!startDate) return [];
    return computeVisitBatchPreviews(
      previewClients,
      startDate,
      Number.parseInt(visitDayOfWeek, 10),
      parsedBatchSize
    );
  }, [previewClients, startDate, visitDayOfWeek, parsedBatchSize]);

  async function handleGeneratePlan() {
    if (!startDate) {
      toast.error('Choose a start date.');
      return;
    }
    if (assignedClientIds.length === 0) {
      toast.error('Assign at least one client before planning visits.');
      return;
    }

    try {
      const result = await planMutation.mutateAsync({
        startDate,
        visitDayOfWeek: Number.parseInt(visitDayOfWeek, 10),
        batchSize: parsedBatchSize,
        clientIds: assignedClientIds,
      });

      const totalTasks = result.batches.reduce(
        (sum, batch) => sum + batch.tasksCreated,
        0
      );
      toast.success(
        `Visit plan created: ${result.batches.length} batch(es), ${totalTasks} task(s).`
      );

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="size-5" />
            Plan client visits
          </DialogTitle>
          <DialogDescription>
            Split assigned clients into weekly batches. Visits are scheduled on the
            chosen day of week, starting from the first occurrence on or after the
            start date.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Start date</Label>
            <DatePickerField
              value={startDate}
              onChange={setStartDate}
              placeholder="Pick start date"
            />
            <p className="text-xs text-muted-foreground">
              Anchor date — batch 1 lands on the first visit day on or after this date.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Visit day of week</Label>
            <Select value={visitDayOfWeek} onValueChange={setVisitDayOfWeek}>
              <SelectTrigger>
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                {VISIT_DAY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            />
          </div>

          {batchPreviews.length > 0 && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">Preview</p>
              <div className="space-y-3 max-h-52 overflow-y-auto">
                {batchPreviews.map((batch) => (
                  <div key={batch.batchIndex} className="text-sm">
                    <p className="font-medium">
                      Batch {batch.batchIndex + 1} — {batch.visitDateLabel} (
                      {batch.clients.length} client
                      {batch.clients.length === 1 ? '' : 's'})
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {batch.clients.map((c) => c.name).join(', ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={planMutation.isPending || assignedClientIds.length === 0}
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
      </DialogContent>
    </Dialog>
  );
}
