'use client';

import type { ClaimOwner } from '@/api/types/claims';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function claimPersonDisplayName(person?: ClaimOwner | null): string {
  if (!person) return '—';
  if (person.name || person.surname) {
    return `${person.name ?? ''} ${person.surname ?? ''}`.trim();
  }
  return person.email ?? '—';
}

function claimPersonInitials(person?: ClaimOwner | null): string {
  const name = claimPersonDisplayName(person);
  if (name === '—') return '?';
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ClaimPersonRow({
  label,
  person,
  className,
}: {
  label: string;
  person?: ClaimOwner | null;
  className?: string;
}) {
  const name = claimPersonDisplayName(person);

  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <Avatar className="size-8 shrink-0">
          <AvatarImage src={person?.photoURL ?? undefined} alt="" />
          <AvatarFallback className="text-xs">
            {claimPersonInitials(person)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="font-medium leading-tight">{name}</p>
          {person?.email ? (
            <p className="truncate text-xs text-muted-foreground">
              {person.email}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
