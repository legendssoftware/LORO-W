'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { DateRange } from 'react-day-picker';
import { ArrowLeftRight, Banknote, CreditCard, Package, Wallet } from 'lucide-react';
import type {
  PerformanceFilterOption,
  PerformanceFilters,
  PerformanceMasterData,
} from '@/api/types/reports-performance';
import { useUsers } from '@/api/hooks/use-users';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { formatDateRangeLabel, getPerformanceDatePresets, parseLocalYmd } from '../lib/dates';
import { PERFORMANCE_FILTER_COUNTRIES } from '../lib/constants';
import { getDefaultPerformanceFilters } from '../lib/performance-filters';
import {
  buildSalespersonPhotoMap,
  photoForSalesperson,
  salespersonInitials,
} from '../lib/salesperson-avatars';
import { useIsMdUp } from '../lib/use-media-md';

interface PerformanceFiltersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: PerformanceFilters;
  masterData?: PerformanceMasterData;
  onApply: (filters: PerformanceFilters) => void;
}

function toggleId(list: string[] | undefined, id: string): string[] {
  const current = list ?? [];
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
}

function isUsableFilterId(id: string | undefined | null): boolean {
  const trimmed = id?.trim() ?? '';
  return trimmed.length > 0 && trimmed !== '.';
}

function dedupeFilterOptions(options: PerformanceFilterOption[]): PerformanceFilterOption[] {
  const seen = new Set<string>();
  const result: PerformanceFilterOption[] = [];
  for (const option of options) {
    if (!isUsableFilterId(option.id)) continue;
    if (seen.has(option.id)) continue;
    seen.add(option.id);
    result.push(option);
  }
  return result;
}

function paymentMethodIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('cash')) return Banknote;
  if (n.includes('eft') || n.includes('transfer') || n.includes('debit order')) {
    return ArrowLeftRight;
  }
  if (
    n.includes('account') ||
    n.includes('credit') ||
    n.includes('card') ||
    n.includes('visa') ||
    n.includes('master')
  ) {
    return CreditCard;
  }
  return Wallet;
}

function OptionChecklist({
  title,
  options,
  selected,
  onToggle,
  searchPlaceholder,
  renderLeading,
}: {
  title: string;
  options: PerformanceFilterOption[];
  selected: string[] | undefined;
  onToggle: (id: string) => void;
  searchPlaceholder: string;
  renderLeading?: (option: PerformanceFilterOption) => ReactNode;
}) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const usable = dedupeFilterOptions(options);
    const q = query.trim().toLowerCase();
    if (!q) return usable;
    return usable.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        (o.code ?? '').toLowerCase().includes(q)
    );
  }, [options, query]);

  if (options.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
      />
      <ScrollArea className="h-36 rounded-md border">
        <div className="space-y-1 p-2">
          {filtered.map((option, index) => {
            const checked = selected?.includes(option.id) ?? false;
            return (
              <label
                key={`${option.id}-${index}`}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(option.id)}
                />
                {renderLeading?.(option)}
                <span className="min-w-0 truncate">{option.name}</span>
              </label>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export function PerformanceFiltersDialog({
  open,
  onOpenChange,
  currentFilters,
  masterData,
  onApply,
}: PerformanceFiltersDialogProps) {
  const [draft, setDraft] = useState<PerformanceFilters>(currentFilters);
  const [checkedCustomerCategories, setCheckedCustomerCategories] = useState<Set<string>>(
    new Set()
  );
  const usersQuery = useUsers({ enabled: open, limit: 500 });
  const photoByName = useMemo(
    () => buildSalespersonPhotoMap(usersQuery.data ?? []),
    [usersQuery.data]
  );

  const categoryIds = useMemo(
    () =>
      dedupeFilterOptions(masterData?.customerCategories ?? [])
        .map((c) => c.id)
        .filter(isUsableFilterId),
    [masterData?.customerCategories]
  );

  useEffect(() => {
    if (!open) return;
    setDraft(currentFilters);
    if (categoryIds.length === 0) {
      setCheckedCustomerCategories(new Set());
      return;
    }
    const excluded = currentFilters.excludeCustomerCategories ?? [];
    if (excluded.length > 0) {
      setCheckedCustomerCategories(new Set(categoryIds.filter((id) => !excluded.includes(id))));
    } else {
      setCheckedCustomerCategories(new Set(categoryIds));
    }
  }, [open, currentFilters, categoryIds]);

  const start = parseLocalYmd(draft.dateRange?.startDate ?? '');
  const end = parseLocalYmd(draft.dateRange?.endDate ?? '');
  const calendarRange: DateRange = { from: start, to: end };
  const presets = getPerformanceDatePresets();
  const isMdUp = useIsMdUp();

  function applyDraft() {
    const next: PerformanceFilters = { ...draft };
    if (!next.countries?.length || next.countries.length === PERFORMANCE_FILTER_COUNTRIES.length) {
      next.countries = undefined;
    }
    if (!next.branchIds?.length) next.branchIds = undefined;
    if (!next.salesPersonIds?.length) next.salesPersonIds = undefined;
    if (!next.paymentMethodIds?.length) next.paymentMethodIds = undefined;
    if (!next.product?.productIds?.length && !next.product?.category) next.product = undefined;
    if (categoryIds.length > 0) {
      const excluded = categoryIds.filter((id) => !checkedCustomerCategories.has(id));
      next.excludeCustomerCategories = excluded.length > 0 ? excluded : undefined;
      next.includeCustomerCategories = undefined;
    }
    onApply(next);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader>
          <DialogTitle>Performance filters</DialogTitle>
          <DialogDescription>
            Narrow ERP sales by date, country, branch, salesperson, and category.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="space-y-2">
            <Label>Date range</Label>
            <p className="text-xs text-muted-foreground">
              {draft.dateRange
                ? formatDateRangeLabel(draft.dateRange.startDate, draft.dateRange.endDate)
                : 'Select dates'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  type="button"
                  size="sm"
                  variant={
                    draft.dateRange?.startDate === preset.startDate &&
                    draft.dateRange?.endDate === preset.endDate
                      ? 'default'
                      : 'outline'
                  }
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      dateRange: { startDate: preset.startDate, endDate: preset.endDate },
                    }))
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              mode="range"
              className="w-full"
              classNames={{
                root: 'w-full',
                months: 'flex w-full flex-col gap-4 md:flex-row relative',
              }}
              selected={calendarRange}
              numberOfMonths={isMdUp ? 2 : 1}
              onSelect={(range) => {
                if (!range?.from) return;
                const startDate = `${range.from.getFullYear()}-${String(range.from.getMonth() + 1).padStart(2, '0')}-${String(range.from.getDate()).padStart(2, '0')}`;
                const endDate = range.to
                  ? `${range.to.getFullYear()}-${String(range.to.getMonth() + 1).padStart(2, '0')}-${String(range.to.getDate()).padStart(2, '0')}`
                  : startDate;
                setDraft((prev) => ({ ...prev, dateRange: { startDate, endDate } }));
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Countries</Label>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
              {PERFORMANCE_FILTER_COUNTRIES.map((country) => {
                const checked = draft.countries?.includes(country.id) ?? false;
                const flag = getCountryFlag(country.id).flag;
                return (
                  <label
                    key={country.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        setDraft((prev) => ({
                          ...prev,
                          countries: toggleId(prev.countries, country.id),
                        }))
                      }
                    />
                    <span aria-hidden className="text-base leading-none">
                      {flag}
                    </span>
                    {country.name}
                  </label>
                );
              })}
            </div>
          </div>

          <OptionChecklist
            title="Branches"
            options={masterData?.branches ?? []}
            selected={draft.branchIds}
            onToggle={(id) =>
              setDraft((prev) => ({ ...prev, branchIds: toggleId(prev.branchIds, id) }))
            }
            searchPlaceholder="Search branches"
            renderLeading={(option) => (
              <span aria-hidden className="text-base leading-none">
                {getCountryFlag(option.countryCode ?? 'SA').flag}
              </span>
            )}
          />
          <OptionChecklist
            title="Salespeople"
            options={masterData?.salespeople ?? []}
            selected={draft.salesPersonIds}
            onToggle={(id) =>
              setDraft((prev) => ({
                ...prev,
                salesPersonIds: toggleId(prev.salesPersonIds, id),
              }))
            }
            searchPlaceholder="Search salespeople"
            renderLeading={(option) => {
              const photo = photoForSalesperson(option.name, photoByName);
              const initials = salespersonInitials(option.name);
              return (
                <Avatar size="sm" className="shrink-0">
                  {photo ? <AvatarImage src={photo} alt={option.name} /> : null}
                  <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
                </Avatar>
              );
            }}
          />
          <OptionChecklist
            title="Payment methods"
            options={masterData?.paymentMethods ?? []}
            selected={draft.paymentMethodIds}
            onToggle={(id) =>
              setDraft((prev) => ({
                ...prev,
                paymentMethodIds: toggleId(prev.paymentMethodIds, id),
              }))
            }
            searchPlaceholder="Search payment methods"
            renderLeading={(option) => {
              const Icon = paymentMethodIcon(option.name);
              return <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />;
            }}
          />
          <OptionChecklist
            title="Products"
            options={masterData?.products ?? []}
            selected={draft.product?.productIds}
            onToggle={(id) =>
              setDraft((prev) => ({
                ...prev,
                product: {
                  ...prev.product,
                  productIds: toggleId(prev.product?.productIds, id),
                },
              }))
            }
            searchPlaceholder="Search products"
            renderLeading={() => (
              <Package className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
          />

          {(masterData?.customerCategories ?? []).length > 0 ? (
            <div className="space-y-2">
              <Label>Customer categories</Label>
              <p className="text-xs text-muted-foreground">
                Uncheck a category to exclude it from the report.
              </p>
              <ScrollArea className="h-36 rounded-md border">
                <div className="space-y-1 p-2">
                  {dedupeFilterOptions(masterData?.customerCategories ?? []).map((category, index) => (
                    <label
                      key={`${category.id}-${index}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checkedCustomerCategories.has(category.id)}
                        onCheckedChange={(checked) => {
                          setCheckedCustomerCategories((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(category.id);
                            else next.delete(category.id);
                            return next;
                          });
                        }}
                      />
                      <span className="min-w-0 truncate">{category.name}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="cancel"
            onClick={() => {
              setDraft(getDefaultPerformanceFilters());
              setCheckedCustomerCategories(new Set(categoryIds));
            }}
          >
            Reset
          </Button>
          <Button type="button" variant="success" onClick={applyDraft}>
            Apply filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
