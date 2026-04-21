'use client';

import type { ComponentType, ReactNode } from 'react';
import { format, isSameDay, startOfMonth } from 'date-fns';
import { Map as MapIcon, List, Table2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, XIcon, UsersIcon, MapPinIcon, BriefcaseIcon } from '@/lib/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVisitsStore } from '@/store/visits-store';
import { cn } from '@/lib/utils';

export interface VisitHistoryUserRow {
  uid: number;
  name?: string | null;
  surname?: string | null;
  email?: string | null;
  photoURL?: string | null;
  avatar?: string | null;
}

/** Matches icons used in `TYPE_OF_BUSINESS_OPTIONS` (lucide + class components). */
export type VisitHistoryBusinessIcon = ComponentType<{ className?: string; size?: number }>;

export interface VisitHistoryToolbarProps {
  uniqueRegions: string[];
  uniqueBusinessTypes: string[];
  businessTypeLabelMap: Map<string, string>;
  businessTypeIconMap: Map<string, VisitHistoryBusinessIcon>;
  usersList: VisitHistoryUserRow[];
  visitsSummaryDisabled: boolean;
  onOpenVisitsSummary: () => void;
  /** When false, hides the visits summary (grid) button — e.g. if parent has no modal. */
  showVisitsSummaryButton?: boolean;
  /** When false, hides the table/map toggle (e.g. Reports Visualiser is map-only). Default true. */
  showMapTableToggle?: boolean;
  /** Default: visible "Visit history" heading. Pass null to omit. */
  sectionHeading?: ReactNode | null;
  /** When false, hides the user filter (e.g. self-scoped Reports visualiser). Default true. */
  showUserFilter?: boolean;
}

function VisitMapTableToggleButton() {
  const viewMode = useVisitsStore((s) => s.viewMode);
  const setViewMode = useVisitsStore((s) => s.setViewMode);
  return (
    <Button
      variant={viewMode === 'map' ? 'default' : 'outline'}
      size="sm"
      className="h-9 bg-white border-gray-200 text-foreground gap-1.5 shrink-0"
      onClick={() => setViewMode(viewMode === 'map' ? 'table' : 'map')}
    >
      {viewMode === 'map' ? (
        <>
          <List className="size-4" />
          View table
        </>
      ) : (
        <>
          <MapIcon className="size-4" />
          Visualiser
        </>
      )}
    </Button>
  );
}

/**
 * Shared filter bar for Visit History: date range, region, business type, user, search, table/map toggle.
 */
export function VisitHistoryToolbar({
  uniqueRegions,
  uniqueBusinessTypes,
  businessTypeLabelMap,
  businessTypeIconMap,
  usersList,
  visitsSummaryDisabled,
  onOpenVisitsSummary,
  showVisitsSummaryButton = true,
  showMapTableToggle = true,
  sectionHeading,
  showUserFilter = true,
}: VisitHistoryToolbarProps) {
  const {
    startDate,
    endDate,
    useAllTime,
    selectedRegion,
    selectedBusinessType,
    selectedUserUid,
    searchQuery,
    dateRangePopoverOpen,
    setDateRangePopoverOpen,
    setStartDate,
    selectEndDateAndClose,
    resetDateRangeToDefault,
    setUseAllTime,
    setSelectedRegion,
    setSelectedBusinessType,
    setSelectedUserUid,
    setSearchQuery,
  } = useVisitsStore();

  const heading =
    sectionHeading === undefined ? (
      <h2 className="text-lg font-medium text-foreground mb-4">Visit history</h2>
    ) : (
      sectionHeading
    );

  return (
    <>
      {heading}
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center gap-0">
            <Popover open={dateRangePopoverOpen} onOpenChange={setDateRangePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-full min-w-[140px] bg-white border-gray-200 text-foreground justify-center gap-2 sm:w-auto"
                >
                  <CalendarIcon className="size-4" />
                  {useAllTime
                    ? 'All time'
                    : startDate.getTime() === endDate.getTime()
                      ? format(startDate, 'MMM d, yyyy')
                      : `${format(startDate, 'MMM d, yyyy')} – ${format(endDate, 'MMM d, yyyy')}`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[10001] w-[80vw] max-w-[34rem] p-0" align="center">
                <div className="p-2 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant={useAllTime ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setUseAllTime(true)}
                    >
                      All time
                    </Button>
                    <span className="text-xs text-muted-foreground">or pick a date range below</span>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
                    <div>
                      <p className="text-sm font-medium">Start date</p>
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (d) {
                            setUseAllTime(false);
                            setStartDate(d);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">End date</p>
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (d) selectEndDateAndClose(d);
                        }}
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            {(() => {
              const now = new Date();
              const isDefaultRange =
                !useAllTime &&
                isSameDay(startDate, startOfMonth(now)) &&
                isSameDay(endDate, now);
              return useAllTime || !isDefaultRange ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    resetDateRangeToDefault();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      resetDateRangeToDefault();
                    }
                  }}
                  className="shrink-0 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600 cursor-pointer ml-0.5"
                  aria-label="Reset to this month"
                >
                  <XIcon className="size-4 text-red-600" />
                </span>
              ) : null;
            })()}
          </div>
          <Select
            value={selectedRegion || 'all'}
            onValueChange={(v) => setSelectedRegion(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-full min-w-[140px] bg-white border-gray-200 text-foreground gap-2 sm:w-[200px]">
              <MapPinIcon className="size-4 shrink-0" />
              <SelectValue placeholder="All regions" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All regions</SelectItem>
              {uniqueRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  <span className="flex items-center gap-2">
                    <MapPinIcon className="size-4 shrink-0" />
                    {region}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedBusinessType || 'all'}
            onValueChange={(v) => setSelectedBusinessType(v === 'all' ? '' : v)}
          >
            <SelectTrigger className="h-9 w-full min-w-[140px] bg-white border-gray-200 text-foreground gap-2 sm:w-[200px]">
              <BriefcaseIcon className="size-4 shrink-0" />
              <SelectValue placeholder="All business types" />
            </SelectTrigger>
            <SelectContent className="z-[10001]">
              <SelectItem value="all">All business types</SelectItem>
              {uniqueBusinessTypes.map((bt) => {
                const label = bt === 'Not set' ? 'Not set' : businessTypeLabelMap.get(bt) ?? bt;
                const IconComponent = businessTypeIconMap.get(bt) ?? MoreHorizontal;
                return (
                  <SelectItem key={bt} value={bt}>
                    <span className="flex items-center gap-2">
                      <IconComponent className="size-4 shrink-0" />
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {showUserFilter ? (
            <Select
              value={selectedUserUid || 'all'}
              onValueChange={(v) => setSelectedUserUid(v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 w-full min-w-[140px] bg-white border-gray-200 text-foreground gap-2 sm:w-[200px]">
                <UsersIcon className="size-4 shrink-0" />
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent className="z-[10001]">
                <SelectItem value="all">All users</SelectItem>
                {usersList.map((u) => {
                  const fullName =
                    [u.name, u.surname].filter(Boolean).join(' ').trim() || u.email || `User ${u.uid}`;
                  const imgSrc = u.photoURL ?? u.avatar ?? undefined;
                  return (
                    <SelectItem key={u.uid} value={String(u.uid)}>
                      <span className="flex items-center gap-2">
                        <Avatar className="size-6 shrink-0">
                          <AvatarImage src={imgSrc} alt={fullName} />
                          <AvatarFallback className="text-xs">
                            {fullName !== `User ${u.uid}` ? fullName.slice(0, 2).toUpperCase() : String(u.uid).slice(-2)}
                          </AvatarFallback>
                        </Avatar>
                        {fullName}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex w-full flex-nowrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 shrink basis-full sm:w-64 sm:basis-auto">
            <Input
              placeholder="Search visits…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                'w-full bg-white border-gray-200 text-foreground placeholder:text-gray-700 focus:outline-none focus:ring-0 focus-visible:ring-0 h-9',
                searchQuery && 'pr-8'
              )}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring text-red-600"
                aria-label="Clear search"
              >
                <XIcon className="size-4 text-red-600" />
              </button>
            ) : null}
          </div>
          {showMapTableToggle ? <VisitMapTableToggleButton /> : null}
          {showVisitsSummaryButton ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 w-9 p-0 bg-white border-gray-200 text-foreground shrink-0"
                  onClick={onOpenVisitsSummary}
                  disabled={visitsSummaryDisabled}
                  aria-label="View visits summary"
                >
                  <Table2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View visits summary</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </>
  );
}
