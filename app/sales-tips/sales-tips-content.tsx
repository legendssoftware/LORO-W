'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { deleteSalesTip, getSalesTips, saveSalesTip, type SalesTip } from '@/api/endpoints/sales-tips';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canManageSalesTips } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function SalesTipsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['sales-tips'], queryFn: () => getSalesTips(client), enabled: ready });
  const save = useMutation({
    mutationFn: (tip: { id?: number; title: string; content: string; category: string }) => saveSalesTip(client, tip),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sales-tips'] }),
  });
  const [selected, setSelected] = useState<SalesTip | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const rows = list.data ?? [];
  if (ready && !canManageSalesTips(backendUserData?.accessLevel)) return <FeatureDenied title="Sales tips" />;
  return (
    <>
      <FeatureShell tourId="sales-tips" title="Sales tips" description="Edit the catalogue. Home still shows the tip of the day." actions={<Button type="button" onClick={() => { setSelected({}); setTitle(''); setContent(''); }}>New tip</Button>} isLoading={!ready || list.isLoading} isError={list.isError} error={list.error} onRetry={() => void list.refetch()} isEmpty={rows.length === 0 && selected == null} emptyMessage="No sales tips.">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id ?? row.title} className="cursor-pointer" onClick={() => { setSelected(row); setTitle(row.title ?? ''); setContent(row.content ?? ''); }}>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.category ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sales tip</DialogTitle></DialogHeader>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
          <DialogFooter>
            {selected?.id ? <Button type="button" variant="destructive" onClick={() => void deleteSalesTip(client, Number(selected.id)).then(() => { toast.success('Removed'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['sales-tips'] }); })}>Delete</Button> : null}
            <Button type="button" onClick={() => void save.mutateAsync({ id: selected?.id ? Number(selected.id) : undefined, title, content, category: selected?.category || 'Mindset & Preparation' }).then(() => { toast.success('Saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')))}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
