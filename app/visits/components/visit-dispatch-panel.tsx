'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useApiClient, useCheckInsDispatchSummary, useSessionSync } from '@/api/hooks';
import { convertCheckInToLead, draftCheckInNote } from '@/api/endpoints/check-ins';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

/**
 * Planned versus completed visit plans, plus note draft and convert-to-lead.
 */
export function VisitDispatchPanel({ from, to }: { from: string; to: string }) {
  const client = useApiClient();
  const { backendUserData } = useSessionSync();
  const level = (backendUserData?.accessLevel ?? '').toLowerCase();
  const canConvert = level === 'admin' || level === 'manager' || level === 'owner' || level === 'user' || level === 'member';
  const summaryQuery = useCheckInsDispatchSummary({ from, to });
  const [checkInId, setCheckInId] = useState('');
  const [note, setNote] = useState('');

  const draft = useMutation({
    mutationFn: (id: number) => draftCheckInNote(client, id),
    onSuccess: (result) => {
      setNote(result.note);
      toast.success(result.source === 'fallback' ? 'Drafted a fallback note' : 'Visit note drafted');
    },
    onError: (error) => toast.error(getQueryErrorMessage(error, 'Could not draft a note')),
  });
  const convert = useMutation({
    mutationFn: (id: number) => convertCheckInToLead(client, id),
    onSuccess: (result) => toast.success(result.lead?.name ? `Lead created: ${result.lead.name}` : 'Check-in converted to a lead'),
    onError: (error) => toast.error(getQueryErrorMessage(error, 'Could not convert this check-in')),
  });

  const summary = summaryQuery.data;
  const id = Number(checkInId);

  return (
    <section className="mb-4 rounded-lg border px-4 py-3">
      <h2 className="text-sm font-medium">Dispatch</h2>
      {summaryQuery.isError ? (
        <QueryErrorBanner
          className="mt-2"
          message={getQueryErrorMessage(summaryQuery.error, 'Could not load the dispatch summary')}
          onRetry={() => void summaryQuery.refetch()}
        />
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {summary
            ? `${format(new Date(from), 'd MMM')}–${format(new Date(to), 'd MMM')}: ${summary.planned} planned, ${summary.completed} completed, ${summary.inProgress} in progress.`
            : 'Loading planned and completed visits…'}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={checkInId}
          onChange={(event) => setCheckInId(event.target.value)}
          placeholder="Check-in id"
          className="h-8 w-36"
        />
        <Button type="button" size="sm" variant="outline" disabled={!id || draft.isPending} onClick={() => draft.mutate(id)}>
          Draft note
        </Button>
        {canConvert ? (
          <Button type="button" size="sm" disabled={!id || convert.isPending} onClick={() => convert.mutate(id)}>
            Convert to lead
          </Button>
        ) : null}
      </div>
      {note ? <p className="mt-2 text-sm">{note}</p> : null}
    </section>
  );
}
