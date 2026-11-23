'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Search } from 'lucide-react';
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
import {
  readStoredPageSize,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';
import { ProductFormDialog } from '@/app/products/product-form-dialog';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import {
  ListViewToggle,
  StandardEntityCard,
  StandardEntityGrid,
  StandardListPagination,
  type StandardListViewMode,
} from '@/components/standard-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessProductsAdmin } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import {
  emptyProductForm,
  formToProductPayload,
  isErpCatalogueProduct,
  productToForm,
  type ProductFormValues,
} from '@/lib/product-admin-form';
import { DEFAULT_PRODUCT_IMAGE_URL, getProductImageUri } from '@/lib/product-display';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_KEY = 'loro:products-page-size';

function ProductThumb({ product, className }: { product: StaffProduct; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? DEFAULT_PRODUCT_IMAGE_URL : getProductImageUri(product.imageUrl, product);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote product CDN URLs vary by org
    <img
      src={src}
      alt=""
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export function ProductsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredPageSize(PAGE_SIZE_KEY));
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'erp' | 'loro'>('all');
  const [viewMode, setViewMode] = useState<StandardListViewMode>('list');
  const [editingUid, setEditingUid] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<ProductFormValues>(emptyProductForm);
  const list = useQuery({
    queryKey: ['products', 'admin', page, pageSize, debouncedSearch],
    queryFn: () => listStaffProducts(client, { page, limit: pageSize, search: debouncedSearch || undefined }),
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
  const allRows = list.data?.rows ?? [];
  const rows =
    sourceFilter === 'all'
      ? allRows
      : allRows.filter((row) => {
          const erp = isErpCatalogueProduct(row);
          return sourceFilter === 'erp' ? erp : !erp;
        });
  const meta = list.data?.meta;
  const total = meta?.total ?? rows.length;
  const totalPages = Math.max(meta?.totalPages ?? 1, 1);

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

  if (ready && !canAccessProductsAdmin(backendUserData?.accessLevel)) {
    return <FeatureDenied title={t('pages.products.title')} />;
  }

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

  function handlePageSizeChange(size: VisitsPageSize) {
    setPageSize(size);
    setPage(1);
    try {
      localStorage.setItem(PAGE_SIZE_KEY, String(size));
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <FeatureShell
        tourId="products"
        title={t('pages.products.title')}
        description={t('pages.products.description')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const updates = rows
                  .filter((row) => row.uid != null)
                  .slice(0, 20)
                  .map((row) => ({ ref: row.uid!, data: { price: Number(row.price) || 0 } }));
                void bulkUpdateProducts(client, updates).then(
                  () => toast.success('Bulk edit saved'),
                  (error: unknown) => toast.error(getQueryErrorMessage(error, 'Bulk edit failed')),
                );
              }}
            >
              Save current prices
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              New product
            </Button>
          </>
        }
        filters={
          <>
            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                if (value === 'all' || value === 'erp' || value === 'loro') setSourceFilter(value);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('tables.source')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="erp">ERP</SelectItem>
                <SelectItem value="loro">LORO</SelectItem>
              </SelectContent>
            </Select>
            <ListViewToggle value={viewMode} onChange={setViewMode} />
          </>
        }
        search={
          <div className="relative w-56">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
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
        {viewMode === 'list' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14" />
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
                  <TableRow
                    key={row.uid ?? row.productRef ?? row.name}
                    className="cursor-pointer"
                    onClick={() => openEdit(row)}
                  >
                    <TableCell>
                      <ProductThumb
                        product={row}
                        className="size-10 rounded-md border border-border object-cover bg-muted"
                      />
                    </TableCell>
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
        ) : (
          <StandardEntityGrid
            dataTour="products-grid"
            className="sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {rows.map((row) => {
              const erp = isErpCatalogueProduct(row);
              return (
                <StandardEntityCard
                  key={row.uid ?? row.productRef ?? row.name}
                  onClick={() => openEdit(row)}
                >
                  <ProductThumb
                    product={row}
                    className="h-36 w-full rounded-md border border-border object-cover bg-muted"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{row.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {row.sku ?? '—'} · {row.category ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={erp ? 'secondary' : 'outline'}>{erp ? 'ERP' : 'LORO'}</Badge>
                    <span className="text-sm font-medium text-foreground">{row.price ?? '—'}</span>
                  </div>
                </StandardEntityCard>
              );
            })}
          </StandardEntityGrid>
        )}
        <StandardListPagination
          page={meta?.page ?? page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          isFetching={list.isFetching && !list.isLoading}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          dataTour="products-pagination"
          className="rounded-lg border border-border"
        />
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
