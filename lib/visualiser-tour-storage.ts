'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_visualiser_tour_v1');

export const readVisualiserTourState = store.read;
export const writeVisualiserTourState = store.write;
