"use client"

import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Progress({
  className,
  indicatorClassName,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & {
  /** Overrides the default primary fill. Callers that omit it keep `bg-primary`. */
  indicatorClassName?: string;
}) {
  // Ensure indicator has minimum visible width at 0% (e.g. 2%) so the bar is always visible
  const effectivePercent =
    value == null || value === 0 ? 2 : Math.max(2, Math.min(100, value));
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn(
        "bg-primary/20 relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(
          "bg-primary h-full w-full flex-1 transition-all min-w-[4px]",
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - effectivePercent}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
