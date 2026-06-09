'use client';

import { DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2Icon } from '@/lib/icons';

export function WizardFooter({
  step,
  isFirstStep,
  isLastStep,
  isPending,
  onBack,
  onNext,
  onCancel,
}: {
  step: number;
  isFirstStep: boolean;
  isLastStep: boolean;
  isPending: boolean;
  onBack: () => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <DialogFooter className="gap-3 sm:flex-row sm:justify-between">
      <div className="flex w-full gap-3 sm:w-auto">
        {!isFirstStep && (
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-md sm:flex-none"
            onClick={onBack}
            disabled={isPending}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="cancel"
          className="flex-1 rounded-md sm:flex-none"
          onClick={onCancel}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      <div className="flex w-full gap-3 sm:w-auto sm:ml-auto">
        {isLastStep ? (
          <Button
            type="submit"
            variant="success"
            className="flex-1 rounded-md sm:min-w-[100px]"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        ) : (
          <Button
            type="button"
            className="flex-1 rounded-md bg-violet-600 text-white hover:bg-violet-700 sm:min-w-[100px]"
            onClick={onNext}
            disabled={isPending}
          >
            Next
          </Button>
        )}
      </div>
      <span className="sr-only">Step {step + 1}</span>
    </DialogFooter>
  );
}
