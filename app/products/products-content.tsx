'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import {
  archiveStaffProduct,
  bulkUpdateProducts,
  listStaffProducts,
  restoreStaffProduct,
  saveStaffProduct,
  type StaffProduct,
} from '@/api/endpoints/products-admin';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessProductsAdmin } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function ProductsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['products', 'admin'], queryFn: () => listStaffProducts(client), enabled: ready });
  const save = useMutation({
    mutationFn: (payload: Parameters<typeof saveStaffProduct>[1]) => saveStaffProduct(client, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'admin'] }),
  });
  const [selected, setSelected] = useState<StaffProduct | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('0');
  const rows = list.data ?? [];

  if (ready && !canAccessProductsAdmin(backendUserData?.accessLevel)) return <FeatureDenied title="Products" />;

  return (
    <>
      <FeatureShell
        tourId="products"
        title="Products"
        description="Create, edit, archive, and restore catalogue products."
        actions={<Button type="button" onClick={() => { setSelected({ name: '' }); setName(''); setPrice('0'); }}>New product</Button>}
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0 && selected == null}
        emptyMessage="No products in the catalogue."
      >
        <div className="mb-3">
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const updates = rows.filter((row) => row.ref).slice(0, 20).map((row) => ({ ref: row.ref!, data: { price: row.price } }));
            void bulkUpdateProducts(client, updates).then(() => toast.success('Bulk edit saved'), (error: unknown) => toast.error(getQueryErrorMessage(error, 'Bulk edit failed')));
          }}>Save current prices</Button>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>SKU</TableHead><TableHead>Price</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref ?? row.name} className="cursor-pointer" onClick={() => { setSelected(row); setName(row.name); setPrice(String(row.price ?? 0)); }}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.sku ?? '—'}</TableCell>
                <TableCell>{row.price ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{selected?.ref ? 'Edit product' : 'New product'}</DialogTitle></DialogHeader>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" />
          <Input value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Price" />
          <DialogFooter>
            {selected?.ref ? (
              <>
                <Button type="button" variant="outline" onClick={() => void archiveStaffProduct(client, selected.ref!).then(() => { toast.success('Archived'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['products', 'admin'] }); })}>Archive</Button>
                <Button type="button" variant="outline" onClick={() => void restoreStaffProduct(client, selected.ref!).then(() => toast.success('Restored'))}>Restore</Button>
              </>
            ) : null}
            <Button type="button" onClick={() => {
              const sku = selected?.sku || name.trim().toLowerCase().replace(/\s+/g, '-');
              void save.mutateAsync({
                ref: selected?.ref,
                name: name.trim(),
                category: selected?.category || 'GENERAL',
                price: Number(price) || 0,
                sku,
                barcode: selected?.barcode || sku,
              }).then(() => { toast.success('Product saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')));
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
