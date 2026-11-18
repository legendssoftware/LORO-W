'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { deleteNews, listNews, saveNews, type NewsItem } from '@/api/endpoints/news';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessNews } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';

export function NewsContent() {
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ['news'], queryFn: () => listNews(client), enabled: ready });
  const save = useMutation({
    mutationFn: (item: NewsItem) => saveNews(client, {
      ...item,
      author: backendUserData?.uid ? { uid: backendUserData.uid } : undefined,
      branch: backendUserData?.branch?.uid ? { uid: backendUserData.branch.uid } : undefined,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['news'] }),
  });
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const rows = list.data ?? [];
  if (ready && !canAccessNews(backendUserData?.accessLevel)) return <FeatureDenied title="News" />;
  return (
    <>
      <FeatureShell tourId="news" title="News" description="Organisation announcements." actions={<Button type="button" onClick={() => { setSelected({ title: '' }); setTitle(''); setContent(''); }}>New post</Button>} isLoading={!ready || list.isLoading} isError={list.isError} error={list.error} onRetry={() => void list.refetch()} isEmpty={rows.length === 0 && selected == null} emptyMessage="No news posts yet.">
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref ?? row.title} className="cursor-pointer" onClick={() => { setSelected(row); setTitle(row.title); setContent(row.content ?? ''); }}>
                <TableCell>{row.title}</TableCell>
                <TableCell>{row.category ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>News post</DialogTitle></DialogHeader>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" />
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} />
          <DialogFooter>
            {selected?.ref ? <Button type="button" variant="destructive" onClick={() => void deleteNews(client, selected.ref!).then(() => { toast.success('Deleted'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['news'] }); })}>Delete</Button> : null}
            <Button type="button" onClick={() => void save.mutateAsync({ ...selected, title, content }).then(() => { toast.success('Saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')))}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
