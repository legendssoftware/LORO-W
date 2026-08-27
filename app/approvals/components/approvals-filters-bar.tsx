'use client';

import { Filter } from 'lucide-react';
import { Input, filterToolbarSearchInputClassName } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  APPROVAL_STATUS_FILTERS,
  APPROVAL_TYPE_FILTERS,
} from '@/api/types/approvals';

export function ApprovalsFiltersBar({
  searchInput,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: {
  searchInput: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-0 flex-1 sm:max-w-sm">
        <Input
          value={searchInput}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search title, reference, or hire…"
          className={filterToolbarSearchInputClassName}
          aria-label="Search approvals"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-9 w-full border-border bg-background sm:w-[180px]">
          <Filter className="size-4 shrink-0 text-muted-foreground" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_STATUS_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="h-9 w-full border-border bg-background sm:w-[200px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          {APPROVAL_TYPE_FILTERS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
