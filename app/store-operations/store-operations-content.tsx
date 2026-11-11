'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CalendarIcon,
  CheckCircle2,
  ChevronsUpDown,
  Clock3,
  Filter,
  Globe,
  Info,
  LayoutDashboard,
  List,
  MapPin,
  MapPinned,
  Store,
} from 'lucide-react';
import { useSessionSync, useStoreOperationsDashboard, useTokenReady } from '@/api/hooks';
import { getBranchDisplayLabel } from '@/api/types/branch';
import type { StoreOperationsMapPoint, StoreOperationsStore } from '@/api/types/store-operations';
import {
  SearchableOptionListPicker,
  reportsFilterPortalHighZ,
  reportsFilterSelectTriggerClass,
  type SearchableOptionRow,
} from '@/components/filters/searchable-filter-comboboxes';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Map as MapView, MapControls, MapMarker, MarkerContent } from '@/components/ui/map';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LeadsListPagination,
  type LeadsPageSize,
} from '@/app/leads/components/leads-list-pagination';
import { canAccessStoreOperations } from '@/lib/access';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { XIcon } from '@/lib/icons';
import {
  defaultDateRange,
  formatIsoToDisplay,
  parseFlexibleDate,
  toIsoDateString,
} from '@/lib/user-form/date-input';
import { cn } from '@/lib/utils';

const FEATURES = [
  { title: 'GPS & Geofencing', body: 'Open and close only inside the branch radius (100 m unless a branch overrides it).' },
  { title: 'Automatic Alerts', body: 'A late opening is raised 10 minutes after the scheduled open.' },
  { title: 'Configurable Checklists', body: 'Opening and closing items are stored per organisation.' },
  { title: 'Stock Take (Cycle Count)', body: 'The catalogue is split into three daily cycles.' },
  { title: 'KPIs & Performance', body: 'Punctuality, compliance, checklist, stock take, and incidents, month to date.' },
  { title: 'Roles & Approvals', body: 'Store staff use the mobile flow. This dashboard is for managers and above.' },
  { title: 'Legend ERP Integration', body: 'Closing asks the team to confirm transactions were synced to ERP.' },
] as const;

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  closed: 'Closed',
  missed: 'Missed',
  not_open: 'Not open',
  not_scheduled: 'Not scheduled',
};

const ALL_FILTER = 'all';
const FILTER_TRIGGER_CLASS = 'h-9 min-w-0 w-[160px] shrink-0';
const FILTER_TRIGGER_STACK = 'h-9 w-full min-w-0';
const TAB_LIST_CLASS =
  'mb-4 h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 text-muted-foreground';
const TAB_TRIGGER_CLASS = cn(
  'relative inline-flex h-auto items-center gap-2 rounded-none border-0 border-b-2 border-transparent',
  'bg-transparent px-3 pb-2.5 pt-1.5 text-sm font-medium text-muted-foreground shadow-none',
  'ring-offset-background transition-colors hover:text-foreground',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  'data-[state=active]:border-violet-600 data-[state=active]:bg-transparent',
  'data-[state=active]:text-foreground data-[state=active]:shadow-none',
);

export function StoreOperationsContent() {
  const { isTokenReady } = useTokenReady();
  const { backendUserData, isSyncing } = useSessionSync();
  const accessLevel = typeof backendUserData?.accessLevel === 'string' ? backendUserData.accessLevel : undefined;
  const allowed = canAccessStoreOperations(accessLevel);
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [country, setCountry] = useState(ALL_FILTER);
  const [region, setRegion] = useState(ALL_FILTER);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LeadsPageSize>(25);
  const [filtersDialogOpen, setFiltersDialogOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const [tab, setTab] = useState('overview');
  const query = useStoreOperationsDashboard(
    {
      date,
      ...(country !== ALL_FILTER ? { country } : {}),
      ...(region !== ALL_FILTER ? { region } : {}),
    },
    isTokenReady && allowed,
  );

  const countries = query.data?.filters.countries ?? [];
  const regions = query.data?.filters.regions ?? [];

  useEffect(() => {
    function onResize() {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        setFiltersDialogOpen(false);
      }
    }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [date, country, region, pageSize]);

  useEffect(() => {
    if (region === ALL_FILTER) return;
    if (!regions.includes(region)) setRegion(ALL_FILTER);
  }, [region, regions]);

  if (!isTokenReady || isSyncing) {
    return <LoadingSpinner wrapperClassName="py-24" />;
  }

  if (!allowed) {
    return (
      <main className="container mx-auto max-w-8xl px-3 py-8 sm:px-6">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">Store operations</h1>
        <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
          You do not have access to the store operations dashboard.
        </p>
      </main>
    );
  }

  const data = query.data;
  const stores = data?.stores ?? [];
  const total = stores.length;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const pagedStores = stores.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <main className="container mx-auto flex min-h-0 max-w-8xl flex-1 flex-col overflow-y-auto px-3 py-5 sm:px-6 sm:py-8">
        <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
              Store Operations Dashboard – All Stores
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Live branch openings, checklists, and stock counts.
            </p>
          </div>
        </div>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className={TAB_LIST_CLASS}>
            <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
              <LayoutDashboard className="size-4" aria-hidden />
              Overview
            </TabsTrigger>
            <TabsTrigger value="details" className={TAB_TRIGGER_CLASS}>
              <List className="size-4" aria-hidden />
              Details
            </TabsTrigger>
          </TabsList>

        <div className="mb-4 flex shrink-0 flex-col gap-3">
          <div className="flex flex-col gap-2 md:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-9 w-full min-w-0 justify-center border-border bg-background text-foreground"
              onClick={() => setFiltersDialogOpen(true)}
            >
              <Filter className="mr-2 size-4 shrink-0" aria-hidden />
              Filter
            </Button>
            <div className="flex justify-end">
              <FeaturesButton onClick={() => setFeaturesOpen(true)} />
            </div>
          </div>

          <Dialog open={filtersDialogOpen} onOpenChange={setFiltersDialogOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Filters</DialogTitle>
                <DialogDescription>
                  Narrow stores by country, region, and period.
                </DialogDescription>
              </DialogHeader>
              <StoreOperationsFilterControls
                layout="stack"
                date={date}
                onDateChange={setDate}
                country={country}
                onCountryChange={setCountry}
                countries={countries}
                region={region}
                onRegionChange={setRegion}
                regions={regions}
              />
            </DialogContent>
          </Dialog>

          <div className="hidden w-full min-w-0 items-center justify-between gap-3 md:flex">
            <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <StoreOperationsFilterControls
                layout="row"
                date={date}
                onDateChange={setDate}
                country={country}
                onCountryChange={setCountry}
                countries={countries}
                region={region}
                onRegionChange={setRegion}
                regions={regions}
              />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <FeaturesButton onClick={() => setFeaturesOpen(true)} />
            </div>
          </div>
        </div>

        <FeaturesDialog open={featuresOpen} onOpenChange={setFeaturesOpen} />

        {query.isError ? (
          <QueryErrorBanner
            className="mb-4 shrink-0"
            message={getQueryErrorMessage(query.error)}
            onRetry={() => query.refetch()}
          />
        ) : null}

        {query.isLoading ? <LoadingSpinner wrapperClassName="py-16" /> : null}

        {data ? (
          <>
            <TabsContent value="overview" className="mt-0 flex min-h-0 flex-1 flex-col outline-none">
              <section className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                <SummaryCard label="Total Stores" value={String(data.summary.totalStores)} />
                <SummaryCard label="Opened On Time" value={String(data.summary.openedOnTime)} hint={formatPercent(data.summary.openedOnTimePercent)} />
                <SummaryCard label="Late Opening" value={String(data.summary.lateOpenings)} hint={formatPercent(data.summary.latePercent)} />
                <SummaryCard label="Missed Openings" value={String(data.summary.missedOpenings)} />
                <SummaryCard label="Closed On Time" value={String(data.summary.closedOnTime)} hint={formatPercent(data.summary.closedOnTimePercent)} />
                <SummaryCard label="Checklists Completed" value={String(data.summary.checklistsCompleted)} hint={formatPercent(data.summary.checklistsPercent)} />
              </section>

              <div className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
                <h2 className="shrink-0 border-b border-border px-4 py-3 text-sm font-semibold">
                  Store Status (Real-Time)
                </h2>
                <div className="min-h-0 flex-1 overflow-auto">
                  {stores.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No stores match these filters.
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Store</TableHead>
                          <TableHead className="whitespace-nowrap">Country</TableHead>
                          <TableHead className="whitespace-nowrap">Scheduled Open</TableHead>
                          <TableHead className="whitespace-nowrap">Actual Open</TableHead>
                          <TableHead className="whitespace-nowrap">Scheduled Close</TableHead>
                          <TableHead className="whitespace-nowrap">Actual Close</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap">Checklist</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedStores.map((store) => (
                          <StoreRow key={store.branchUid} store={store} />
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
                <LeadsListPagination
                  page={total > 0 ? safePage : 0}
                  totalPages={totalPages}
                  total={total}
                  pageSize={pageSize}
                  isFetching={query.isFetching && !query.isLoading}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-0 flex min-h-0 flex-1 flex-col gap-4 outline-none">
              <div className="grid shrink-0 gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-3 text-sm font-semibold">Store Operations KPIs (MTD)</h2>
                  <div className="flex flex-col gap-3">
                    {data.kpis.map((kpi) => (
                      <div key={kpi.key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{kpi.label}</span>
                          <span>{formatPercent(kpi.percent)}</span>
                        </div>
                        <Progress value={kpi.percent ?? 0} />
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-4">
                  <h2 className="mb-3 text-sm font-semibold">Alerts ({data.alerts.length})</h2>
                  {data.alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No alerts for this day.</p>
                  ) : (
                    <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
                      {data.alerts.map((alert) => (
                        <li key={`${alert.branchUid}-${alert.title}`} className="rounded-lg border border-border p-3">
                          <p className="flex items-center gap-2 text-sm font-medium">
                            {alert.severity === 'danger' ? (
                              <AlertTriangle className="size-4 text-destructive" aria-hidden />
                            ) : (
                              <Clock3 className="size-4 text-amber-600" aria-hidden />
                            )}
                            {alert.title}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              {tab === 'details' ? (
                <StoreMap
                  stores={stores}
                  points={data.map}
                  isError={query.isError}
                  errorMessage={getQueryErrorMessage(query.error)}
                  onRetry={() => query.refetch()}
                />
              ) : null}
            </TabsContent>
          </>
        ) : null}
        </Tabs>
      </main>
    </div>
  );
}

function StoreOperationsFilterControls({
  layout,
  date,
  onDateChange,
  country,
  onCountryChange,
  countries,
  region,
  onRegionChange,
  regions,
}: {
  layout: 'row' | 'stack';
  date: string;
  onDateChange: (value: string) => void;
  country: string;
  onCountryChange: (value: string) => void;
  countries: string[];
  region: string;
  onRegionChange: (value: string) => void;
  regions: string[];
}) {
  const row = layout === 'row';
  const triggerClass = row ? FILTER_TRIGGER_CLASS : FILTER_TRIGGER_STACK;
  const today = format(new Date(), 'yyyy-MM-dd');
  const countryOptions = useMemo<SearchableOptionRow[]>(
    () => countries.map((value) => ({
      value,
      label: value,
      icon: <Globe className="size-4 shrink-0" />,
    })),
    [countries],
  );
  const regionOptions = useMemo<SearchableOptionRow[]>(
    () => regions.map((value) => ({
      value,
      label: value,
      icon: <MapPinned className="size-4 shrink-0" />,
    })),
    [regions],
  );

  return (
    <div className={row ? 'flex flex-nowrap items-center gap-2' : 'flex w-full flex-col gap-4'}>
      <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={country}
          onValueChange={onCountryChange}
          options={countryOptions}
          allOptionValue={ALL_FILTER}
          placeholderLabelWhenAll="All countries"
          searchPlaceholder="Search countries…"
          emptyMessage="No country found."
          triggerIcon={<Globe className="size-4 shrink-0" />}
          triggerClassName={triggerClass}
        />
        {country !== ALL_FILTER ? (
          <ClearFilterButton label="Clear country filter" onClick={() => onCountryChange(ALL_FILTER)} />
        ) : null}
      </div>

      <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
        <SearchableOptionListPicker
          selectedValue={region}
          onValueChange={onRegionChange}
          options={regionOptions}
          allOptionValue={ALL_FILTER}
          placeholderLabelWhenAll="All regions"
          searchPlaceholder="Search regions…"
          emptyMessage="No region found."
          triggerIcon={<MapPinned className="size-4 shrink-0" />}
          triggerClassName={triggerClass}
        />
        {region !== ALL_FILTER ? (
          <ClearFilterButton label="Clear region filter" onClick={() => onRegionChange(ALL_FILTER)} />
        ) : null}
      </div>

      <PeriodPicker
        layout={layout}
        value={date}
        onChange={onDateChange}
        showClear={date !== today}
        onClear={() => onDateChange(today)}
      />
    </div>
  );
}

function PeriodPicker({
  layout,
  value,
  onChange,
  showClear,
  onClear,
}: {
  layout: 'row' | 'stack';
  value: string;
  onChange: (value: string) => void;
  showClear: boolean;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = parseFlexibleDate(value) ?? undefined;
  const range = defaultDateRange();
  const row = layout === 'row';
  const triggerLabel = formatIsoToDisplay(value) || 'Period';

  return (
    <div className={cn('flex min-w-0 items-center gap-1', !row && 'w-full')}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Period"
            title={triggerLabel}
            className={cn(
              reportsFilterSelectTriggerClass,
              'justify-between font-normal',
              row ? FILTER_TRIGGER_CLASS : FILTER_TRIGGER_STACK,
            )}
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{triggerLabel}</span>
            </span>
            <ChevronsUpDown className="ml-1 size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className={cn('w-auto p-3', reportsFilterPortalHighZ)} align="start">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? range.defaultMonth}
            startMonth={range.startMonth}
            endMonth={range.endMonth}
            onSelect={(next) => {
              if (!next) return;
              onChange(toIsoDateString(next));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {showClear ? <ClearFilterButton label="Reset period to today" onClick={onClear} /> : null}
    </div>
  );
}

function ClearFilterButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded p-0.5 hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:pointer-events-auto"
      aria-label={label}
    >
      <XIcon className="size-4 text-muted-foreground" />
    </button>
  );
}

function FeaturesButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 border-border bg-background text-foreground hover:bg-accent"
          onClick={onClick}
          aria-label="Key features and controls"
        >
          <Info className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Key features & controls</TooltipContent>
    </Tooltip>
  );
}

function FeaturesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Key Features & Controls</DialogTitle>
          <DialogDescription>
            How store openings, checklists, and stock counts work.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-3">
          {FEATURES.map((feature) => (
            <li key={feature.title}>
              <p className="text-sm font-medium">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.body}</p>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {hint ? <p className="text-xs font-medium">{hint}</p> : null}
    </article>
  );
}

function StoreRow({ store }: { store: StoreOperationsStore }) {
  const label = getBranchDisplayLabel({ name: store.name, alias: store.alias });
  return (
    <TableRow>
      <TableCell className="max-w-[12rem] font-medium">
        <span className="inline-flex max-w-full items-center gap-2">
          <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate" title={store.name}>
            {label || store.name}
          </span>
        </span>
      </TableCell>
      <TableCell className="whitespace-nowrap">{store.country || '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{store.scheduledOpen ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{store.actualOpen ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{store.scheduledClose ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap">{store.actualClose ?? '—'}</TableCell>
      <TableCell className="whitespace-nowrap">
        <Badge variant={store.status === 'open' ? 'default' : 'secondary'}>
          {STATUS_LABEL[store.status] ?? store.status}
        </Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap">{store.checklistPercent}%</TableCell>
    </TableRow>
  );
}

function StoreMap({
  stores,
  points,
  isError,
  errorMessage,
  onRetry,
}: {
  stores: StoreOperationsStore[];
  points: StoreOperationsMapPoint[];
  isError: boolean;
  errorMessage: string;
  onRetry: () => void;
}) {
  const markers = useMemo(() => {
    const byUid = new Map(stores.map((store) => [store.branchUid, store]));
    return points.map((point) => {
      const store = byUid.get(point.branchUid);
      const label = getBranchDisplayLabel({ name: store?.name ?? point.name, alias: store?.alias });
      return {
        ...point,
        label: label || point.name,
        punctuality: store ? openingPunctuality(store) : null,
      };
    });
  }, [points, stores]);
  const openedMarkers = markers.filter((marker) => marker.punctuality != null);
  const center = useMemo<[number, number]>(() => {
    if (markers.length === 0) return [28.0473, -26.2041];
    const lng = markers.reduce((sum, point) => sum + point.lng, 0) / markers.length;
    const lat = markers.reduce((sum, point) => sum + point.lat, 0) / markers.length;
    return [lng, lat];
  }, [markers]);

  return (
    <section className="flex min-h-[28rem] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <h2 className="shrink-0 border-b border-border px-4 py-3 text-sm font-semibold">
        Store Map – Operating Status
      </h2>
      {isError ? (
        <div className="p-4">
          <QueryErrorBanner message={errorMessage} onRetry={onRetry} />
        </div>
      ) : markers.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No branches have coordinates for this filter.
        </p>
      ) : openedMarkers.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
          No opening or closing times to plot for this day.
        </p>
      ) : (
        <div className="relative min-h-[28rem] flex-1">
          <MapView
            key={markers.map((marker) => marker.branchUid).join('-')}
            center={center}
            zoom={markers.length === 1 ? 11 : 5}
            className="absolute inset-0 size-full"
          >
            <MapControls showZoom />
            {markers.map((point) => (
              <MapMarker key={point.branchUid} longitude={point.lng} latitude={point.lat}>
                <MarkerContent>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-[11px]',
                      point.punctuality === 'on_time' && 'border-emerald-600 text-emerald-700',
                      point.punctuality === 'late' && 'border-red-600 text-red-700',
                      point.punctuality == null && 'border-border text-muted-foreground',
                    )}
                  >
                    <span
                      className={cn(
                        'size-2.5 shrink-0 rounded-full',
                        point.punctuality === 'on_time' && 'bg-emerald-500',
                        point.punctuality === 'late' && 'bg-red-500',
                        point.punctuality == null && 'bg-muted-foreground/40',
                      )}
                      aria-hidden
                    />
                    {point.punctuality === 'on_time' ? (
                      <CheckCircle2 className="size-3" aria-hidden />
                    ) : (
                      <MapPin className="size-3" aria-hidden />
                    )}
                    {point.label}
                  </span>
                </MarkerContent>
              </MapMarker>
            ))}
          </MapView>
        </div>
      )}
    </section>
  );
}

/** Green when actual open is on or before the schedule; red when it is later. */
function openingPunctuality(store: StoreOperationsStore): 'on_time' | 'late' | null {
  if (!store.actualOpen || !store.scheduledOpen) return null;
  return store.actualOpen > store.scheduledOpen ? 'late' : 'on_time';
}

function formatPercent(value: number | null): string {
  if (value == null) return 'No data';
  return `${value}%`;
}
