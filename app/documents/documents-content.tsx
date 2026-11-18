'use client';

import { useState } from 'react';
import { useApiClient, useSessionSync, useTokenReady, useUsers } from '@/api/hooks';
import { documentDownloadPath } from '@/api/endpoints/documents-library';
import { useCreateDocumentRecordMutation, useDocumentsLibrary } from '@/api/hooks/use-documents-library';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessDocuments, canManageDocuments, canOnlySeeOwnLeave } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function DocumentsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const ownOnly = canOnlySeeOwnLeave(backendUserData?.accessLevel);
  const [filter, setFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [ownerUid, setOwnerUid] = useState('');
  const client = useApiClient();
  const users = useUsers({ enabled: ready && canManageDocuments(backendUserData?.accessLevel) });
  const list = useDocumentsLibrary({ enabled: ready });
  const create = useCreateDocumentRecordMutation();
  const rows = (list.data ?? []).filter((row) => {
    if (ownOnly && row.owner?.uid && row.owner.uid !== backendUserData?.uid) return false;
    return !filter || (row.title ?? '').toLowerCase().includes(filter.toLowerCase());
  });

  if (ready && !canAccessDocuments(backendUserData?.accessLevel)) return <FeatureDenied title="Documents" />;

  return (
    <>
      <FeatureShell
        tourId="documents"
        title="Documents"
        description="List, download, and attach documents to a person."
        actions={canManageDocuments(backendUserData?.accessLevel) ? <Button type="button" onClick={() => setOpen(true)}>Attach document</Button> : undefined}
        filters={<Input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter by title" className="max-w-xs" />}
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0}
        emptyMessage="No documents match this filter."
      >
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => {
              const ref = row.uid ?? row.ref;
              return (
                <TableRow key={String(ref)}>
                  <TableCell>{row.title ?? 'Untitled'}</TableCell>
                  <TableCell>{row.fileType ?? '—'}</TableCell>
                  <TableCell>
                    <Button type="button" size="sm" variant="outline" onClick={() => { void client.get(documentDownloadPath(ref!), { responseType: 'blob' }).then((res) => {
                      const href = URL.createObjectURL(res.data);
                      const link = document.createElement('a');
                      link.href = href;
                      link.download = row.title ?? 'document';
                      link.click();
                      URL.revokeObjectURL(href);
                    }).catch((error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not download'))); }}>
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attach document</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="doc-title">Title</Label>
            <Input id="doc-title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Label htmlFor="doc-url">File URL</Label>
            <Input id="doc-url" value={url} onChange={(event) => setUrl(event.target.value)} />
            <Label>Person</Label>
            <Select value={ownerUid} onValueChange={setOwnerUid}>
              <SelectTrigger><SelectValue placeholder="Select a person" /></SelectTrigger>
              <SelectContent>
                {(users.data ?? []).map((user) => (
                  <SelectItem key={user.uid} value={String(user.uid)}>{user.name} {user.surname}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => {
              const branchUid = backendUserData?.branch?.uid ?? backendUserData?.branchUid;
              if (!title.trim() || !url.trim() || !ownerUid || !branchUid) {
                toast.error('Title, URL, person, and a branch are required');
                return;
              }
              void create.mutateAsync({
                title: title.trim(),
                fileType: 'FILE',
                url: url.trim(),
                owner: { uid: Number(ownerUid) },
                branch: { uid: branchUid },
              }).then(() => { toast.success('Document attached'); setOpen(false); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not attach')));
            }}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
