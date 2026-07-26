'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ReportsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
}

export function ReportsSection({
  title,
  description,
  children,
  className,
  actions,
}: ReportsSectionProps) {
  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      data-tour="reports-dashboard-section"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </h2>
          {description ? (
            <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
