'use client';

import type { CompetitorListItem } from '@/api/types/competitors';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Swords } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatDisplayName } from '@/lib/client-display';
import { cn } from '@/lib/utils';

export function CompetitorCardSkeleton() {
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
          isMobile ? 'min-h-[140px] p-3' : 'min-h-[180px] p-4'
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
        <Skeleton className="mt-3 h-6 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function CompetitorCard({
  competitor,
  onClick,
}: {
  competitor: CompetitorListItem;
  onClick?: () => void;
}) {
  const isMobile = useIsMobile();
  const initials = competitor.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const status = typeof competitor.status === 'string' ? competitor.status : '';
  const industry = typeof competitor.industry === 'string' ? competitor.industry : '';
  const city = competitor.address?.city;
  const country = competitor.address?.country;
  const loc =
    city && country ? `${city}, ${country}` : city || country || '';

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
          isMobile ? 'min-h-[140px] p-3' : 'min-h-[180px] p-4'
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <Avatar className="size-10 shrink-0 border border-gray-200">
            <AvatarFallback className="bg-muted text-foreground text-xs font-medium">
              {initials || <Swords className="size-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate font-medium leading-tight text-foreground">
              {formatDisplayName(competitor.name) || competitor.name}
            </p>
            {competitor.competitorRef ? (
              <p className="truncate text-xs text-muted-foreground">{competitor.competitorRef}</p>
            ) : null}
            {loc ? (
              <p className="truncate text-xs text-muted-foreground">{loc}</p>
            ) : null}
            {competitor.contactEmail ? (
              <p className="truncate text-xs text-muted-foreground">{competitor.contactEmail}</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {status ? (
            <Badge variant="secondary" className="text-[10px] font-normal capitalize">
              {status}
            </Badge>
          ) : null}
          {typeof competitor.threatLevel === 'number' && competitor.threatLevel > 0 ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              Threat {competitor.threatLevel}/5
            </Badge>
          ) : null}
          {competitor.isDirect === true ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              Direct
            </Badge>
          ) : competitor.isDirect === false ? (
            <Badge variant="outline" className="text-[10px] font-normal">
              Indirect
            </Badge>
          ) : null}
          {industry ? (
            <Badge variant="outline" className="max-w-[140px] truncate text-[10px] font-normal">
              {industry}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
