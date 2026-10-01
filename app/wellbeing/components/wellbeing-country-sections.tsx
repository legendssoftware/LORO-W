'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { PulseBranchRow, PulseNamedPerson } from '@/api/types/pulse';
import { Button } from '@/components/ui/button';
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
import { describePersonStatus, describeTrend, moodLabel } from '../lib/pulse-explain';
import { PULSE_TONE_STYLES, getScoreTone } from '../lib/pulse-tone';
import { WellbeingPersonInfoModal } from './wellbeing-person-info-modal';

const UNASSIGNED = 'UNASSIGNED';

/**
 * Shared column layout for every country's branch table. Fixed widths plus identical
 * alignment classes on header and body cells keep columns aligned across all tables.
 */
const BRANCH_COLUMNS = [
  { key: 'branch', label: 'Branch', className: 'w-[34%] text-left' },
  { key: 'morning', label: 'Morning', className: 'w-[18%] text-center tabular-nums' },
  { key: 'evening', label: 'Evening', className: 'w-[18%] text-center tabular-nums' },
  { key: 'trend', label: 'Trend', className: 'w-[30%] text-left' },
] as const;

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

/** Score rendered in its red / amber / green tone; a dash stays neutral. */
function ScoreText({ score }: { score: number | null | undefined }) {
  return (
    <span className={cn('font-medium', PULSE_TONE_STYLES[getScoreTone(score)].text)}>{score ?? '—'}</span>
  );
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
  detail?: ReactNode;
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
              detail={
                <>
                  Morning <ScoreText score={morning} /> · Evening <ScoreText score={evening} />
                </>
              }
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
              <Table className="table-fixed">
                <TableHeader>
                  <TableRow>
                    {BRANCH_COLUMNS.map((col) => (
                      <TableHead key={col.key} className={cn(col.className, 'px-3')}>
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.rows.map((row) => {
                    const trend = describeTrend(row.morningScore, row.eveningScore);
                    const trendStyle = PULSE_TONE_STYLES[trend.tone];
                    return (
                    <TableRow key={String(row.branchUid ?? row.branchName)}>
                      <TableCell className={cn(BRANCH_COLUMNS[0].className, 'truncate px-3')}>
                        {row.branchName}
                      </TableCell>
                      <TableCell className={cn(BRANCH_COLUMNS[1].className, 'px-3')}>
                        <ScoreText score={row.morningScore} />
                      </TableCell>
                      <TableCell className={cn(BRANCH_COLUMNS[2].className, 'px-3')}>
                        <ScoreText score={row.eveningScore} />
                      </TableCell>
                      <TableCell
                        className={cn(BRANCH_COLUMNS[3].className, 'whitespace-normal px-3')}
                        title={trend.detail}
                      >
                        <span className="inline-flex items-center gap-1.5" aria-label={`${trend.label}. ${trend.detail}`}>
                          <span className={cn('size-2 shrink-0 rounded-full', trendStyle.dot)} aria-hidden />
                          <span className={cn('text-xs font-medium', trendStyle.text)}>{trend.label}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PersonCard({
  person,
  onExplain,
}: {
  person: PulseNamedPerson;
  onExplain: (person: PulseNamedPerson) => void;
}) {
  const status = describePersonStatus(person);
  const style = PULSE_TONE_STYLES[status.tone];
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', style.dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {person.name}
          {person.branchName ? ` · ${person.branchName}` : ''}
        </p>
        <p className={cn('text-xs font-medium', style.text)} title={status.detail}>
          {status.label}
          {status.detail ? <span className="font-normal text-muted-foreground"> · {status.detail}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">
          Morning: {moodLabel(person.morningMood)} · Evening: {moodLabel(person.eveningMood)}
          {person.riskReason ? ` · ${person.riskReason.replaceAll('_', ' ')}` : ''}
        </p>
        {person.comments ? <p className="mt-1 text-xs">{person.comments}</p> : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="-my-1 -mr-1"
        onClick={() => onExplain(person)}
        aria-label={`Explain summary for ${person.name}`}
        title="What does this mean?"
      >
        <Info className="size-4" />
      </Button>
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
  const [selectedPerson, setSelectedPerson] = useState<PulseNamedPerson | null>(null);

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
                    <PersonCard key={row.ownerUid} person={row} onExplain={setSelectedPerson} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <WellbeingPersonInfoModal
        person={selectedPerson}
        open={selectedPerson != null}
        onOpenChange={(open) => {
          if (!open) setSelectedPerson(null);
        }}
      />
    </section>
  );
}
