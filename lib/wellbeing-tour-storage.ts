'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_wellbeing_tour_v1');

export const readWellbeingTourState = store.read;
export const writeWellbeingTourState = store.write;
