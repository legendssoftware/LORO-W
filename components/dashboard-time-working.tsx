'use client';

import { useEffect, useState } from 'react';
import { parseAttendanceInstant, isUsableShiftStartInstant } from '@/lib/attendance-time';

/**
 * Live elapsed time since check-in. Updates every second when checked in.
 * checkInTime: UTC ISO instant from attendance.checkIn or GET /att/status startTime.
 */
export function DashboardTimeWorking({
  checkedIn,
  checkInTime,
  orgTimezone = null,
}: {
  checkedIn: boolean;
  checkInTime?: string | null;
  orgTimezone?: string | null;
}) {
  const [elapsed, setElapsed] = useState<string>('—');

  useEffect(() => {
    if (!checkedIn || !checkInTime) {
      setElapsed('—');
      return;
    }
    const startDate = parseAttendanceInstant(checkInTime, orgTimezone);
    if (!startDate || !isUsableShiftStartInstant(startDate)) {
      setElapsed('—');
      return;
    }
    const start = startDate.getTime();
    const tick = () => {
      const now = Date.now();
      const totalMs = Math.max(0, now - start);
      const totalSecs = Math.floor(totalMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setElapsed(
        hours > 0 ? `${hours}h ${mins}m` : `${mins}m ${secs}s`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedIn, checkInTime, orgTimezone]);

  if (!checkedIn) return null;
  return (
    <p className="text-center text-sm font-medium text-muted-foreground">
      Time working: <span className="text-foreground font-semibold">{elapsed}</span>
    </p>
  );
}
