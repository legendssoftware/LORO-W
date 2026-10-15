'use client';

import { createMonthlyTourStorage } from '@/lib/create-monthly-tour-storage';

export { getCurrentYearMonth } from '@/lib/tour-period';

const store = createMonthlyTourStorage('loro_assets_tour_v1');

export const readAssetsTourState = store.read;
export const writeAssetsTourState = store.write;
