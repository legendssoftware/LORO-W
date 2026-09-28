'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PulseBranchRow, PulseNamedPerson } from '@/api/types/pulse';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCountryFlag } from '@/lib/utils/country-flags';
import { PERFORMANCE_COUNTRY_ORDER } from '@/app/performance/lib/constants';
import { cn } from '@/lib/utils';

const UNASSIGNED = 'UNASSIGNED';

function moodLabel(mood: string | null | undefined): string {
  if (!mood) return '—';
  return mood.replaceAll('_', ' ');
}

function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!nums.length) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

function groupByCountry<T extends { countryCode: string | null }>(rows: T[]): { countryCode: string; rows: T[] }[] {
  const byCountry = new Map<string, T[]>();
  for (const row of rows) {
    const code = row.countryCode?.trim() || UNASSIGNED;
    const list = byCountry.get(code) ?? [];
    list.push(row);
    byCountry.set(code, list);
  }
  const ordered = PERFORMANCE_COUNTRY_ORDER.filter((code) => byCountry.has(code));
  const extra = [...byCountry.keys()].filter(
    (code) =>
      code !== UNASSIGNED &&
      !PERFORMANCE_COUNTRY_ORDER.includes(code as (typeof PERFORMANCE_COUNTRY_ORDER)[number])
  );
  const keys = [...ordered, ...extra];
  if (byCountry.has(UNASSIGNED)) keys.push(UNASSIGNED);
  return keys.map((countryCode) => ({
    countryCode,
    rows: byCountry.get(countryCode) ?? [],
  }));
}

function countryHeading(countryCode: string): { flag: string; name: string } {
  if (countryCode === UNASSIGNED) return { flag: '🌍', name: 'Unassigned' };
  const info = getCountryFlag(countryCode);
  return { flag: info.flag, name: info.name };
}

function trendLabel(trend: PulseBranchRow['trend']): string {
  if (trend === 'up') return 'Up';
  if (trend === 'down') return 'Down';
  return 'Flat';
}

function CountryHeader({
  countryCode,
  countLabel,
  detail,
  open,
  onToggle,
}: {
  countryCode: string;
  countLabel: string;
  detail?: string;
  open: boolean;
  onToggle: () => void;
}) {
  const heading = countryHeading(countryCode);
  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 bg-muted/50 px-3 py-3 text-left hover:bg-muted sm:gap-3"
      onClick={onToggle}
    >
      <span className="shrink-0 text-2xl leading-none">{heading.flag}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{heading.name}</p>
        <p className="truncate text-xs text-muted-foreground">{countLabel}</p>
      </div>
      {detail ? <p className="shrink-0 text-right text-xs text-muted-foreground">{detail}</p> : null}
      {open ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
    </button>
  );
}

export function WellbeingBranchCountrySections({ rows }: { rows: PulseBranchRow[] }) {
  const groups = useMemo(() => groupByCountry(rows), [rows]);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());

  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No branch pulse data for this filter.</p>;
  }

  return (
    <div className="divide-y overflow-hidden rounded-lg border">
      {groups.map((group) => {
        const open = !closed.has(group.countryCode);
        const morning = average(group.rows.map((row) => row.morningScore));
        const evening = average(group.rows.map((row) => row.eveningScore));
        const count = group.rows.length;
        return (
          <div key={group.countryCode}>
            <CountryHeader
              countryCode={group.countryCode}
              countLabel={`${count} ${count === 1 ? 'branch' : 'branches'}`}
              detail={`Morning ${morning ?? '—'} · Evening ${evening ?? '—'}`}
              open={open}
              onToggle={() =>
                setClosed((prev) => {
                  const next = new Set(prev);
                  if (next.has(group.countryCode)) next.delete(group.countryCode);
                  else next.add(group.countryCode);
                  return next;
                })
              }
            />
            {open ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Morning</TableHead>
                    <TableHead>Evening</TableHead>
                    <TableHead>Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => (
                    <TableRow key={String(row.branchUid ?? row.branchName)}>
                      <TableCell>{row.branchName}</TableCell>
                      <TableCell>{row.morningScore ?? '—'}</TableCell>
                      <TableCell>{row.eveningScore ?? '—'}</TableCell>
                      <TableCell>{trendLabel(row.trend)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function WellbeingNamedCountrySections({
  title,
  rows,
}: {
  title: string;
  rows: PulseNamedPerson[];
}) {
  const groups = useMemo(() => groupByCountry(rows), [rows]);
  const [closed, setClosed] = useState<Set<string>>(() => new Set());

  if (!rows.length) return null;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="divide-y overflow-hidden rounded-lg border">
        {groups.map((group) => {
          const open = !closed.has(group.countryCode);
          const count = group.rows.length;
          return (
            <div key={group.countryCode}>
              <CountryHeader
                countryCode={group.countryCode}
                countLabel={`${count} ${count === 1 ? 'person' : 'people'}`}
                open={open}
                onToggle={() =>
                  setClosed((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.countryCode)) next.delete(group.countryCode);
                    else next.add(group.countryCode);
                    return next;
                  })
                }
              />
              {open ? (
                <div className="space-y-2 p-3">
                  {group.rows.map((row) => (
                    <div key={row.ownerUid} className={cn('rounded-lg border border-border/60 p-3')}>
                      <p className="text-sm font-medium">
                        {row.name}
                        {row.branchName ? ` · ${row.branchName}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Morning: {moodLabel(row.morningMood)} · Evening: {moodLabel(row.eveningMood)}
                        {row.riskReason ? ` · ${row.riskReason.replaceAll('_', ' ')}` : ''}
                      </p>
                      {row.comments ? <p className="mt-1 text-xs">{row.comments}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
