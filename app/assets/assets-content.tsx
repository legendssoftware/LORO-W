'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionSync } from '@/api/hooks/use-session-sync';
import { useTokenReady } from '@/api/hooks/use-token-ready';
import {
  useAsset,
  useAssetsInfinite,
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
import { assetTitle } from './lib/asset-display';

type AssetScope = 'mine' | 'org';
const SEARCH_DEBOUNCE_MS = 350;

export function AssetsContent({ initialAssetUid }: { initialAssetUid?: number }) {
  const router = useRouter();
  const { isTokenReady } = useTokenReady();
  const { backendUserData: profile } = useSessionSync();
  const canManage = canManageOrgAssets(profile?.accessLevel);
  const [scope, setScope] = useState<AssetScope>('mine');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<AssetCategory | 'all'>('all');
  const [detail, setDetail] = useState<AssetRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formAsset, setFormAsset] = useState<AssetRecord | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AssetRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listQuery = useAssetsInfinite({
    scope: canManage && scope === 'org' ? 'org' : 'mine',
    userUid: profile?.uid,
    search: debouncedSearch,
    category,
    enabled: isTokenReady && profile?.uid != null,
  });
  const linkedQuery = useAsset(initialAssetUid, initialAssetUid != null);
  const createAsset = useCreateAssetMutation();
  const updateAsset = useUpdateAssetMutation();
  const deleteAsset = useDeleteAssetMutation();

  const rows = listQuery.data ?? [];
  const openedFromRoute = linkedQuery.data ?? null;
  const detailAsset = detail ?? (initialAssetUid != null ? openedFromRoute : null);
  const detailOpen = detail != null || (initialAssetUid != null && openedFromRoute != null);

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
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Assets</h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {canManage
                ? 'Your linked assets, or the full organisation inventory.'
                : 'Equipment and vehicles linked to you.'}
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              className="h-9 shrink-0 gap-2 self-start bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white"
              onClick={openCreate}
            >
              <Plus className="size-4" />
              Add asset
            </Button>
          ) : null}
        </div>

        <AssetsFiltersBar
          canManage={canManage}
          scope={scope}
          onScopeChange={setScope}
          searchInput={searchInput}
          onSearchChange={setSearchInput}
          category={category}
          onCategoryChange={setCategory}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
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
          {listQuery.hasNextPage ? (
            <div className="flex justify-center py-6">
              <Button
                variant="outline"
                size="sm"
                className="border-border bg-background"
                disabled={listQuery.isFetchingNextPage}
                onClick={() => void listQuery.fetchNextPage()}
              >
                {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          ) : null}
          {linkedQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">This asset is not available to you.</p>
          ) : null}
        </div>
      </main>

      <AssetDetailDialog
        asset={detailAsset}
        open={detailOpen}
        canEdit={Boolean(detailAsset)}
        canDelete={canManage}
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
