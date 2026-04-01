'use client';

import type { ClientListItem } from '@/api/types/clients';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

function formatZar(n: unknown): string {
  if (n == null || n === '') return '—';
  const num = typeof n === 'string' ? Number(n) : Number(n);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(num);
}

export function ClientCardSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card
      className={cn(
        'rounded-lg border border-gray-200 bg-white',
        isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col flex-1 justify-between',
          isMobile ? 'p-3 min-h-[140px]' : 'p-4 min-h-[180px]'
        )}
      >
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-[200px] rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
            <Skeleton className="h-3 w-full max-w-[240px] rounded-md" />
          </div>
        </div>
        <Skeleton className="h-6 w-24 rounded-md mt-3" />
      </CardContent>
    </Card>
  );
}

export function ClientCard({
  client,
  onClick,
}: {
  client: ClientListItem;
  onClick?: () => void;
}) {
  const isMobile = useIsMobile();
  const initials = client.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const status = typeof client.status === 'string' ? client.status : '';
  const category = typeof client.category === 'string' ? client.category : '';

  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border border-gray-200 bg-white transition-shadow',
        onClick && 'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
      )}
    >
      <CardContent
        className={cn(
          'flex flex-col flex-1 justify-between gap-2',
          isMobile ? 'p-3 min-h-[140px]' : 'p-4 min-h-[180px]'
        )}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Avatar className="size-10 shrink-0 border border-gray-200">
            <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
              {initials || <Building2 className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium text-foreground truncate leading-tight">{client.name}</p>
            {client.contactPerson ? (
              <p className="text-xs text-muted-foreground truncate">{client.contactPerson}</p>
            ) : null}
            {client.email ? (
              <p className="text-xs text-muted-foreground truncate">{client.email}</p>
            ) : null}
            {client.phone ? (
              <p className="text-xs text-muted-foreground truncate">{client.phone}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {status ? (
            <Badge variant="secondary" className="text-[10px] font-normal capitalize">
              {status}
            </Badge>
          ) : null}
          {category ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              {category}
            </Badge>
          ) : null}
        </div>
        {(client.creditLimit != null || client.outstandingBalance != null) && (
          <p className="text-[11px] text-muted-foreground">
            Credit {formatZar(client.creditLimit)} · Balance {formatZar(client.outstandingBalance)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
