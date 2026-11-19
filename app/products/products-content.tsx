'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Package, Plus, Search } from 'lucide-react';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import {
  archiveStaffProduct,
  bulkUpdateProducts,
  getStaffProduct,
  listStaffProducts,
  restoreStaffProduct,
  saveStaffProduct,
  type StaffProduct,
} from '@/api/endpoints/products-admin';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { ProductFormDialog } from '@/app/products/product-form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { filterToolbarSearchInputClassName } from '@/components/ui/input';
import { canAccessProductsAdmin } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  emptyProductForm,
  formToProductPayload,
  isErpCatalogueProduct,
  productToForm,
  type ProductFormValues,
} from '@/lib/product-admin-form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 50;

export function ProductsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editingUid, setEditingUid] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const list = useQuery({
    queryKey: ['products', 'admin', page, debouncedSearch],
    queryFn: () => listStaffProducts(client, { page, limit: PAGE_SIZE, search: debouncedSearch || undefined }),
    enabled: ready,
  });
  const detail = useQuery({
    queryKey: ['products', 'admin', 'detail', editingUid],
    queryFn: () => getStaffProduct(client, editingUid!),
    enabled: ready && editingUid != null,
  });
  const save = useMutation({
    mutationFn: (payload: Parameters<typeof saveStaffProduct>[1]) => saveStaffProduct(client, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', 'admin'] }),
  });
  const rows = list.data?.rows ?? [];
  const meta = list.data?.meta;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (detail.data) setValues(productToForm(detail.data));
  }, [detail.data]);

  if (ready && !canAccessProductsAdmin(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.products.title')} />;

  function openCreate() {
    setEditingUid(null);
    setValues(emptyProductForm());
    setOpen(true);
  }

  function openEdit(row: StaffProduct) {
    setValues(productToForm(row));
    setEditingUid(row.uid ?? null);
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingUid(null);
  }

  return (
    <>
      <FeatureShell
        tourId="products"
        title={t('pages.products.title')}
        description={t('pages.products.description')}
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              const updates = rows
                .filter((row) => row.uid != null)
                .slice(0, 20)
                .map((row) => ({ ref: row.uid!, data: { price: Number(row.price) || 0 } }));
              void bulkUpdateProducts(client, updates).then(
                () => toast.success('Bulk edit saved'),
                (error: unknown) => toast.error(getQueryErrorMessage(error, 'Bulk edit failed')),
              );
            }}>Save current prices</Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              New product
            </Button>
          </>
        }
        search={
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('forms.products.search')}
              aria-label={t('forms.products.search')}
              className={`${filterToolbarSearchInputClassName} pl-8`}
            />
          </div>
        }
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0 && page <= 1}
        emptyMessage={debouncedSearch ? 'No products match that search.' : 'No products in the catalogue.'}
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tables.name')}</TableHead>
              <TableHead>{t('tables.sku')}</TableHead>
              <TableHead>{t('tables.category')}</TableHead>
              <TableHead>{t('tables.source')}</TableHead>
              <TableHead>{t('tables.price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const erp = isErpCatalogueProduct(row);
              return (
                <TableRow key={row.uid ?? row.productRef ?? row.name} className="cursor-pointer" onClick={() => openEdit(row)}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      {row.name}
                    </span>
                  </TableCell>
                  <TableCell>{row.sku ?? '—'}</TableCell>
                  <TableCell>{row.category ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={erp ? 'secondary' : 'outline'}>{erp ? 'ERP' : 'LORO'}</Badge>
                    {erp && row.productReferenceCode ? (
                      <span className="ml-2 text-xs text-muted-foreground">{row.productReferenceCode}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.price ?? '—'}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta?.page ?? page} of {Math.max(meta?.totalPages ?? 1, 1)} · {meta?.total ?? rows.length} products
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              <ChevronLeft className="size-4" aria-hidden />
              Prev
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= (meta?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </div>
      </FeatureShell>
      <ProductFormDialog
        open={open}
        title={editingUid ? 'Edit product' : 'New product'}
        values={values}
        saving={save.isPending || (editingUid != null && detail.isLoading)}
        canArchive={editingUid != null}
        onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onToggle={(key, value) => setValues((current) => ({ ...current, [key]: value }))}
        onClose={closeDialog}
        onSave={() => {
          void save.mutateAsync({ uid: editingUid ?? undefined, body: formToProductPayload(values) }).then(
            () => {
              toast.success('Product saved');
              closeDialog();
            },
            (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')),
          );
        }}
        onArchive={() => {
          if (editingUid == null) return;
          void archiveStaffProduct(client, editingUid).then(() => {
            toast.success('Archived');
            closeDialog();
            void queryClient.invalidateQueries({ queryKey: ['products', 'admin'] });
          });
        }}
        onRestore={() => {
          if (editingUid == null) return;
          void restoreStaffProduct(client, editingUid).then(() => toast.success('Restored'));
        }}
      />
    </>
  );
}
