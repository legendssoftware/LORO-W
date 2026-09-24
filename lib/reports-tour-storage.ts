'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_reports_tour_v1');

export const readReportsTourState = store.read;
export const writeReportsTourState = store.write;
