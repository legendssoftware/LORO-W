'use client';

import { useMemo, useState } from 'react';
import { Loader2, Table2 } from 'lucide-react';
import type {
  BranchCatchmentOpportunity,
  GreenfieldOpportunityZone,
  SiteOpportunityZone,
} from '@/api/types/site-opportunity';
import {
  formatZarShort,
  getPotentialBreakdown,
} from '@/lib/site-opportunity/format-potential';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { zAboveLeafletFullscreen } from '@/lib/z-index';

function getOpportunityName(zone: SiteOpportunityZone): string {
  return zone.kind === 'catchment' ? zone.branchName : zone.label;
}

function getOpportunityAddress(zone: SiteOpportunityZone): string {
  if (zone.kind === 'greenfield' && zone.address?.trim()) {
    return zone.address.trim();
  }
  if (zone.kind === 'catchment' && zone.address?.trim()) {
    return zone.address.trim();
  }
  return '—';
}

function formatNearestBranchKm(zone: SiteOpportunityZone): string {
  if (zone.kind === 'greenfield' && zone.nearestBranchKm != null) {
    return `${zone.nearestBranchKm.toFixed(1)} km`;
  }
  return '—';
}

function formatMonthlyZar(value: number): string {
  return `${formatZarShort(value)}/mo`;
}

export function SiteOpportunityTableDialog({
  catchments,
  greenfield,
  isLoading = false,
  isError = false,
  errorMessage,
  onSelectZone,
  disabled = false,
}: {
  catchments: BranchCatchmentOpportunity[];
  greenfield: GreenfieldOpportunityZone[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onSelectZone: (zone: SiteOpportunityZone) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () => [...catchments, ...greenfield].sort((a, b) => a.rank - b.rank),
    [catchments, greenfield],
  );

  function handleRowClick(zone: SiteOpportunityZone) {
    onSelectZone(zone);
    setOpen(false);
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-9 w-9 shrink-0 border-border bg-background p-0 text-foreground"
            disabled={disabled || isLoading}
            onClick={() => setOpen(true)}
            aria-label="View opportunities table"
          >
            <Table2 className="size-4" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>View opportunities table</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          overlayClassName={zAboveLeafletFullscreen}
          className={cn(
            zAboveLeafletFullscreen,
            'flex flex-col w-[80vw] max-w-[80vw] sm:max-w-[80vw] h-[80vh] max-h-[80vh] p-4 sm:p-6 pt-12 pr-14',
          )}
        >
          <DialogHeader className="shrink-0 !text-left">
            <DialogTitle>Opportunities</DialogTitle>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-auto -mx-1 px-1">
            {isError ? (
              <p className="text-sm text-destructive py-8 text-center px-2" role="alert">
                {errorMessage ?? 'Could not load suggested areas from the server.'}
              </p>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-5 animate-spin mr-2" />
                <span className="text-sm">Loading suggested areas…</span>
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No opportunities in this view.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Opportunity Name</TableHead>
                    <TableHead>Pool Value (R/mo)</TableHead>
                    <TableHead>Low (R/mo)</TableHead>
                    <TableHead>Avg (R/mo)</TableHead>
                    <TableHead>High (R/mo)</TableHead>
                    <TableHead>N# of competitors</TableHead>
                    <TableHead>N# of clients</TableHead>
                    <TableHead>Distance to nearest branch</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((zone) => {
                    const potential = getPotentialBreakdown(
                      zone.potentialLowZAR,
                      zone.potentialHighZAR,
                    );

                    return (
                      <TableRow
                        key={zone.id}
                        className={cn('cursor-pointer')}
                        onClick={() => handleRowClick(zone)}
                      >
                        <TableCell className="font-medium">
                          {getOpportunityName(zone)}
                        </TableCell>
                        <TableCell>
                          {formatMonthlyZar(zone.addressablePoolZAR)}
                        </TableCell>
                        <TableCell>{formatMonthlyZar(potential.low)}</TableCell>
                        <TableCell>{formatMonthlyZar(potential.avg)}</TableCell>
                        <TableCell>{formatMonthlyZar(potential.high)}</TableCell>
                        <TableCell>{zone.competitorCount}</TableCell>
                        <TableCell>{zone.clientCount}</TableCell>
                        <TableCell>{formatNearestBranchKm(zone)}</TableCell>
                        <TableCell className="max-w-[240px] whitespace-normal">
                          {getOpportunityAddress(zone)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
