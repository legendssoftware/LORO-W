'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/api/hooks';
import {
  getMyCommunicationSchedules,
  updateCommunicationSchedule,
  deleteCommunicationSchedule,
  type CommunicationSchedule,
} from '@/api/endpoints/clients';
import {
  createInteraction,
  deleteInteraction,
  getInteractionsByClient,
  updateInteraction,
} from '@/api/endpoints/interactions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

/**
 * Client interactions feed and the communication schedules the signed-in user can edit.
 */
export function ClientActivityPanel({ clientRef }: { clientRef: number }) {
  const { t } = useTranslation('screens');
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const feed = useQuery({
    queryKey: ['interactions', 'client', clientRef],
    queryFn: () => getInteractionsByClient(client, clientRef),
  });
  const schedules = useQuery({
    queryKey: ['clients', 'schedules', clientRef],
    queryFn: () => getMyCommunicationSchedules(client, { clientId: clientRef, limit: 50 }),
  });

  const create = useMutation({
    mutationFn: (text: string) => createInteraction(client, { message: text, clientUid: clientRef, type: 'note' }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['interactions', 'client', clientRef] });
    },
  });
  const edit = useMutation({
    mutationFn: ({ ref, text }: { ref: number; text: string }) => updateInteraction(client, ref, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interactions', 'client', clientRef] }),
  });
  const remove = useMutation({
    mutationFn: (ref: number) => deleteInteraction(client, ref),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interactions', 'client', clientRef] }),
  });
  const saveSchedule = useMutation({
    mutationFn: (row: CommunicationSchedule) =>
      updateCommunicationSchedule(client, row.uid ?? row.id ?? 0, { isActive: row.isActive === false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', 'schedules', clientRef] }),
  });
  const dropSchedule = useMutation({
    mutationFn: (id: number) => deleteCommunicationSchedule(client, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', 'schedules', clientRef] }),
  });

  const rows = feed.data?.data ?? [];
  const scheduleRows = (schedules.data?.data ?? []).filter(
    (row) => row.clientId == null || row.clientId === clientRef
  );

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">{t('chrome.clients.interactions')}</h2>
        {feed.isError ? (
          <QueryErrorBanner className="mt-2" message={getQueryErrorMessage(feed.error)} onRetry={() => void feed.refetch()} />
        ) : feed.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading interactions…</p>
        ) : rows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('chrome.clients.noInteractions')}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {rows.map((row) => (
              <li key={row.uid} className="rounded border px-3 py-2 text-sm">
                <p>{row.message}</p>
                <div className="mt-2 flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => void edit.mutateAsync({ ref: row.uid, text: `${row.message} (edited)` })}>
                    Edit
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => void remove.mutateAsync(row.uid)}>
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Input value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('forms.clients.notePlaceholder')} />
          <Button
            type="button"
            disabled={!message.trim() || create.isPending}
            onClick={() => {
              void create.mutateAsync(message.trim()).catch((error: unknown) => {
                toast.error(getQueryErrorMessage(error, 'Could not add the note'));
              });
            }}
          >
            Add
          </Button>
        </div>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="text-sm font-medium">{t('chrome.clients.communicationSchedules')}</h2>
        {schedules.isError ? (
          <QueryErrorBanner className="mt-2" message={getQueryErrorMessage(schedules.error)} onRetry={() => void schedules.refetch()} />
        ) : schedules.isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading schedules…</p>
        ) : scheduleRows.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">{t('chrome.clients.noSchedules')}</p>
        ) : (
          <ul className="mt-2 space-y-2 text-sm">
            {scheduleRows.map((row) => {
              const id = row.uid ?? row.id ?? 0;
              return (
                <li key={id} className="flex items-center justify-between gap-2 rounded border px-3 py-2">
                  <span>{row.communicationType ?? 'Schedule'} · {row.frequency ?? '—'} · {row.isActive === false ? 'Paused' : 'Active'}</span>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => void saveSchedule.mutateAsync(row)}>Toggle</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => void dropSchedule.mutateAsync(id)}>Delete</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
