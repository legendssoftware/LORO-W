'use client';

import { useEffect, useState } from 'react';

/**
 * Live elapsed time since check-in. Updates every second when checked in.
 * checkInTime: ISO string or parseable date from attendance.checkIn or startTime.
 */
export function DashboardTimeWorking({
  checkedIn,
  checkInTime,
}: {
  checkedIn: boolean;
  checkInTime?: string | null;
}) {
  const [elapsed, setElapsed] = useState<string>('—');

  useEffect(() => {
    if (!checkedIn || !checkInTime) {
      setElapsed('—');
      return;
    }
    const start = new Date(checkInTime).getTime();
    if (Number.isNaN(start)) {
      setElapsed('—');
      return;
    }
    const tick = () => {
      const now = Date.now();
      const totalMs = Math.max(0, now - start);
      const totalMins = Math.floor(totalMs / 60_000);
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setElapsed(`${hours}h ${mins}m`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [checkedIn, checkInTime]);

  if (!checkedIn) return null;
  return (
    <p className="text-center text-sm font-medium text-muted-foreground">
      Time working: <span className="text-foreground font-semibold">{elapsed}</span>
    </p>
  );
}
