'use client';

import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SearchableOptionListPicker } from '@/components/filters/searchable-filter-comboboxes';
import { useApiClient } from '@/api/hooks/use-api-client';
import {
  useClaimGroups,
  useCreateClaimGroupMutation,
  useCreateClaimMutation,
} from '@/api/hooks/use-claims';
import { uploadFile } from '@/api/endpoints/upload';
import { CLAIM_CATEGORY_OPTIONS } from '@/api/types/claims';
import { ClaimCurrencyField } from '@/app/claims/components/claim-currency-picker-dialog';
import { FolderOpen, Loader2, Plus, Tag } from 'lucide-react';
import { getQueryErrorMessage } from '@/lib/api/query-error';

const primaryRedClass =
  'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 [&_svg]:text-white';

const primaryVioletClass =
  'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500/40 [&_svg]:text-white';

export function ClaimCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('screens');
  const client = useApiClient();
  const groupsQuery = useClaimGroups({ enabled: open });
  const createMutation = useCreateClaimMutation();
  const createGroupMutation = useCreateClaimGroupMutation();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [comment, setComment] = useState('');
  const [currency, setCurrency] = useState('ZAR');
  const [folderUid, setFolderUid] = useState<string>('none');
  const [file, setFile] = useState<File | null>(null);
  const [newFolderTitle, setNewFolderTitle] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount('');
    setCategory('general');
    setComment('');
    setCurrency('ZAR');
    setFolderUid('none');
    setFile(null);
    setNewFolderTitle('');
    setShowNewFolder(false);
    setSubmitError(null);
  }, [open]);

  const groups = groupsQuery.data?.groups ?? [];

  const categoryOptions = useMemo(
    () =>
      CLAIM_CATEGORY_OPTIONS.map((c) => ({
        value: c.value,
        label: c.label,
        icon: <Tag className="size-4 shrink-0" />,
        searchExtra: `${c.label} ${c.value}`,
      })),
    []
  );

  const folderOptions = useMemo(
    () =>
      groups.map((g) => ({
        value: String(g.uid),
        label: g.title,
        icon: <FolderOpen className="size-4 shrink-0" />,
        searchExtra: `${g.title} ${g.uid}`,
      })),
    [groups]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setSubmitError('Enter a valid amount greater than zero.');
      return;
    }
    let documentUrl: string | undefined;
    if (file) {
      try {
        documentUrl = await uploadFile(client, file);
      } catch (err) {
        setSubmitError(getQueryErrorMessage(err, 'Could not upload file'));
        return;
      }
    }
    const claimGroupUid =
      folderUid !== 'none' ? Number(folderUid) : undefined;
    createMutation.mutate(
      {
        amount: num,
        category,
        comment: comment.trim() || undefined,
        currency,
        documentUrl,
        ...(typeof claimGroupUid === 'number' &&
        !Number.isNaN(claimGroupUid) &&
        claimGroupUid > 0
          ? { claimGroupUid }
          : {}),
      },
      {
        onSuccess: () => {
          void groupsQuery.refetch();
          const inFolder = folderUid !== 'none';
          if (inFolder) {
            setAmount('');
            setComment('');
            setFile(null);
            setSubmitError(null);
            return;
          }
          onOpenChange(false);
        },
      }
    );
  }

  function handleCreateFolder() {
    const t = newFolderTitle.trim();
    if (!t) return;
    createGroupMutation.mutate(
      { title: t, kind: 'other' },
      {
        onSuccess: () => {
          setShowNewFolder(false);
          setNewFolderTitle('');
          void groupsQuery.refetch();
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('claims.newClaim')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="claim-amount">{t('claims.amount')}</Label>
              <Input
                id="claim-amount"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('claims.amountPlaceholder')}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('claims.currency')}</Label>
              <ClaimCurrencyField value={currency} onChange={setCurrency} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t('claims.category')}</Label>
            <SearchableOptionListPicker
              selectedValue={category}
              onValueChange={setCategory}
              options={categoryOptions}
              includeAllOption={false}
              searchPlaceholder="Search category…"
              emptyMessage={t('claims.noCategory')}
              triggerIcon={<Tag className="size-4 shrink-0" />}
              triggerClassName="h-9 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('claims.folderOptional')}</Label>
            <div className="flex gap-2">
              <SearchableOptionListPicker
                selectedValue={folderUid}
                onValueChange={setFolderUid}
                options={folderOptions}
                allOptionValue="none"
                placeholderLabelWhenAll={t('claims.noFolderOption')}
                searchPlaceholder="Search folders…"
                emptyMessage={t('claims.noFolderFound')}
                triggerIcon={<FolderOpen className="size-4 shrink-0" />}
                triggerClassName="h-9 min-w-0 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 shrink-0"
                onClick={() => setShowNewFolder((v) => !v)}
                title={t('claims.newFolder')}
              >
                <Plus className="size-4" />
              </Button>
            </div>
            {showNewFolder ? (
              <div className="flex gap-2 pt-1">
                <Input
                  placeholder={t('claims.folderName')}
                  value={newFolderTitle}
                  onChange={(e) => setNewFolderTitle(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className={primaryVioletClass}
                  disabled={
                    createGroupMutation.isPending || !newFolderTitle.trim()
                  }
                  onClick={handleCreateFolder}
                >
                  {createGroupMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    t('actions.create')
                  )}
                </Button>
              </div>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-comment">{t('claims.notes')}</Label>
            <Textarea
              id="claim-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="min-h-[140px]"
              placeholder={t('claims.describe')}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="claim-file">{t('claims.receiptOptional')}</Label>
            <Input
              id="claim-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {folderUid !== 'none' ? (
            <p className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
              {t('claims.folderDraftHint')}
            </p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
          <DialogFooter className="flex flex-wrap items-center justify-end gap-4 sm:gap-4">
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
            >{t('actions.cancel')}</Button>
            <Button
              type="submit"
              className={primaryRedClass}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t('claims.submitting')}
                </>
              ) : folderUid !== 'none' ? (
                t('claims.addToFolder')
              ) : (
                t('claims.submitClaim')
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
