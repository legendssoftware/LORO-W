'use client';

import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/** Card section whose header toggles the body. Defaults to expanded. */
export function CollapsibleFormSection({
  title,
  description,
  children,
  defaultOpen = true,
  titleClassName,
  cardClassName,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  titleClassName?: string;
  cardClassName?: string;
  contentClassName?: string;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <Card className={cardClassName}>
        <CardHeader className="p-0">
          <CollapsibleTrigger
            type="button"
            className="flex w-full items-start justify-between gap-3 px-4 py-0 text-left sm:px-6 [&[data-state=open]>svg]:rotate-180"
          >
            <div className="min-w-0 space-y-1">
              <CardTitle className={cn('text-sm sm:text-base', titleClassName)}>
                {title}
              </CardTitle>
              {description ? (
                <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform" />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className={contentClassName}>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Subsection header (personnel groups) that toggles its fields. Defaults to expanded. */
export function CollapsibleFormGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="space-y-3">
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center justify-between rounded-md text-left text-sm font-medium [&[data-state=open]>svg]:rotate-180"
      >
        {title}
        <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform" />
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
