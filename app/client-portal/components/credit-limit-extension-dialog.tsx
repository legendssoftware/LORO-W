'use client';

import { useTranslation } from 'react-i18next';

import { useState } from 'react';
import { useApiClient } from '@/api/hooks/use-api-client';
import { postCreditLimitExtension } from '@/api/endpoints/client-portal';
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
import toast from 'react-hot-toast';

export function CreditLimitExtensionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('portal');
  const client = useApiClient();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const requestedAmount = parseFloat(amount);
    if (!requestedAmount || requestedAmount <= 0) {
      toast.error('Enter a valid requested amount');
      return;
    }
    setLoading(true);
    try {
      await postCreditLimitExtension(client, {
        requestedAmount,
        reason: reason.trim() || undefined,
      });
      toast.success('Credit limit extension request submitted');
      onOpenChange(false);
      setAmount('');
      setReason('');
    } catch {
      toast.error('Failed to submit request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('applyCredit')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">{t('requestedAmount')}</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={t('exampleAmount')}
              required
            />
          </div>
          <div>
            <Label htmlFor="reason">{t('reasonOptional')}</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={t('exampleReason')}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting…' : 'Submit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
