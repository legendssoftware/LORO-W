'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_calls_tour_v1');

export const readCallsTourState = store.read;
export const writeCallsTourState = store.write;
