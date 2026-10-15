'use client';

import type { AssetRecord } from '@/api/types/asset';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Boxes } from 'lucide-react';
import { assetCategoryLabel, assetOwnerLabel, assetTitle } from '../lib/asset-display';

export function AssetCardSkeleton() {
  const isMobile = useIsMobile();
  return (
    <Card
      className={cn(
        'rounded-lg border border-border bg-background',
        isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
      )}
    >
      <CardContent className={cn('flex flex-col gap-3', isMobile ? 'p-3' : 'p-4')}>
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
        <Skeleton className="h-3 w-2/3 rounded-md" />
        <Skeleton className="mt-2 h-6 w-24 rounded-md" />
      </CardContent>
    </Card>
  );
}

export function AssetCard({
  asset,
  showOwner,
  onClick,
}: {
  asset: AssetRecord;
  showOwner?: boolean;
  onClick?: () => void;
}) {
  const isMobile = useIsMobile();
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        'rounded-lg border border-border bg-background transition-shadow',
        onClick &&
          'cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isMobile ? 'min-h-[140px]' : 'min-h-[180px]'
      )}
    >
      <CardContent
        className={cn(
          'flex h-full flex-col justify-between gap-3',
          isMobile ? 'p-3' : 'p-4'
        )}
      >
        <div className="min-w-0 space-y-1">
          <div className="flex items-start gap-2">
            <Boxes className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="truncate font-medium leading-tight text-foreground">{assetTitle(asset)}</p>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {asset.brand} {asset.modelNumber}
          </p>
          <p className="truncate text-xs text-muted-foreground">Serial {asset.serialNumber}</p>
          {showOwner ? (
            <p className="truncate text-xs text-muted-foreground">{assetOwnerLabel(asset)}</p>
          ) : null}
        </div>
        <Badge variant="secondary" className="w-fit">
          {assetCategoryLabel(asset.category)}
        </Badge>
      </CardContent>
    </Card>
  );
}
