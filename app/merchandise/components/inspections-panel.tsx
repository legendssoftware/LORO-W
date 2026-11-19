'use client';

import { useState } from 'react';
import {
  useCalculateInspectionScoreMutation,
  useCreateInspectionMutation,
  useInspectionTemplates,
  useInspections,
} from '@/api/hooks/use-inspections';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

/**
 * Merchandise inspections: pick a template, score items, and show the calculated rating.
 */
export function InspectionsPanel() {
  const { t } = useTranslation('screens');
  const templatesQuery = useInspectionTemplates();
  const listQuery = useInspections();
  const createMutation = useCreateInspectionMutation();
  const scoreMutation = useCalculateInspectionScoreMutation();
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [photoUrl, setPhotoUrl] = useState('');

  const template = (templatesQuery.data ?? []).find((item) => item.id === templateId);
  const rows = listQuery.data ?? [];

  async function submit() {
    if (!template) {
      toast.error('Pick a template');
      return;
    }
    const categories = (template.categories ?? []).map((category) => ({
      id: category.id,
      name: category.name,
      items: (category.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        score: scores[item.id] ?? 0,
        notes: photoUrl ? `Photo: ${photoUrl}` : '',
        required: Boolean(item.required),
      })),
    }));
    try {
      const created = await createMutation.mutateAsync({
        title: title.trim() || template.name,
        type: 'INSPECTION',
        inspectionData: { categories },
        comments: photoUrl || undefined,
      });
      const ref = created.data?.uid;
      if (ref) {
        const scored = await scoreMutation.mutateAsync(ref);
        toast.success(scored.data?.overallRating ? `Rated ${scored.data.overallRating}` : 'Inspection scored');
      } else {
        toast.success('Inspection saved');
      }
      setTitle('');
      setScores({});
      setPhotoUrl('');
    } catch (error) {
      toast.error(getQueryErrorMessage(error, 'Could not save the inspection'));
    }
  }

  return (
    <div className="space-y-4">
      {listQuery.isError ? (
        <QueryErrorBanner message={getQueryErrorMessage(listQuery.error, 'Could not load inspections')} onRetry={() => void listQuery.refetch()} />
      ) : null}
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Template</Label>
          <Select value={templateId} onValueChange={setTemplateId}>
            <SelectTrigger><SelectValue placeholder={t('chrome.merchandise.pickTemplate')} /></SelectTrigger>
            <SelectContent>
              {(templatesQuery.data ?? []).map((item) => (
                <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="inspection-title">Title</Label>
          <Input id="inspection-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="inspection-photo">Photo URL</Label>
          <Input id="inspection-photo" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} placeholder="https://" />
        </div>
        {(template?.categories ?? []).flatMap((category) =>
          (category.items ?? []).map((item) => (
            <div key={item.id} className="space-y-1">
              <Label htmlFor={`score-${item.id}`}>{category.name}: {item.name}</Label>
              <Input
                id={`score-${item.id}`}
                type="number"
                min={0}
                max={10}
                value={scores[item.id] ?? ''}
                onChange={(event) => setScores((current) => ({ ...current, [item.id]: Number(event.target.value) }))}
              />
            </div>
          ))
        )}
        <div className="md:col-span-2">
          <Button type="button" onClick={() => void submit()} disabled={createMutation.isPending || scoreMutation.isPending}>
            {t('chrome.merchandise.scoreInspection')}
          </Button>
        </div>
      </div>
      {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading inspections…</p> : null}
      {!listQuery.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('chrome.merchandise.noInspections')}</p>
      ) : null}
      {rows.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('tables.title')}</TableHead>
              <TableHead>{t('tables.rating')}</TableHead>
              <TableHead>{t('tables.score')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.uid}>
                <TableCell>{row.title ?? `Inspection ${row.uid}`}</TableCell>
                <TableCell>{row.overallRating ?? '—'}</TableCell>
                <TableCell>{row.percentage ?? row.totalScore ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}
    </div>
  );
}
