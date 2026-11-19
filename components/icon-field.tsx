'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/** Label with a leading icon, used by the staff create and edit dialogs. */
export function IconField({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5 text-sm', className)}>
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        {label}
      </span>
      {children}
    </label>
  );
}

type IconInputProps = React.ComponentProps<typeof Input> & { icon: LucideIcon };

/** Text or number input with a leading icon. */
export function IconInput({ icon: Icon, className, ...props }: IconInputProps) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input className={cn('pl-8', className)} {...props} />
    </div>
  );
}

type IconTextareaProps = React.ComponentProps<typeof Textarea> & { icon: LucideIcon };

/** Multiline input with a leading icon. */
export function IconTextarea({ icon: Icon, className, ...props }: IconTextareaProps) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" aria-hidden />
      <Textarea className={cn('pl-8', className)} {...props} />
    </div>
  );
}
