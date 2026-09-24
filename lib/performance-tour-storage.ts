'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_performance_tour_v1');

export const readPerformanceTourState = store.read;
export const writePerformanceTourState = store.write;
