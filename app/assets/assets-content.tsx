'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import { useBranches } from '@/api/hooks/use-branches';
import { useSearchableUsersList } from '@/api/hooks/use-searchable-users-list';
import {
  useAsset,
  useAssetsPage,
  useCreateAssetMutation,
  useDeleteAssetMutation,
  useUpdateAssetMutation,
} from '@/api/hooks/use-assets';
import type { AssetCategory, AssetRecord, CreateAssetPayload, UpdateAssetPayload } from '@/api/types/asset';
import { LoadingSpinner } from '@/components/loading-spinner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { canManageOrgAssets } from '@/lib/access';
import { Plus } from 'lucide-react';
import { AssetCard, AssetCardSkeleton } from './components/asset-card';
import { AssetDetailDialog } from './components/asset-detail-dialog';
import { AssetFormDialog } from './components/asset-form-dialog';
import { AssetsFiltersBar } from './components/assets-filters-bar';
import { assetTitle, userOwnsAsset } from './lib/asset-display';
import {
  createDefaultListDateRange,
  listDateRangeQuery,
  type ListDateRangeValue,
} from '@/components/filters/list-date-range-filter';
import {
  readStoredPageSize,
  VisitsListPagination,
  type VisitsPageSize,
} from '@/app/visits/components/visits-list-pagination';

type AssetScope = 'mine' | 'org';
const SEARCH_DEBOUNCE_MS = 350;
const ASSETS_PAGE_SIZE_KEY = 'loro:assets-page-size';

export function AssetsContent({ initialAssetUid }: { initialAssetUid?: number }) {
  const router = useRouter();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const canManage = canManageOrgAssets(profile?.accessLevel);
  const accessLevel = profile?.accessLevel?.trim().toLowerCase() ?? '';
  const canAdd = accessLevel.length > 0 && accessLevel !== 'client';
  const [scope, setScope] = useState<AssetScope>('mine');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [dateRange, setDateRange] = useState<ListDateRangeValue>(createDefaultListDateRange);
  const [branchId, setBranchId] = useState('all');
  const [userUidFilter, setUserUidFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<VisitsPageSize>(() => readStoredPageSize(ASSETS_PAGE_SIZE_KEY));
  const [detail, setDetail] = useState<AssetRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formAsset, setFormAsset] = useState<AssetRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const branchesQuery = useBranches({ enabled: isTokenReady });
  const {
    users: pickerUsers,
    searchQuery: userSearchQuery,
    setSearchQuery: setUserSearchQuery,
    isSearchLoading: isUserSearchLoading,
    bindUidChange,
  } = useSearchableUsersList({ enabled: isTokenReady, limit: 100 });

  const dateQuery = listDateRangeQuery(dateRange);
  const ownerUid = userUidFilter === 'all' ? undefined : Number(userUidFilter);
  const branchUid = branchId === 'all' ? undefined : Number(branchId);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    category,
    scope,
    branchId,
    userUidFilter,
    dateQuery.startDate,
    dateQuery.endDate,
    pageSize,
  ]);

  const listQuery = useAssetsPage({
    scope: canManage && scope === 'org' ? 'org' : 'mine',
    userUid: profile?.uid,
    search: debouncedSearch,
    category,
    page,
    limit: pageSize,
    ownerUid: ownerUid != null && ownerUid > 0 ? ownerUid : undefined,
    branchUid: branchUid != null && branchUid > 0 ? branchUid : undefined,
    startDate: dateQuery.startDate,
    endDate: dateQuery.endDate,
    enabled: isTokenReady && profile?.uid != null,
  });
  const linkedQuery = useAsset(initialAssetUid, initialAssetUid != null);
  const createAsset = useCreateAssetMutation();
  const updateAsset = useUpdateAssetMutation();
  const deleteAsset = useDeleteAssetMutation();

  const rows = listQuery.data?.assets ?? [];
  const total = listQuery.data?.meta?.total ?? 0;
  const totalPages = listQuery.data?.meta?.totalPages ?? 0;
  const openedFromRoute = linkedQuery.data ?? null;
  const detailAsset = detail ?? (initialAssetUid != null ? openedFromRoute : null);
  const detailOpen = detail != null || (initialAssetUid != null && openedFromRoute != null);
  const canWriteDetail =
    detailAsset != null &&
    (canManage ||
      userOwnsAsset(detailAsset, {
        uid: profile?.uid,
        clerkUserId: profile?.clerkUserId,
      }));

  if (!isTokenReady) {
    return <LoadingSpinner wrapperClassName="py-12" />;
  }

  function openCreate() {
    setFormMode('create');
    setFormAsset(null);
    setFormOpen(true);
  }

  function openEdit(asset: AssetRecord) {
    setDetail(null);
    setFormMode('edit');
    setFormAsset(asset);
    setFormOpen(true);
  }

  function closeDetail(open: boolean) {
    if (open) return;
    setDetail(null);
    if (initialAssetUid != null) router.push('/assets');
  }

  async function handleCreate(payload: CreateAssetPayload) {
    await createAsset.mutateAsync(payload);
    setFormOpen(false);
  }

  async function handleUpdate(uid: number, payload: UpdateAssetPayload) {
    await updateAsset.mutateAsync({ uid, payload });
    setFormOpen(false);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    await deleteAsset.mutateAsync(pendingDelete.uid);
    setPendingDelete(null);
    setDetail(null);
    if (initialAssetUid != null) router.push('/assets');
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col px-3 py-5 sm:px-6 sm:py-8">
        <div data-tour="assets-page-header" className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Assets</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {canManage
                ? 'Your linked assets, or the full organisation inventory. You can add, edit, and reassign assets.'
                : 'Add and manage assets you own. You can also view equipment and vehicles linked to you.'}
            </p>
          </div>
          {canAdd ? (
            <Button
              type="button"
              data-tour="assets-add-button"
              className="h-9 shrink-0 gap-2 self-start bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Add asset
            </Button>
          ) : null}
        </div>

        <div data-tour="assets-toolbar">
          <AssetsFiltersBar
            canManage={canManage}
            scope={scope}
            onScopeChange={setScope}
            searchInput={searchInput}
            onSearchChange={setSearchInput}
            category={category}
            onCategoryChange={setCategory}
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            branches={branchesQuery.data ?? []}
            selectedBranchId={branchId}
            onBranchChange={setBranchId}
            users={pickerUsers}
            selectedUserUid={userUidFilter}
            onUserUidChange={bindUidChange(setUserUidFilter)}
            userSearchQuery={userSearchQuery}
            onUserSearchQueryChange={setUserSearchQuery}
            isUserSearchLoading={isUserSearchLoading}
          />
        </div>

        <div data-tour="assets-grid" className="min-h-0 flex-1 overflow-y-auto">
          {listQuery.isLoading ? (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <AssetCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {rows.map((asset) => (
                <AssetCard
                  key={asset.uid}
                  asset={asset}
                  showOwner={scope === 'org' && canManage}
                  onClick={() => setDetail(asset)}
                />
              ))}
            </div>
          )}
          {!listQuery.isLoading && rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No assets match your filters.</p>
          ) : null}
          <VisitsListPagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            isFetching={listQuery.isFetching && !listQuery.isLoading}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              try {
                localStorage.setItem(ASSETS_PAGE_SIZE_KEY, String(size));
              } catch {
                /* ignore */
              }
            }}
            dataTour="assets-pagination"
            className="mt-4 rounded-lg border border-border"
          />
          {linkedQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">This asset is not available to you.</p>
          ) : null}
        </div>
      </main>

      <AssetDetailDialog
        asset={detailAsset}
        open={detailOpen}
        canEdit={canWriteDetail}
        canDelete={canWriteDetail}
        onOpenChange={closeDetail}
        onEdit={openEdit}
        onDelete={setPendingDelete}
      />

      <AssetFormDialog
        open={formOpen}
        mode={formMode}
        asset={formAsset}
        canReassign={canManage}
        defaultOwnerUid={profile?.uid != null ? String(profile.uid) : ''}
        defaultOwnerClerkUserId={profile?.clerkUserId ?? ''}
        defaultBranchUid={
          profile?.branch?.uid != null
            ? String(profile.branch.uid)
            : profile?.branchUid != null
              ? String(profile.branchUid)
              : ''
        }
        isPending={createAsset.isPending || updateAsset.isPending}
        onOpenChange={setFormOpen}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <AlertDialog open={pendingDelete != null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? assetTitle(pendingDelete) : 'This asset'} will be removed from the active inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAsset.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteAsset.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
