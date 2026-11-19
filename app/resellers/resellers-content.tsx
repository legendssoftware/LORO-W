'use client';

import { useState } from 'react';
import { Plus, Store } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { archiveReseller, getResellers, restoreReseller, saveReseller, type ResellerRecord } from '@/api/endpoints/resellers';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconField, IconInput } from '@/components/icon-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessResellers } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

function asRows(payload: unknown): ResellerRecord[] {
  if (Array.isArray(payload)) return payload as ResellerRecord[];
  if (payload && typeof payload === 'object') {
    const record = payload as { data?: ResellerRecord[]; resellers?: ResellerRecord[] };
    return record.data ?? record.resellers ?? [];
  }
  return [];
}

export function ResellersContent() {
  const { t } = useTranslation('screens');
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
  if (ready && !canAccessResellers(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.resellers.title')} />;
  return (
    <>
      <FeatureShell tourId="resellers" title={t('pages.resellers.title')} description={t('pages.resellers.description')} actions={<Button type="button" onClick={() => { setSelected({ name: '' }); setName(''); }}><Plus className="size-4" aria-hidden />New reseller</Button>} isLoading={!ready || list.isLoading} isError={list.isError} error={list.error} onRetry={() => void list.refetch()} isEmpty={rows.length === 0 && selected == null} emptyMessage="No resellers yet.">
        <Table>
          <TableHeader><TableRow><TableHead>{t('tables.name')}</TableHead><TableHead>{t('tables.email')}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref ?? row.name} className="cursor-pointer" onClick={() => { setSelected(row); setName(row.name); }}>
                <TableCell>
                  <span className="flex items-center gap-2"><Store className="size-4 text-muted-foreground" aria-hidden />{row.name}</span>
                </TableCell>
                <TableCell>{row.email ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reseller</DialogTitle></DialogHeader>
          <IconField icon={Store} label="Name">
            <IconInput icon={Store} value={name} onChange={(event) => setName(event.target.value)} placeholder="Reseller name" />
          </IconField>
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
