'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { format } from 'date-fns';
import type { LeadListItem } from '@/api/types/leads';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2Icon, CircleIcon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import {
  LEAD_STATUS_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LEAD_TEMPERATURE_OPTIONS,
  LEAD_PRIORITY_OPTIONS,
} from '@/lib/lead-form-utils';

function getIconForValue<T extends { value: string; icon: React.ComponentType<{ className?: string }> }>(
  options: T[],
  value: string | undefined
): React.ComponentType<{ className?: string }> {
  const opt = options.find((o) => o.value === value);
  return opt?.icon ?? CircleIcon;
}

const LEAD_STATUS_ICON_COLORS: Record<string, string> = {
  APPROVED: 'text-green-600',
  CONVERTED: 'text-green-600',
  DECLINED: 'text-red-600',
  CANCELLED: 'text-red-600',
  PENDING: 'text-amber-600',
  REVIEW: 'text-amber-600',
};

const LEAD_SOURCE_ICON_COLORS: Record<string, string> = {
  WEBSITE: 'text-blue-600',
  COLD_CALL: 'text-amber-600',
  REFERRAL: 'text-green-600',
  SOCIAL_MEDIA: 'text-purple-600',
  EMAIL_CAMPAIGN: 'text-blue-600',
  TRADE_SHOW: 'text-amber-600',
  ADVERTISING: 'text-amber-600',
  OTHER: 'text-muted-foreground',
};

const LEAD_TEMPERATURE_ICON_COLORS: Record<string, string> = {
  HOT: 'text-red-600',
  WARM: 'text-amber-600',
  COLD: 'text-gray-500',
  FROZEN: 'text-slate-400',
};

const LEAD_PRIORITY_ICON_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-600',
  HIGH: 'text-amber-600',
  MEDIUM: 'text-gray-500',
  LOW: 'text-green-600',
};

function optionCell(
  value: string | undefined,
  options: { value: string; icon: React.ComponentType<{ className?: string }> }[],
  colorMap?: Record<string, string>
): ReactNode {
  const Icon = getIconForValue(options, value);
  const display = value || '-';
  const iconColor = (value && colorMap?.[value]) ?? 'text-muted-foreground';
  return (
    <span className="flex items-center gap-2">
      <Icon className={cn('size-3 shrink-0', iconColor)} />
      <span>{display}</span>
    </span>
  );
}

function priorityCell(value: string | undefined): ReactNode {
  const display = value || '-';
  const badgeClass =
    value === 'CRITICAL'
      ? 'bg-red-100 text-red-800'
      : value === 'HIGH'
        ? 'bg-amber-100 text-amber-800'
        : value === 'MEDIUM'
          ? 'bg-gray-100 text-gray-800'
          : value === 'LOW'
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800';
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', badgeClass)}>
      {display}
    </span>
  );
}

function ownerDisplay(lead: LeadListItem): ReactNode {
  const o = lead.owner;
  if (!o) return '-';
  const fullName =
    [o.name, o.surname].filter(Boolean).join(' ').trim() || o.email || '-';
  const imgSrc = o.photoURL ?? o.avatar ?? undefined;
  return (
    <span className="flex items-center gap-2">
      <Avatar className="size-6 shrink-0">
        <AvatarImage src={imgSrc} alt={fullName} />
        <AvatarFallback className="text-xs">
          {fullName !== '-' ? fullName.slice(0, 2).toUpperCase() : '-'}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{fullName}</span>
    </span>
  );
}

export interface LeadsTableProps {
  leads: LeadListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  /** Called when a lead row is clicked. */
  onLeadClick?: (lead: LeadListItem) => void;
}

export function LeadsTable({
  leads,
  isLoading = false,
  emptyMessage = 'No leads match your filters.',
  onLeadClick,
}: LeadsTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  const sortedLeads = useMemo(
    () =>
      [...leads].sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [leads]
  );

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead className="whitespace-nowrap">Name</TableHead>
            <TableHead className="whitespace-nowrap">Company</TableHead>
            <TableHead className="whitespace-nowrap">Status</TableHead>
            <TableHead className="whitespace-nowrap">Source</TableHead>
            <TableHead className="whitespace-nowrap">Temperature</TableHead>
            <TableHead className="whitespace-nowrap">Priority</TableHead>
            <TableHead className="whitespace-nowrap">Owner</TableHead>
            <TableHead className="whitespace-nowrap">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&>tr:nth-child(odd)]:bg-gray-50">
          {sortedLeads.map((lead) => (
            <TableRow
              key={lead.uid}
              className={cn(
                'border-b-0',
                onLeadClick &&
                  'cursor-pointer transition-colors hover:bg-gray-100 focus-within:bg-gray-100'
              )}
              role={onLeadClick ? 'button' : undefined}
              tabIndex={onLeadClick ? 0 : undefined}
              onClick={() => onLeadClick?.(lead)}
              onKeyDown={(e) => {
                if (onLeadClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onLeadClick(lead);
                }
              }}
            >
              <TableCell className="whitespace-nowrap text-sm">
                {lead.name?.trim() || '-'}
              </TableCell>
              <TableCell className="min-w-0 text-sm">
                {lead.companyName?.trim() || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {optionCell(lead.status, LEAD_STATUS_OPTIONS, LEAD_STATUS_ICON_COLORS)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {optionCell(lead.source, LEAD_SOURCE_OPTIONS, LEAD_SOURCE_ICON_COLORS)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {optionCell(lead.temperature, LEAD_TEMPERATURE_OPTIONS, LEAD_TEMPERATURE_ICON_COLORS)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {priorityCell(lead.priority)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {ownerDisplay(lead)}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {lead.createdAt &&
                !Number.isNaN(new Date(lead.createdAt).getTime())
                  ? format(new Date(lead.createdAt), 'MMM d, yyyy')
                  : '-'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
