'use client';

import { useMemo, useState } from 'react';
import { formatUtcYmd, utcToday } from '@/lib/utils/overview-daily-summary';

export function useReportsDateRange(initialStart?: Date, initialEnd?: Date) {
  const defaultToday = useMemo(() => utcToday(), []);
  const [startDate, setStartDate] = useState(initialStart ?? defaultToday);
  const [endDate, setEndDate] = useState(initialEnd ?? defaultToday);

  const from = formatUtcYmd(startDate);
  const to = formatUtcYmd(endDate);

  function setRange(range: { start: Date; end: Date }) {
    setStartDate(range.start);
    setEndDate(range.end);
  }

  return {
    startDate,
    endDate,
    from,
    to,
    setStartDate,
    setEndDate,
    setRange,
  };
}
