'use client';

import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Search, UserRound } from 'lucide-react';
import { useApiClient, useSessionSync, useTokenReady, useUsers } from '@/api/hooks';
import { uploadDocFile } from '@/api/endpoints/docs';
import { useDocumentsLibrary } from '@/api/hooks/use-documents-library';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { IconField, IconInput } from '@/components/icon-field';
import {
  ListViewToggle,
  StandardEntityCard,
  StandardEntityGrid,
  StandardListPagination,
  useStandardListPagination,
  type StandardListViewMode,
} from '@/components/standard-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessDocuments, canManageDocuments, canOnlySeeOwnLeave } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_KEY = 'loro:documents-page-size';

export function DocumentsContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const ownOnly = canOnlySeeOwnLeave(backendUserData?.accessLevel);
  const [filter, setFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'library' | 'bucket'>('all');
  const [viewMode, setViewMode] = useState<StandardListViewMode>('list');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [ownerUid, setOwnerUid] = useState('');
  const [uploading, setUploading] = useState(false);
  const client = useApiClient();
  const queryClient = useQueryClient();
  const users = useUsers({ enabled: ready && canManageDocuments(backendUserData?.accessLevel) });
  const list = useDocumentsLibrary({ enabled: ready });

  const filteredRows = useMemo(() => {
    return (list.data ?? []).filter((row) => {
      if (ownOnly && row.owner?.uid && row.owner.uid !== backendUserData?.uid) return false;
      if (sourceFilter === 'library' && row.source === 'bucket') return false;
      if (sourceFilter === 'bucket' && row.source !== 'bucket') return false;
      return !filter || (row.title ?? '').toLowerCase().includes(filter.toLowerCase());
    });
  }, [backendUserData?.uid, filter, list.data, ownOnly, sourceFilter]);

  const { page, pageSize, total, totalPages, pageItems, setPage, handlePageSizeChange } =
    useStandardListPagination({
      items: filteredRows,
      storageKey: PAGE_SIZE_KEY,
      resetKey: `${filter}|${sourceFilter}`,
    });

  if (ready && !canAccessDocuments(backendUserData?.accessLevel)) {
    return <FeatureDenied title={t('pages.documents.title')} />;
  }

  async function upload() {
    if (!title.trim() || !file || !ownerUid) {
      toast.error('Title, file, and person are required');
      return;
    }
    const person = (users.data ?? []).find((user) => String(user.uid) === ownerUid);
    setUploading(true);
    try {
      const named = new File([file], title.trim(), { type: file.type });
      const uploaded = await uploadDocFile(client, named, 'document');
      if (uploaded.docId) {
        await client.patch(`/docs/${uploaded.docId}`, {
          title: title.trim(),
          ...(person?.clerkUserId ? { ownerClerkUserId: person.clerkUserId } : {}),
        });
      }
      toast.success('Document uploaded');
      setOpen(false);
      setTitle('');
      setFile(null);
      setOwnerUid('');
      await queryClient.invalidateQueries({ queryKey: ['docs', 'library'] });
    } catch (error: unknown) {
      toast.error(getQueryErrorMessage(error, 'Could not upload'));
    } finally {
      setUploading(false);
    }
  }

  function renderDownload(url: string | undefined) {
    if (!url) return null;
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={(event) => {
          event.stopPropagation();
          window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        Download
      </Button>
    );
  }

  return (
    <>
      <FeatureShell
        tourId="documents"
        title={t('pages.documents.title')}
        description={t('pages.documents.description')}
        actions={
          canManageDocuments(backendUserData?.accessLevel) ? (
            <Button type="button" onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden />
              Attach document
            </Button>
          ) : undefined
        }
        filters={
          <>
            <Select
              value={sourceFilter}
              onValueChange={(value) => {
                if (value === 'all' || value === 'library' || value === 'bucket') setSourceFilter(value);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t('tables.source')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="library">Library</SelectItem>
                <SelectItem value="bucket">Bucket</SelectItem>
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
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder={t('forms.documents.search')}
              aria-label={t('forms.documents.search')}
              className={`${filterToolbarSearchInputClassName} pl-8`}
            />
          </div>
        }
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={filteredRows.length === 0}
        emptyMessage="No documents match this filter."
      >
        {viewMode === 'list' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('tables.title')}</TableHead>
                <TableHead>{t('tables.type')}</TableHead>
                <TableHead>{t('tables.source')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((row) => {
                const ref = row.uid ?? row.ref;
                return (
                  <TableRow key={String(ref ?? row.url)}>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" aria-hidden />
                        {row.title ?? 'Untitled'}
                      </span>
                    </TableCell>
                    <TableCell>{row.fileType ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={row.source === 'bucket' ? 'secondary' : 'outline'}>
                        {row.source === 'bucket' ? 'Bucket' : 'Library'}
                      </Badge>
                    </TableCell>
                    <TableCell>{renderDownload(row.url)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <StandardEntityGrid dataTour="documents-grid">
            {pageItems.map((row) => {
              const ref = row.uid ?? row.ref;
              return (
                <StandardEntityCard key={String(ref ?? row.url)}>
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{row.title ?? 'Untitled'}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{row.fileType ?? '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={row.source === 'bucket' ? 'secondary' : 'outline'}>
                      {row.source === 'bucket' ? 'Bucket' : 'Library'}
                    </Badge>
                    {renderDownload(row.url)}
                  </div>
                </StandardEntityCard>
              );
            })}
          </StandardEntityGrid>
        )}
        <StandardListPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          isFetching={list.isFetching && !list.isLoading}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          dataTour="documents-pagination"
          className="rounded-lg border border-border"
        />
      </FeatureShell>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4" aria-hidden />
              Attach document
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <IconField icon={FileText} label={t('forms.documents.title')}>
              <IconInput
                icon={FileText}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('forms.documents.titlePlaceholder')}
              />
            </IconField>
            <IconField icon={FileText} label={t('forms.documents.file')}>
              <Input
                type="file"
                aria-label={t('forms.documents.fileAria')}
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </IconField>
            <IconField icon={UserRound} label={t('forms.documents.person')}>
              <Select value={ownerUid} onValueChange={setOwnerUid}>
                <SelectTrigger className="w-full">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden />
                  <SelectValue placeholder={t('forms.documents.personPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(users.data ?? []).map((user) => (
                    <SelectItem key={user.uid} value={String(user.uid)}>
                      <UserRound className="size-4" aria-hidden />
                      {user.name} {user.surname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </IconField>
          </div>
          <DialogFooter>
            <Button type="button" disabled={uploading} onClick={() => void upload()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
