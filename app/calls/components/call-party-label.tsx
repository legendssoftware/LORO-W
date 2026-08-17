'use client';

import { GitBranch, Phone, UserRound } from 'lucide-react';
import type { CallPartyKind, MatchedCallParty } from '@/lib/utils/call-party-match';
import { cn } from '@/lib/utils';

const KIND_CLASS: Record<CallPartyKind, string> = {
  branch: 'text-red-600 dark:text-red-400',
  agent: 'text-emerald-600 dark:text-emerald-400',
  other: 'text-emerald-600 dark:text-emerald-400',
};

function PartyIcon({ kind, className }: { kind: CallPartyKind; className?: string }) {
  switch (kind) {
    case 'branch':
      return <GitBranch className={className} aria-hidden />;
    case 'agent':
      return <UserRound className={className} aria-hidden />;
    case 'other':
      return <Phone className={className} aria-hidden />;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function CallPartyLabel({
  party,
  className,
}: {
  party: MatchedCallParty;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex min-w-0 max-w-full items-center gap-1.5 font-medium',
        KIND_CLASS[party.kind],
        className,
      )}
    >
      <PartyIcon kind={party.kind} className="size-3.5 shrink-0" />
      <span className="truncate">{party.label}</span>
    </span>
  );
}
