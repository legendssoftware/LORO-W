'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { archiveReseller, getResellers, restoreReseller, saveReseller, type ResellerRecord } from '@/api/endpoints/resellers';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessResellers } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

function asRows(payload: unknown): ResellerRecord[] {
  if (Array.isArray(payload)) return payload as ResellerRecord[];
  if (payload && typeof payload === 'object') {
    const record = payload as { data?: ResellerRecord[]; resellers?: ResellerRecord[] };
    return record.data ?? record.resellers ?? [];
  }
  return [];
}

export function ResellersContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['resellers'], queryFn: async () => asRows(await getResellers(client)), enabled: ready });
  const save = useMutation({
    mutationFn: (row: ResellerRecord) => saveReseller(client, row),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['resellers'] }),
  });
  const [selected, setSelected] = useState<ResellerRecord | null>(null);
  const [name, setName] = useState('');
  const rows = list.data ?? [];
  if (ready && !canAccessResellers(backendUserData?.accessLevel)) return <FeatureDenied title="Resellers" />;
  return (
    <>
      <FeatureShell tourId="resellers" title="Resellers" description="Add, edit, archive, and restore reseller records." actions={<Button type="button" onClick={() => { setSelected({ name: '' }); setName(''); }}>New reseller</Button>} isLoading={!ready || list.isLoading} isError={list.isError} error={list.error} onRetry={() => void list.refetch()} isEmpty={rows.length === 0 && selected == null} emptyMessage="No resellers yet.">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref ?? row.name} className="cursor-pointer" onClick={() => { setSelected(row); setName(row.name); }}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.email ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reseller</DialogTitle></DialogHeader>
          <Input value={name} onChange={(event) => setName(event.target.value)} />
          <DialogFooter>
            {selected?.ref ? (
              <>
                <Button type="button" variant="outline" onClick={() => void archiveReseller(client, selected.ref!).then(() => { toast.success('Archived'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['resellers'] }); })}>Archive</Button>
                <Button type="button" variant="outline" onClick={() => void restoreReseller(client, selected.ref!).then(() => toast.success('Restored'))}>Restore</Button>
              </>
            ) : null}
            <Button type="button" onClick={() => void save.mutateAsync({ ...selected, name }).then(() => { toast.success('Saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')))}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
