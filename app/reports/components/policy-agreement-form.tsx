'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useUpsertAgreement, useUserAgreement } from '@/api/hooks/use-performance-policy';

/** Manager sets participation and the performance reference remuneration. Changing terms clears a signature. */
export function PolicyAgreementForm({ clerkUserId }: { clerkUserId: string }) {
  const agreement = useUserAgreement(clerkUserId);
  const save = useUpsertAgreement(clerkUserId);
  const [participates, setParticipates] = useState(false);
  const [prr, setPrr] = useState('');
  const [currency, setCurrency] = useState('ZAR');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [witness, setWitness] = useState('');

  useEffect(() => {
    const row = agreement.data;
    if (!row) return;
    setParticipates(row.participates);
    setPrr(row.prr == null ? '' : String(row.prr));
    setCurrency(row.currency || 'ZAR');
    setEffectiveDate(row.effectiveDate ?? '');
    setWitness(row.witnessTypedName ?? '');
  }, [agreement.data]);

  if (!clerkUserId) return null;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Performance remuneration</p>
        <p className="text-xs text-muted-foreground">
          Participation is optional. Not signing does not mark poor performance and does not reduce the current salary.
          {agreement.data?.signedAt ? ' This agreement is signed.' : ' Not signed yet.'}
        </p>
      </div>
      <div className="flex items-center justify-between rounded-md border p-3">
        <Label htmlFor={`participate-${clerkUserId}`}>Takes part</Label>
        <Switch id={`participate-${clerkUserId}`} checked={participates} onCheckedChange={setParticipates} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor={`prr-${clerkUserId}`}>100% reference (monthly)</Label>
          <Input id={`prr-${clerkUserId}`} inputMode="decimal" value={prr} onChange={(event) => setPrr(event.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`currency-${clerkUserId}`}>Currency</Label>
          <Input id={`currency-${clerkUserId}`} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`effective-${clerkUserId}`}>Effective date</Label>
          <Input id={`effective-${clerkUserId}`} type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`witness-${clerkUserId}`}>Witness name</Label>
        <Input id={`witness-${clerkUserId}`} value={witness} onChange={(event) => setWitness(event.target.value)} />
      </div>
      <Button
        type="button"
        disabled={save.isPending}
        onClick={() =>
          save.mutate({
            participates,
            ...(prr.trim() ? { prr: Number(prr) } : {}),
            currency: currency.trim() || 'ZAR',
            ...(effectiveDate ? { effectiveDate } : {}),
            ...(witness.trim() ? { witnessTypedName: witness.trim() } : {}),
          })
        }
      >
        Save agreement
      </Button>
      {save.isError ? <p className="text-xs text-red-700">A reference amount is required when the person takes part.</p> : null}
    </div>
  );
}
