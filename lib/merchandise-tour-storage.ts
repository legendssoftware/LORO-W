'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_merchandise_tour_v1');

export const readMerchandiseTourState = store.read;
export const writeMerchandiseTourState = store.write;
