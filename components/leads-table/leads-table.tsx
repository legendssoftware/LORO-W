'use client';

import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ChevronRight, Users } from 'lucide-react';
import type { LeadListItem } from '@/api/types/leads';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

export interface GroupedByOwner {
  ownerKey: string;
  owner?: LeadListItem['owner'] | null;
  leads: LeadListItem[];
  isUnassignedGroup?: boolean;
}

/** Stable key for grouping leads by owner. Prefer owner.uid; fallback to composite name|surname|email. */
function getOwnerKey(owner: LeadListItem['owner']): string {
  if (!owner) return '__unknown__';
  if (owner.uid != null) return String(owner.uid);
  const email = (owner.email ?? '').trim();
  const name = (owner.name ?? '').trim();
  const surname = (owner.surname ?? '').trim();
  return [email, name, surname].join('|') || '__unknown__';
}

/** Group leads by owner; sort groups by lead count (most first), leads within group by createdAt (newest first). */
function groupLeadsByOwner(leads: LeadListItem[]): GroupedByOwner[] {
  const map = new Map<string, LeadListItem[]>();
  for (const lead of leads) {
    const key = getOwnerKey(lead.owner);
    const list = map.get(key) ?? [];
    list.push(lead);
    map.set(key, list);
  }
  const grouped: GroupedByOwner[] = [];
  map.forEach((leadList, ownerKey) => {
    const sorted = [...leadList].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    grouped.push({
      ownerKey,
      owner: leadList[0]?.owner,
      leads: sorted,
    });
  });
  grouped.sort((a, b) => b.leads.length - a.leads.length);
  return grouped;
}

function buildGroupedRows(
  assignedLeads: LeadListItem[],
  unassignedLeads?: LeadListItem[]
): GroupedByOwner[] {
  const assignedGroups = groupLeadsByOwner(assignedLeads);
  if (!unassignedLeads?.length) {
    return assignedGroups;
  }
  const sorted = [...unassignedLeads].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });
  const first: GroupedByOwner = {
    ownerKey: '__unassigned__',
    owner: null,
    leads: sorted,
    isUnassignedGroup: true,
  };
  return [first, ...assignedGroups];
}

export interface LeadsTableProps {
  /** Leads that have an owner; unassigned are passed via `unassignedLeads`. */
  leads: LeadListItem[];
  /** Fetched from GET /leads/unassigned; rendered as the first group. */
  unassignedLeads?: LeadListItem[];
  /** `meta.total` from unassigned response (can exceed `unassignedLeads.length`). */
  unassignedTotal?: number;
  isLoading?: boolean;
  emptyMessage?: string;
  /** Called when a lead row is clicked. */
  onLeadClick?: (lead: LeadListItem) => void;
}

export function LeadsTable({
  leads,
  unassignedLeads,
  unassignedTotal,
  isLoading = false,
  emptyMessage = 'No leads match your filters.',
  onLeadClick,
}: LeadsTableProps) {
  const [expandedOwnerKey, setExpandedOwnerKey] = useState<string | null>(null);
  const groupedByOwner = useMemo(
    () => buildGroupedRows(leads, unassignedLeads),
    [leads, unassignedLeads]
  );

  const hasUnassigned = (unassignedLeads?.length ?? 0) > 0;
  const hasAssigned = leads.length > 0;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasUnassigned && !hasAssigned) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded border bg-white">
      <div className="divide-y divide-border">
        {groupedByOwner.map((group, index) => {
          const isExpanded = expandedOwnerKey === group.ownerKey;
          const contentId = `leads-${group.ownerKey}`;
          return (
            <div
              key={group.ownerKey}
              className={cn('rounded-sm', isExpanded && 'ring-1 ring-green-200')}
            >
              <Collapsible
                open={isExpanded}
                onOpenChange={(open) =>
                  setExpandedOwnerKey(open ? group.ownerKey : null)
                }
              >
                <CollapsibleTrigger
                  asChild
                  className="w-full"
                  aria-expanded={isExpanded}
                  aria-controls={contentId}
                >
                  <div
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 text-left cursor-pointer hover:bg-muted/50 transition-colors border-0 rounded-none',
                      index % 2 === 1 ? 'bg-gray-50/80' : 'bg-white',
                      isExpanded && 'bg-muted/30'
                    )}
                  >
                    <span className="flex items-start gap-2 whitespace-normal min-w-0 flex-1">
                      {group.isUnassignedGroup ? (
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Users className="size-4 text-muted-foreground" aria-hidden />
                          </span>
                          <span className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="font-medium text-foreground">
                              Unassigned
                            </span>
                            <Badge variant="secondary" className="text-xs font-medium">
                              Unassigned
                            </Badge>
                          </span>
                        </span>
                      ) : group.ownerKey === '__unknown__' ? (
                        <span className="text-muted-foreground font-medium">
                          Unknown
                        </span>
                      ) : (
                        ownerDisplay(group.leads[0])
                      )}
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0">
                      {(() => {
                        const totalForLabel =
                          group.isUnassignedGroup && unassignedTotal != null
                            ? unassignedTotal
                            : group.leads.length;
                        return (
                          <>
                            {totalForLabel} lead{totalForLabel !== 1 ? 's' : ''}
                            {group.isUnassignedGroup &&
                            unassignedTotal != null &&
                            unassignedTotal > group.leads.length ? (
                              <span className="ml-1 text-xs">
                                ({group.leads.length} in view)
                              </span>
                            ) : null}
                          </>
                        );
                      })()}
                    </span>
                    <ChevronRight
                      className={cn(
                        'size-5 shrink-0 text-muted-foreground transition-transform',
                        isExpanded && 'rotate-90'
                      )}
                      aria-hidden
                    />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent id={contentId} className="overflow-hidden">
                  <div className="bg-muted/20 border-t border-border overflow-x-auto">
                    <Table className="min-w-max">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Name</TableHead>
                          <TableHead className="whitespace-nowrap">Company</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Source</TableHead>
                          <TableHead className="whitespace-nowrap">Temperature</TableHead>
                          <TableHead className="whitespace-nowrap">Priority</TableHead>
                          <TableHead className="whitespace-nowrap">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="[&>tr:nth-child(odd)]:bg-gray-50/80">
                        {group.leads.map((lead) => (
                          <TableRow
                            key={lead.uid}
                            className={cn(
                              'border-b-0',
                              onLeadClick &&
                                'cursor-pointer transition-colors hover:bg-muted/50'
                            )}
                            role={onLeadClick ? 'button' : undefined}
                            tabIndex={onLeadClick ? 0 : undefined}
                            onClick={() => onLeadClick?.(lead)}
                            onKeyDown={(e) => {
                              if (
                                onLeadClick &&
                                (e.key === 'Enter' || e.key === ' ')
                              ) {
                                e.preventDefault();
                                onLeadClick(lead);
                              }
                            }}
                          >
                            <TableCell className="whitespace-nowrap text-sm">
                              <span className="flex items-center gap-2">
                                {group.isUnassignedGroup ? (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                                  >
                                    Unassigned
                                  </Badge>
                                ) : null}
                                <span>{lead.name?.trim() || '-'}</span>
                              </span>
                            </TableCell>
                            <TableCell className="min-w-0 text-sm">
                              {lead.companyName?.trim() || '-'}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {optionCell(
                                lead.status,
                                LEAD_STATUS_OPTIONS,
                                LEAD_STATUS_ICON_COLORS
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {optionCell(
                                lead.source,
                                LEAD_SOURCE_OPTIONS,
                                LEAD_SOURCE_ICON_COLORS
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {optionCell(
                                lead.temperature,
                                LEAD_TEMPERATURE_OPTIONS,
                                LEAD_TEMPERATURE_ICON_COLORS
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {priorityCell(lead.priority)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {lead.createdAt &&
                              !Number.isNaN(new Date(lead.createdAt).getTime())
                                ? format(
                                    new Date(lead.createdAt),
                                    'MMM d, yyyy'
                                  )
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          );
        })}
      </div>
    </div>
  );
}
