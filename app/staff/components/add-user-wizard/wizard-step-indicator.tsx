'use client';

import { cn } from '@/lib/utils';
import { WIZARD_STEP_LABELS } from '@/lib/user-form';

export function WizardStepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-2 pb-2">
      {WIZARD_STEP_LABELS.map((label, index) => {
        const isActive = index === currentStep;
        const isComplete = index < currentStep;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex size-8 items-center justify-center rounded-full text-xs font-medium transition-colors',
                  isActive && 'bg-violet-600 text-white',
                  isComplete && 'bg-violet-600/20 text-violet-700 dark:text-violet-300',
                  !isActive && !isComplete && 'bg-muted text-muted-foreground'
                )}
              >
                {index + 1}
              </div>
              <span
                className={cn(
                  'hidden text-xs sm:block',
                  isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {index < WIZARD_STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'mb-4 hidden h-px w-6 sm:block',
                  index < currentStep ? 'bg-violet-600/40' : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
