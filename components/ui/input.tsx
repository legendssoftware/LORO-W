import * as React from "react"

import { cn } from "@/lib/utils"

/** Filter-row / toolbar search inputs: muted italic placeholder, shared chrome. */
export const filterToolbarSearchInputClassName =
  "h-9 w-full min-w-0 border-gray-200 bg-white text-foreground placeholder:text-xs placeholder:italic placeholder:text-muted-foreground focus:outline-none focus:ring-0 focus-visible:ring-0"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border border-gray-200 bg-transparent px-3 py-1 text-sm transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-xs file:font-medium sm:file:text-sm disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
