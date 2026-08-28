import type { Claim } from '@/api/types/claims';
import { formatZarAmount } from '@/lib/utils/zar-fx';

export type ClaimsCurrencyView = 'original' | 'zar';

function originalAmountLabel(claim: Claim): string {
  if (typeof claim.amount === 'string' && claim.amount.trim()) return claim.amount;
  if (typeof claim.amount === 'number' && Number.isFinite(claim.amount)) {
    return String(claim.amount);
  }
  if (claim.amountNumeric != null && Number.isFinite(claim.amountNumeric)) {
    return String(claim.amountNumeric);
  }
  return '—';
}

export function claimPrimaryAmount(
  claim: Claim,
  view: ClaimsCurrencyView
): string {
  switch (view) {
    case 'zar':
      if (claim.amountZar != null && Number.isFinite(claim.amountZar)) {
        return formatZarAmount(claim.amountZar);
      }
      return originalAmountLabel(claim);
    case 'original':
      return originalAmountLabel(claim);
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function claimSecondaryAmount(
  claim: Claim,
  view: ClaimsCurrencyView
): string | null {
  const original = originalAmountLabel(claim);
  const zar =
    claim.amountZar != null && Number.isFinite(claim.amountZar)
      ? formatZarAmount(claim.amountZar)
      : null;
  switch (view) {
    case 'zar':
      return original !== '—' && original !== zar ? original : null;
    case 'original':
      return zar && zar !== original ? zar : null;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
