'use client';

import { useMemo } from 'react';
import { format } from 'date-fns';
import { Bell, AlertTriangle, CalendarClock } from 'lucide-react';
import { useTasks } from '@/api/hooks';
import { formatUtcYmd, utcToday } from '@/app/reports/utils/overview-daily-summary';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Task } from '@/api/types/tasks';

function addUtcDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

interface PlanningRemindersPanelProps {
  onOpenTask: (task: Task) => void;
  className?: string;
}

export function PlanningRemindersPanel({
  onOpenTask,
  className,
}: PlanningRemindersPanelProps) {
  const today = utcToday();
  const todayYmd = formatUtcYmd(today);
  const weekEndYmd = formatUtcYmd(addUtcDays(today, 7));

  const dueTodayQuery = useTasks({
    page: 1,
    limit: 50,
    startDate: todayYmd,
    endDate: todayYmd,
  });

  const overdueQuery = useTasks({
    page: 1,
    limit: 50,
    isOverdue: true,
  });

  const upcomingQuery = useTasks({
    page: 1,
    limit: 30,
    startDate: formatUtcYmd(addUtcDays(today, 1)),
    endDate: weekEndYmd,
  });

  const dueToday = useMemo(
    () =>
      (dueTodayQuery.data?.data ?? []).filter(
        (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      ),
    [dueTodayQuery.data?.data]
  );

  const overdue = overdueQuery.data?.data ?? [];

  const upcoming = useMemo(
    () =>
      (upcomingQuery.data?.data ?? []).filter(
        (t) => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      ),
    [upcomingQuery.data?.data]
  );

  const isLoading =
    dueTodayQuery.isLoading || overdueQuery.isLoading || upcomingQuery.isLoading;

  function renderSection(
    title: string,
    icon: React.ReactNode,
    tasks: Task[],
    tone?: 'danger' | 'default'
  ) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          <span>{title}</span>
          <span className="text-muted-foreground">({tasks.length})</span>
        </div>
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground">None</p>
        ) : (
          <ul className="space-y-1">
            {tasks.slice(0, 8).map((t) => (
              <li key={t.uid}>
                <button
                  type="button"
                  className={cn(
                    'w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted/60',
                    tone === 'danger' && 'border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30'
                  )}
                  onClick={() => onOpenTask(t)}
                >
                  <span className="font-medium line-clamp-1">{t.title}</span>
                  {t.deadline && (
                    <span className="mt-0.5 block text-muted-foreground">
                      {format(new Date(t.deadline), 'PPp')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <aside
      className={cn(
        'shrink-0 rounded-lg border bg-card p-4',
        'w-full lg:w-72',
        className
      )}
      data-tour="planning-reminders"
    >
      <div className="mb-3 flex items-center gap-2">
        <Bell className="size-4 text-violet-600" />
        <h2 className="text-sm font-semibold">Reminders</h2>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {renderSection(
            'Due today',
            <CalendarClock className="size-3.5 text-violet-600" />,
            dueToday
          )}
          {renderSection(
            'Overdue',
            <AlertTriangle className="size-3.5 text-red-600" />,
            overdue,
            'danger'
          )}
          {renderSection(
            'Next 7 days',
            <CalendarClock className="size-3.5 text-muted-foreground" />,
            upcoming
          )}
        </div>
      )}
    </aside>
  );
}
