'use client';

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Package,
  RotateCcw,
  Search,
} from 'lucide-react';
import { useStockTakeManagement } from '@/api/hooks';
import type {
  StockTakeBranch,
  StockTakeBranchStatus,
  StockTakeCategory,
  StockTakeLine,
  StockTakeLineStatus,
} from '@/api/types/store-operations';
import { LoadingSpinner } from '@/components/loading-spinner';
import { QueryErrorBanner } from '@/components/query-error-banner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { getQueryErrorMessage } from '@/lib/api/query-error';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<StockTakeBranchStatus | StockTakeLineStatus, string> = {
  empty: 'No products',
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  outstanding: 'Outstanding',
  matched: 'Matched',
  recount: 'Recount',
  needs_approval: 'Needs attention',
  escalated: 'Escalated',
};

type BranchFilter = 'all' | 'completed' | 'in_progress' | 'not_started' | 'discrepancies' | 'recounts' | 'escalated';
type LineFilter = 'all' | 'outstanding' | 'matched' | 'discrepancies' | 'recounts';

interface StockTakeTabProps {
  date: string;
  country: string;
  region: string;
  enabled: boolean;
}

export function StockTakeTab({ date, country, region, enabled }: StockTakeTabProps) {
  const [cycle, setCycle] = useState<1 | 2 | 3 | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState<BranchFilter>('all');
  const [branch, setBranch] = useState<StockTakeBranch | null>(null);
  const query = useStockTakeManagement({ date, cycle }, enabled);
  const data = query.data;

  const branches = useMemo(() => {
    return (data?.branches ?? []).filter((item) => {
      if (country !== 'all' && item.country !== country) return false;
      if (region !== 'all' && item.region !== region) return false;
      if (!matchesBranchFilter(item, branchFilter)) return false;
      const haystack = `${item.name} ${item.alias ?? ''} ${item.ref ?? ''}`.toLowerCase();
      return haystack.includes(search.trim().toLowerCase());
    });
  }, [data?.branches, country, region, branchFilter, search]);

  if (query.isLoading) return <LoadingSpinner wrapperClassName="py-16" />;
  if (query.isError) {
    return (
      <QueryErrorBanner
        message={getQueryErrorMessage(query.error)}
        onRetry={() => query.refetch()}
      />
    );
  }
  if (!data) return null;

  const summary = data.summary;
  const activeCycle = cycle ?? data.cycleIndex;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section className="mb-4 grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <MetricCard label="Branches" value={String(summary.branchCount)} icon={Boxes} active={branchFilter === 'all'} onClick={() => setBranchFilter('all')} />
        <MetricCard label="Counted" value={`${summary.counted}/${summary.productCount}`} hint={formatPercent(summary.completionPercent)} icon={ClipboardList} active={branchFilter === 'completed'} onClick={() => setBranchFilter('completed')} />
        <MetricCard label="Outstanding" value={String(summary.outstanding)} icon={Package} active={branchFilter === 'not_started'} onClick={() => setBranchFilter('not_started')} />
        <MetricCard label="Discrepancies" value={String(summary.discrepancies)} icon={AlertTriangle} active={branchFilter === 'discrepancies'} onClick={() => setBranchFilter('discrepancies')} />
        <MetricCard label="Recounts" value={String(summary.recounts + summary.needsApproval + summary.escalated)} icon={RotateCcw} active={branchFilter === 'recounts'} onClick={() => setBranchFilter('recounts')} />
        <MetricCard label="In progress" value={String(data.branches.filter((item) => item.status === 'in_progress').length)} icon={Clock3} active={branchFilter === 'in_progress'} onClick={() => setBranchFilter('in_progress')} />
      </section>

      <div className="mb-4 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search branch name or code"
            className="h-9 pl-9"
            aria-label="Search branches"
          />
        </div>
        <div className="flex items-center gap-2">
          {([1, 2, 3] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={activeCycle === value ? 'default' : 'outline'}
              className="h-9"
              onClick={() => setCycle(value)}
            >
              Cycle {value}
            </Button>
          ))}
        </div>
      </div>

      <p className="mb-4 shrink-0 text-xs text-muted-foreground">
        Shortage {summary.shortageUnits} · Surplus {summary.surplusUnits}. Completion counts a product only when the physical count matches the system quantity.
      </p>

      {data.largestDiscrepancies.length > 0 ? (
        <section className="mb-4 shrink-0 rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Largest discrepancies</h2>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {data.largestDiscrepancies.map((item) => (
              <li key={`${item.branchUid}-${item.productUid}`} className="rounded-lg border border-border px-3 py-2 text-xs">
                <p className="truncate font-medium text-foreground">{item.name}</p>
                <p className="truncate text-muted-foreground">{item.branchName} · {item.sku}</p>
                <p className={item.variance < 0 ? 'text-red-500' : 'text-amber-500'}>
                  {signed(item.variance)} · {STATUS_LABEL[item.status]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {branches.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No branches match this stock take.</p>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {branches.map((item) => (
            <BranchCard key={item.branchUid} branch={item} onClick={() => setBranch(item)} />
          ))}
        </div>
      )}

      <BranchDialog
        branch={branch}
        limitations={data.limitations}
        onClose={() => setBranch(null)}
      />
    </div>
  );
}

function BranchCard({ branch, onClick }: { branch: StockTakeBranch; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col gap-2 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:opacity-90',
        branchBorder(branch.status),
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{branch.alias || branch.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {branch.ref ? `${branch.ref} · ` : ''}{branch.name}
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">{STATUS_LABEL[branch.status]}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Boxes className="size-3" aria-hidden />{branch.productCount} products</span>
        <span className="inline-flex items-center gap-1"><Package className="size-3" aria-hidden />{branch.categoryCount} categories</span>
        <span className="inline-flex items-center gap-1"><ClipboardList className="size-3" aria-hidden />{branch.counted} counted</span>
        <span className="inline-flex items-center gap-1"><Clock3 className="size-3" aria-hidden />{branch.outstanding} outstanding</span>
        <span className="inline-flex items-center gap-1"><AlertTriangle className="size-3" aria-hidden />{branch.discrepancies} discrepancies</span>
        <span className="inline-flex items-center gap-1"><RotateCcw className="size-3" aria-hidden />{branch.recounts + branch.needsApproval + branch.escalated} recounts</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{formatPercent(branch.completionPercent)} complete</span>
        <span className="text-muted-foreground">{branch.lastCountedAt ? format(new Date(branch.lastCountedAt), 'd MMM HH:mm') : 'No count yet'}</span>
      </div>
    </button>
  );
}

function BranchDialog({
  branch,
  limitations,
  onClose,
}: {
  branch: StockTakeBranch | null;
  limitations: string[];
  onClose: () => void;
}) {
  const [category, setCategory] = useState<StockTakeCategory | null>(null);
  const [product, setProduct] = useState<StockTakeLine | null>(null);
  const [lineSearch, setLineSearch] = useState('');
  const [lineFilter, setLineFilter] = useState<LineFilter>('all');

  useEffect(() => {
    setCategory(null);
    setProduct(null);
    setLineSearch('');
    setLineFilter('all');
  }, [branch?.branchUid]);

  const lines = useMemo(() => {
    if (!category) return [];
    return category.lines.filter((line) => {
      if (!matchesLineFilter(line, lineFilter)) return false;
      const haystack = `${line.name} ${line.sku}`.toLowerCase();
      return haystack.includes(lineSearch.trim().toLowerCase());
    });
  }, [category, lineFilter, lineSearch]);

  function closeAll() {
    setCategory(null);
    setProduct(null);
    setLineSearch('');
    setLineFilter('all');
    onClose();
  }

  return (
    <Dialog open={branch != null} onOpenChange={(open) => { if (!open) closeAll(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
        {branch ? (
          <>
            <DialogHeader>
              <DialogTitle>{branch.alias || branch.name}</DialogTitle>
              <DialogDescription>
                Cycle {branch.cycleIndex}
                {branch.countedBy ? ` · Started by ${branch.countedBy}` : ''}
                {branch.ref ? ` · ${branch.ref}` : ''}
              </DialogDescription>
            </DialogHeader>

            {product && category ? (
              <ProductAudit
                line={product}
                onBack={() => setProduct(null)}
              />
            ) : category ? (
              <div className="flex flex-col gap-3">
                <Button type="button" variant="ghost" className="w-fit gap-2 px-0" onClick={() => { setCategory(null); setLineSearch(''); }}>
                  <ArrowLeft className="size-4" /> Categories
                </Button>
                <h3 className="text-sm font-medium">{category.label}</h3>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={lineSearch} onChange={(event) => setLineSearch(event.target.value)} placeholder="Search product or SKU" aria-label="Search products" className="h-9" />
                  <select
                    value={lineFilter}
                    onChange={(event) => setLineFilter(event.target.value as LineFilter)}
                    className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                    aria-label="Filter products"
                  >
                    <option value="all">All products</option>
                    <option value="outstanding">Outstanding</option>
                    <option value="matched">Matched</option>
                    <option value="discrepancies">Discrepancies</option>
                    <option value="recounts">Recounts</option>
                  </select>
                </div>
                {lines.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match.</p> : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr>
                          <th className="py-2 pr-3 font-medium">Product</th>
                          <th className="py-2 pr-3 font-medium">System</th>
                          <th className="py-2 pr-3 font-medium">Counts</th>
                          <th className="py-2 pr-3 font-medium">Final</th>
                          <th className="py-2 pr-3 font-medium">Variance</th>
                          <th className="py-2 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.productUid} className="cursor-pointer border-t border-border hover:bg-muted/40" onClick={() => setProduct(line)}>
                            <td className="py-2 pr-3">
                              <p className="font-medium">{line.name}</p>
                              <p className="text-xs text-muted-foreground">{line.sku}{line.unit ? ` · ${line.unit}` : ''}</p>
                            </td>
                            <td className="py-2 pr-3">{line.systemQuantity}</td>
                            <td className="py-2 pr-3 text-xs">{countSummary(line)}</td>
                            <td className="py-2 pr-3">{line.finalQuantity ?? '—'}</td>
                            <td className={cn('py-2 pr-3', varianceClass(line.variance))}>{line.variance == null ? '—' : signed(line.variance)}</td>
                            <td className="py-2"><Badge variant="outline">{STATUS_LABEL[line.status]}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {branch.categories.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cn('rounded-lg border bg-card px-3 py-2 text-left hover:opacity-90', item.escalated > 0 || item.needsApproval > 0 ? 'border-red-500' : item.discrepancies > 0 ? 'border-amber-500' : item.completionPercent === 100 ? 'border-green-500' : 'border-border')}
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {item.counted}/{item.productCount} counted · {item.outstanding} outstanding · {item.discrepancies} discrepancies · {formatPercent(item.completionPercent)}
                    </p>
                  </button>
                ))}
              </div>
            )}

            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ProductAudit({ line, onBack }: { line: StockTakeLine; onBack: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="ghost" className="w-fit gap-2 px-0" onClick={onBack}>
        <ArrowLeft className="size-4" /> {line.category}
      </Button>
      <div>
        <h3 className="text-sm font-medium">{line.name}</h3>
        <p className="text-xs text-muted-foreground">{line.sku}{line.description ? ` · ${line.description}` : ''}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-2 pr-3 font-medium">Activity</th>
              <th className="py-2 pr-3 font-medium">Quantity</th>
              <th className="py-2 pr-3 font-medium">Change</th>
              <th className="py-2 font-medium">Recorded</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border">
              <td className="py-2 pr-3">System quantity</td>
              <td className="py-2 pr-3">{line.systemQuantity}</td>
              <td className="py-2 pr-3">—</td>
              <td className="py-2 text-xs text-muted-foreground">Quantity the count was compared with</td>
            </tr>
            {line.attempts.map((attempt) => (
              <tr key={attempt.sequence} className="border-t border-border">
                <td className="py-2 pr-3">{attempt.label}</td>
                <td className="py-2 pr-3">{attempt.quantity}</td>
                <td className={cn('py-2 pr-3', varianceClass(attempt.deltaFromPrevious))}>{attempt.deltaFromPrevious == null ? '—' : signed(attempt.deltaFromPrevious)}</td>
                <td className="py-2 text-xs text-muted-foreground">{attempt.sequence === line.attempts.length && line.countedAt ? format(new Date(line.countedAt), 'd MMM yyyy HH:mm') : 'Time not stored'}</td>
              </tr>
            ))}
            <tr className="border-t border-border">
              <td className="py-2 pr-3 inline-flex items-center gap-1">{line.finalQuantity != null ? <CheckCircle2 className="size-3.5 text-green-500" /> : <AlertTriangle className="size-3.5 text-amber-500" />} Final recorded</td>
              <td className="py-2 pr-3">{line.finalQuantity ?? '—'}</td>
              <td className={cn('py-2 pr-3', varianceClass(line.variance))}>{line.variance == null ? '—' : signed(line.variance)}{line.variancePercent != null ? ` (${signed(line.variancePercent)}%)` : ''}</td>
              <td className="py-2 text-xs text-muted-foreground">{STATUS_LABEL[line.status]}{line.fourthCountReplacedThird ? ' · fourth count replaced the stored third' : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {line.attempts.length === 0 ? <p className="text-sm text-muted-foreground">No count has been submitted for this product.</p> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Boxes;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-lg border bg-card px-3 py-2 text-left', active ? 'border-violet-600' : 'border-border')}
    >
      <span className="flex items-center gap-1 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden />{label}</span>
      <span className="mt-1 block text-lg font-semibold text-foreground">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </button>
  );
}

function matchesBranchFilter(branch: StockTakeBranch, filter: BranchFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'completed') return branch.status === 'completed';
  if (filter === 'in_progress') return branch.status === 'in_progress';
  if (filter === 'not_started') return branch.status === 'not_started' || branch.status === 'empty';
  if (filter === 'discrepancies') return branch.discrepancies > 0;
  if (filter === 'recounts') return branch.recounts + branch.needsApproval + branch.escalated > 0;
  return branch.status === 'escalated';
}

function matchesLineFilter(line: StockTakeLine, filter: LineFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'outstanding') return line.status === 'outstanding';
  if (filter === 'matched') return line.status === 'matched';
  if (filter === 'discrepancies') return line.variance != null && line.variance !== 0;
  return line.status === 'recount' || line.status === 'needs_approval' || line.status === 'escalated';
}

function branchBorder(status: StockTakeBranchStatus): string {
  if (status === 'completed') return 'border-green-500';
  if (status === 'escalated' || status === 'needs_approval') return 'border-red-500';
  if (status === 'in_progress') return 'border-amber-500';
  return 'border-border';
}

function varianceClass(value: number | null): string {
  if (value == null || value === 0) return '';
  return value < 0 ? 'text-red-500' : 'text-amber-500';
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatPercent(value: number | null): string {
  if (value == null) return '—';
  return `${value}%`;
}

function countSummary(line: StockTakeLine): string {
  if (line.attempts.length === 0) return '—';
  return line.attempts.map((attempt) => attempt.quantity).join(' / ');
}
