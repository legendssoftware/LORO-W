'use client';

import { useState } from 'react';
import { Gift, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient, useSessionSync, useTokenReady } from '@/api/hooks';
import {
  claimLoyaltyReward,
  createLoyaltyReward,
  listLoyaltyBroadcasts,
  listLoyaltyProfiles,
  listLoyaltyRewards,
  listLoyaltyTransactions,
} from '@/api/endpoints/loyalty-admin';
import { FeatureDenied, FeatureShell } from '@/components/feature-page';
import { Button } from '@/components/ui/button';
import { IconInput } from '@/components/icon-field';
import { canAccessLoyalty } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export function LoyaltyContent() {
  const { t } = useTranslation('screens');
  const { isTokenReady } = useTokenReady();
  const { isSyncing: isLoading, backendUserData } = useSessionSync();
  const ready = isTokenReady && !isLoading;
  const client = useApiClient();
  const queryClient = useQueryClient();
  const profiles = useQuery({ queryKey: ['loyalty', 'profiles'], queryFn: () => listLoyaltyProfiles(client), enabled: ready });
  const rewards = useQuery({ queryKey: ['loyalty', 'rewards'], queryFn: () => listLoyaltyRewards(client), enabled: ready });
  const transactions = useQuery({ queryKey: ['loyalty', 'transactions'], queryFn: () => listLoyaltyTransactions(client), enabled: ready });
  const broadcasts = useQuery({ queryKey: ['loyalty', 'broadcasts'], queryFn: () => listLoyaltyBroadcasts(client), enabled: ready });
  const create = useMutation({
    mutationFn: (name: string) => createLoyaltyReward(client, { name, rewardType: 'DISCOUNT', pointsRequired: 100 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loyalty', 'rewards'] }),
  });
  const [name, setName] = useState('');
  const level = (backendUserData?.accessLevel ?? '').toLowerCase();
  const canClaim = level === 'member' || level === 'client';
  const rows = profiles.data ?? [];
  if (ready && !canAccessLoyalty(backendUserData?.accessLevel) && !canClaim) return <FeatureDenied title={t('pages.loyalty.title')} />;
  return (
    <FeatureShell tourId="loyalty" title={t('pages.loyalty.title')} description={t('pages.loyalty.description')} isLoading={!ready || profiles.isLoading} isError={profiles.isError} error={profiles.error} onRetry={() => void profiles.refetch()} isEmpty={rows.length === 0 && (rewards.data?.length ?? 0) === 0} emptyMessage="No loyalty profiles yet.">
      <div className="flex gap-2">
        <IconInput icon={Gift} value={name} onChange={(event) => setName(event.target.value)} placeholder="Reward name, e.g. Free delivery" />
        <Button type="button" onClick={() => void create.mutateAsync(name).then(() => { toast.success('Reward added'); setName(''); }, (error: unknown) => toast.error(getQueryErrorMessage(error, 'Could not add reward')))}><Plus className="size-4" aria-hidden />Add reward</Button>
      </div>
      <ul className="text-sm">
        {(rewards.data ?? []).map((reward) => (
          <li key={reward.uid ?? reward.name} className="flex items-center justify-between gap-2 border-b py-2">
            <span className="flex items-center gap-2"><Gift className="size-4 text-muted-foreground" aria-hidden />{reward.name} · {reward.pointsRequired ?? 0} pts</span>
            {canClaim && reward.uid ? <Button type="button" size="sm" variant="outline" onClick={() => void claimLoyaltyReward(client, reward.uid!).then(() => toast.success('Claimed'))}>Claim</Button> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">{transactions.data?.length ?? 0} transactions · {broadcasts.data?.length ?? 0} broadcasts</p>
    </FeatureShell>
  );
}
