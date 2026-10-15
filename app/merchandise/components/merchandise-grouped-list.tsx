'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import type { Journal } from '@/api/types/journal';
import {
  groupMerchandiseByDate,
  merchandiseCreatedLabel,
  merchandiseOwnerName,
  merchandiseStatusLabel,
  merchandiseStatusTone,
} from '@/app/merchandise/lib/merchandise-display';
import { Notebook } from 'lucide-react';

export function MerchandiseGroupedList({ journals }: { journals: Journal[] }) {
  const sections = groupMerchandiseByDate(journals);

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
        <Notebook className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No merchandise entries as yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <section key={section.title}>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {section.title}
          </h2>
          <ul className="flex flex-col gap-3">
            {section.data.map((journal) => (
              <li key={journal.uid}>
                <Link
                  href={`/merchandise/${journal.uid}`}
                  className="flex gap-4 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40"
                >
                  {journal.fileURL ? (
                    <img
                      src={journal.fileURL}
                      alt=""
                      className="size-16 shrink-0 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-md bg-muted">
                      <Notebook className="size-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {journal.clientRef || 'No client reference'}
                      </p>
                      <Badge variant={merchandiseStatusTone(journal.status)}>
                        {merchandiseStatusLabel(journal.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {journal.comments || 'No comments'}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {merchandiseOwnerName(journal)} · {merchandiseCreatedLabel(journal.createdAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
