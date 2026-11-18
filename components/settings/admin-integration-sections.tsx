'use client';

import { useState } from 'react';
import { useApiClient } from '@/api/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function WebhooksSection() {
  const client = useApiClient();
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [rows, setRows] = useState<Array<{ uid?: number | string; url?: string }>>([]);
  function refresh() {
    void client.get('/webhooks/subscriptions').then(
      (res) => setRows(Array.isArray(res.data) ? res.data : res.data?.data ?? []),
      (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not list webhooks'))
    );
  }
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h2 className="text-lg font-medium">Outbound webhooks</h2>
      <div className="flex gap-2">
        <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/hooks" />
        <Button type="button" onClick={() => {
          void client.post('/webhooks/subscriptions', { url }).then(
            (res) => {
              const value = res.data?.secret ?? res.data?.signingSecret ?? res.data?.data?.secret;
              setSecret(value ? String(value) : 'Created. The server did not return a signing secret.');
              setUrl('');
              refresh();
            },
            (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not create the subscription'))
          );
        }}>Add</Button>
        <Button type="button" variant="outline" onClick={refresh}>Refresh</Button>
      </div>
      {secret ? <p className="rounded border bg-amber-50 p-3 text-sm">Signing secret (shown once): {secret}</p> : null}
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li key={String(row.uid ?? row.url)} className="flex items-center justify-between gap-2">
            <span>{row.url ?? row.uid}</span>
            {row.uid != null ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => {
                void client.delete(`/webhooks/subscriptions/${row.uid}`).then(() => refresh());
              }}>Delete</Button>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
