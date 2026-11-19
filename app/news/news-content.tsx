'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ImageIcon, Newspaper, Plus, Search, Type } from 'lucide-react';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import { deleteNews, listNews, saveNews, type NewsItem } from '@/api/endpoints/news';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { IconField, IconInput, IconTextarea } from '@/components/icon-field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { canAccessNews } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const NEWS_CATEGORIES = [
  { value: 'news', labelKey: 'chrome.news.category.news', icon: Newspaper },
  { value: 'event', labelKey: 'chrome.news.category.event', icon: Calendar },
  { value: 'announcement', labelKey: 'chrome.news.category.announcement', icon: Type },
] as const;

export function NewsContent() {
  const { t } = useTranslation('screens');
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
  const [subtitle, setSubtitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('news');
  const [coverImage, setCoverImage] = useState('');
  const [publishingDate, setPublishingDate] = useState('');
  const [search, setSearch] = useState('');
  const rows = (list.data ?? []).filter((row) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${row.title} ${row.subtitle ?? ''} ${row.category ?? ''}`.toLowerCase().includes(query);
  });
  if (ready && !canAccessNews(backendUserData?.accessLevel)) return <FeatureDenied title={t('pages.news.title')} />;

  function openNew() {
    setSelected({ title: '' });
    setTitle('');
    setSubtitle('');
    setContent('');
    setCategory('news');
    setCoverImage('');
    setPublishingDate(new Date().toISOString().slice(0, 16));
  }

  return (
    <>
      <FeatureShell
        tourId="news"
        title={t('pages.news.title')}
        description={t('pages.news.description')}
        actions={<Button type="button" onClick={openNew}><Plus className="size-4" aria-hidden />{t('chrome.news.newPost')}</Button>}
        search={
          <div className="relative w-56">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('forms.news.search')} aria-label={t('forms.news.search')} className={`${filterToolbarSearchInputClassName} pl-8`} />
          </div>
        }
        isLoading={!ready || list.isLoading}
        isError={list.isError}
        error={list.error}
        onRetry={() => void list.refetch()}
        isEmpty={rows.length === 0 && selected == null}
        emptyMessage="No news posts yet."
      >
        <Table>
          <TableHeader><TableRow><TableHead>{t('tables.title')}</TableHead><TableHead>{t('tables.category')}</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.ref ?? row.title} className="cursor-pointer" onClick={() => {
                setSelected(row);
                setTitle(row.title);
                setSubtitle(row.subtitle ?? '');
                setContent(row.content ?? '');
                setCategory(row.category && NEWS_CATEGORIES.some((item) => item.value === row.category) ? row.category : 'news');
                setCoverImage(row.coverImage ?? '');
                setPublishingDate(row.publishingDate ? row.publishingDate.slice(0, 16) : '');
              }}>
                <TableCell>
                  <span className="flex items-center gap-2"><Newspaper className="size-4 text-muted-foreground" aria-hidden />{row.title}</span>
                </TableCell>
                <TableCell>{row.category ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </FeatureShell>
      <Dialog open={selected != null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Newspaper className="size-4" aria-hidden />{t('chrome.news.post')}</DialogTitle></DialogHeader>
          <IconField icon={Type} label={t('forms.news.title')}>
            <IconInput icon={Type} value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('forms.news.titlePlaceholder')} />
          </IconField>
          <IconField icon={Type} label={t('forms.news.subtitle')}>
            <IconInput icon={Type} value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder={t('forms.news.subtitlePlaceholder')} />
          </IconField>
          <IconField icon={Newspaper} label={t('forms.news.body')}>
            <IconTextarea icon={Newspaper} value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('forms.news.bodyPlaceholder')} />
          </IconField>
          <IconField icon={Newspaper} label={t('forms.news.category')}>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <Newspaper className="size-4 text-muted-foreground" aria-hidden />
                <SelectValue placeholder={t('forms.news.categoryPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {NEWS_CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    <item.icon className="size-4" aria-hidden />
                    {t(item.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </IconField>
          <IconField icon={ImageIcon} label={t('forms.news.coverImage')}>
            <IconInput icon={ImageIcon} value={coverImage} onChange={(event) => setCoverImage(event.target.value)} placeholder={t('forms.news.urlPlaceholder')} />
          </IconField>
          <IconField icon={Calendar} label={t('forms.news.publishingDate')}>
            <IconInput icon={Calendar} type="datetime-local" value={publishingDate} onChange={(event) => setPublishingDate(event.target.value)} placeholder={t('forms.news.publishingDatePlaceholder')} />
          </IconField>
          <DialogFooter>
            {selected?.ref ? <Button type="button" variant="destructive" onClick={() => void deleteNews(client, selected.ref!).then(() => { toast.success('Deleted'); setSelected(null); queryClient.invalidateQueries({ queryKey: ['news'] }); })}>{t('actions.delete')}</Button> : null}
            <Button type="button" onClick={() => void save.mutateAsync({
              ...selected,
              title,
              subtitle: subtitle || title,
              content,
              category,
              coverImage,
              thumbnail: coverImage,
              publishingDate: publishingDate ? new Date(publishingDate).toISOString() : new Date().toISOString(),
            }).then(() => { toast.success('Saved'); setSelected(null); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not save')))}>{t('actions.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
