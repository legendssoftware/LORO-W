'use client';

import { Button } from '@/components/ui/button';
import { Loader2Icon } from '@/lib/icons';

export interface AttendanceStatusButtonProps {
  checkedIn: boolean;
  loading: boolean;
  onCheckIn: () => void;
  onCheckOut: () => void;
}

/**
 * Prominent attendance status button: Start Shift (green) or End Shift (destructive).
 * Matches APK copy: "Shift active" / "Ready to start".
 */
export function AttendanceStatusButton({
  checkedIn,
  loading,
  onCheckIn,
  onCheckOut,
}: AttendanceStatusButtonProps) {
  return (
    <div className="flex w-full justify-center px-2">
      <div
        className={`flex w-full max-w-md items-center justify-between gap-4 rounded-xl p-4 sm:p-6 md:p-8 ${
          checkedIn
            ? 'bg-destructive text-white'
            : 'bg-green-600 text-white'
        }`}
      >
        <span className="text-base font-medium uppercase sm:text-lg md:text-xl">
          {checkedIn ? 'Shift active' : 'Ready to start'}
        </span>
        {loading ? (
          <Loader2Icon className="size-12 animate-spin text-white sm:size-14 md:size-16" aria-hidden />
        ) : checkedIn ? (
          <Button
            variant="secondary"
            size="lg"
            className="min-h-12 rounded-lg border-0 outline-none ring-0 bg-white px-6 text-base font-semibold sm:min-h-14 sm:px-8 sm:text-lg md:min-h-16 md:px-10 md:text-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0"
            onClick={onCheckOut}
          >
            End Shift
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="lg"
            className="min-h-12 rounded-lg border-0 outline-none ring-0 bg-white px-6 text-base font-semibold sm:min-h-14 sm:px-8 sm:text-lg md:min-h-16 md:px-10 md:text-xl focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-0"
            onClick={onCheckIn}
          >
            Start Shift
          </Button>
        )}
      </div>
    </div>
  );
}
