'use client';

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
import { Loader2Icon } from '@/lib/icons';

function ownerDisplay(lead: LeadListItem): string {
  const o = lead.owner;
  if (!o) return '-';
  const full = [o.name, o.surname].filter(Boolean).join(' ').trim();
  return full || o.email || '-';
}

export interface LeadsTableProps {
  leads: LeadListItem[];
  isLoading?: boolean;
  emptyMessage?: string;
}

export function LeadsTable({
  leads,
  isLoading = false,
  emptyMessage = 'No leads match your filters.',
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
          {leads.map((lead) => (
            <TableRow key={lead.uid} className="border-b-0">
              <TableCell className="whitespace-nowrap text-sm">
                {lead.name?.trim() || '-'}
              </TableCell>
              <TableCell className="min-w-0 text-sm">
                {lead.companyName?.trim() || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {lead.status || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {lead.source || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {lead.temperature || '-'}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {lead.priority || '-'}
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
