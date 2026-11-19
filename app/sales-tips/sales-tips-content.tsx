'use client';

import { useState } from 'react';
import { Lightbulb, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { deleteSalesTip, getSalesTips, saveSalesTip, type SalesTip } from '@/api/endpoints/sales-tips';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { IconField, IconInput, IconTextarea } from '@/components/icon-field';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canManageSalesTips } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function SalesTipsContent() {
  const { t } = useTranslation('screens');
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
  if (ready && !canManageSalesTips(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.salesTips.title')} />;
  return (
    <>
      <FeatureShell tourId="sales-tips" title={t('pages.salesTips.title')} description={t('pages.salesTips.description')} actions={<Button type="button" onClick={() => { setSelected({}); setTitle(''); setContent(''); }}><Plus className="size-4" aria-hidden />New tip</Button>} isLoading={!ready || list.isLoading} isError={list.isError} error={list.error} onRetry={() => void list.refetch()} isEmpty={rows.length === 0 && selected == null} emptyMessage="No sales tips.">
        <Table>
          <TableHeader><TableRow><TableHead>{t('tables.title')}</TableHead><TableHead>{t('tables.category')}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id ?? row.title} className="cursor-pointer" onClick={() => { setSelected(row); setTitle(row.title ?? ''); setContent(row.content ?? ''); }}>
                <TableCell>
                  <span className="flex items-center gap-2"><Lightbulb className="size-4 text-muted-foreground" aria-hidden />{row.title}</span>
                </TableCell>
                <TableCell>{row.category ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Sales tip</DialogTitle></DialogHeader>
          <IconField icon={Lightbulb} label="Title">
            <IconInput icon={Lightbulb} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tip title" />
          </IconField>
          <IconField icon={Lightbulb} label="Tip">
            <IconTextarea icon={Lightbulb} value={content} onChange={(event) => setContent(event.target.value)} placeholder="The advice to show" />
          </IconField>
          <DialogFooter>
            {selected?.id ? <Button type="button" variant="destructive" onClick={() => void deleteSalesTip(client, Number(selected.id)).then(() => { toast.success('Removed'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['sales-tips'] }); })}>Delete</Button> : null}
            <Button type="button" onClick={() => void save.mutateAsync({ id: selected?.id ? Number(selected.id) : undefined, title, content, category: selected?.category || 'Mindset & Preparation' }).then(() => { toast.success('Saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')))}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
