'use client';

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
  useUpdateClaimMutation,
} from '@/api/hooks/use-claims';
import { uploadFile } from '@/api/endpoints/upload';
import {
  CLAIM_CATEGORY_OPTIONS,
  type Claim,
  type UpdateClaimPayload,
} from '@/api/types/claims';
import { ClaimCurrencyField } from '@/app/claims/components/claim-currency-picker-dialog';
import { FolderOpen, Loader2, Tag } from 'lucide-react';
import { getQueryErrorMessage } from '@/lib/api/query-error';

const primaryRedClass =
  'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 [&_svg]:text-white';

function parseAmountInput(amount: string | number | undefined): string {
  if (amount == null) return '';
  if (typeof amount === 'number') return String(amount);
  const cleaned = amount.replace(/[^\d.,-]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  if (lastComma > lastDot && lastComma > -1) {
    const parts = cleaned.split(',');
    const intPart = parts.slice(0, -1).join('').replace(/\./g, '');
    const dec = parts[parts.length - 1];
    return `${intPart}.${dec}`;
  }
  if (lastDot > lastComma && lastDot > -1) {
    const parts = cleaned.split('.');
    const intPart = parts.slice(0, -1).join('').replace(/,/g, '');
    const dec = parts[parts.length - 1];
    return `${intPart}.${dec}`;
  }
  return cleaned.replace(/[,.]/g, '');
}

export function ClaimEditDialog({
  claim,
  open,
  onOpenChange,
}: {
  claim: Claim | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const client = useApiClient();
  const groupsQuery = useClaimGroups({ enabled: open && !!claim });
  const updateMutation = useUpdateClaimMutation();

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [comment, setComment] = useState('');
  const [currency, setCurrency] = useState('ZAR');
  const [folderUid, setFolderUid] = useState<string>('none');
  const [file, setFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !claim) return;
    setAmount(parseAmountInput(claim.amount));
    setCategory((claim.category as string) || 'general');
    setComment(claim.comments || '');
    setCurrency(claim.currency || 'ZAR');
    setFolderUid(
      claim.claimGroupUid != null && claim.claimGroupUid > 0
        ? String(claim.claimGroupUid)
        : 'none'
    );
    setFile(null);
    setSubmitError(null);
  }, [open, claim]);

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

  if (!claim) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!claim) return;
    setSubmitError(null);
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setSubmitError('Enter a valid amount.');
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
      folderUid === 'none' ? null : Number.parseInt(folderUid, 10);
    const body: UpdateClaimPayload = {
      amount: num,
      category,
      comment: comment.trim() || undefined,
      currency,
      claimGroupUid: Number.isNaN(claimGroupUid) ? null : claimGroupUid,
    };
    if (documentUrl) body.documentUrl = documentUrl;

    updateMutation.mutate(
      { ref: claim.uid, body },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit claim</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-amount">Amount</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <ClaimCurrencyField value={currency} onChange={setCurrency} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <SearchableOptionListPicker
              selectedValue={category}
              onValueChange={setCategory}
              options={categoryOptions}
              includeAllOption={false}
              searchPlaceholder="Search category…"
              emptyMessage="No category found."
              triggerIcon={<Tag className="size-4 shrink-0" />}
              triggerClassName="h-9 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Folder</Label>
            <SearchableOptionListPicker
              selectedValue={folderUid}
              onValueChange={setFolderUid}
              options={folderOptions}
              allOptionValue="none"
              placeholderLabelWhenAll="No folder"
              searchPlaceholder="Search folders…"
              emptyMessage="No folder found."
              triggerIcon={<FolderOpen className="size-4 shrink-0" />}
              triggerClassName="h-9 w-full"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-comment">Notes</Label>
            <Textarea
              id="edit-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={6}
              className="min-h-[140px]"
              placeholder="Describe the expense…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-file">Replace receipt (optional)</Label>
            <Input
              id="edit-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
          <DialogFooter className="flex flex-wrap items-center justify-end gap-4 sm:gap-4">
            <Button
              type="button"
              variant="cancel"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={primaryRedClass}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
