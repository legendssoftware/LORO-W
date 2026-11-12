/**
 * GET /reports/travel-fuel-quote — billable km, litres, and rand before a download.
 */

import type { AxiosInstance } from 'axios';

export type TravelFuelQuoteSource = 'custom' | 'saved' | 'country' | 'mixedCountry';

export type TravelFuelQuoteDaySource = 'custom' | 'saved' | 'locked' | 'country' | 'none';

export type TravelFuelQuoteDay = {
  date: string;
  billableKm: number;
  litres: number;
  pricePerLitreZar: number | null;
  costZar: number;
  source: TravelFuelQuoteDaySource;
};

export type TravelFuelQuote = {
  fromYmd: string;
  toYmd: string;
  priceSource: TravelFuelQuoteSource;
  pricePerLitreZar: number | null;
  savedPricePerLitreZar: number | null;
  billableKm: number;
  litres: number;
  costZar: number;
  days: TravelFuelQuoteDay[];
};

export type TravelFuelQuoteParams = {
  from: string;
  to: string;
  userUid: number;
  fuelPricePerLitreZar?: number;
  skipErrorToast?: boolean;
};

type TravelFuelQuoteEnvelope = {
  success?: boolean;
  message?: string;
  data?: TravelFuelQuote;
};

function isQuote(value: unknown): value is TravelFuelQuote {
  if (!value || typeof value !== 'object') return false;
  const row = value as TravelFuelQuote;
  return typeof row.fromYmd === 'string' && typeof row.costZar === 'number' && Array.isArray(row.days);
}

/**
 * Preview the fuel cost for one user. Does not download a file.
 */
export async function fetchTravelFuelQuote(
  client: AxiosInstance,
  params: TravelFuelQuoteParams
): Promise<TravelFuelQuote> {
  const response = await client.get<TravelFuelQuoteEnvelope | TravelFuelQuote>(
    '/reports/travel-fuel-quote',
    {
      params: {
        from: params.from,
        to: params.to,
        userUid: params.userUid,
        ...(params.fuelPricePerLitreZar != null
          ? { fuelPricePerLitreZar: params.fuelPricePerLitreZar }
          : {}),
      },
      timeout: 30_000,
      ...(params.skipErrorToast ? { meta: { skipErrorToast: true } } : {}),
    }
  );
  const body = response.data;
  if (isQuote(body)) return body;
  if (body && typeof body === 'object' && isQuote(body.data)) return body.data;
  throw new Error('Fuel quote response was empty');
}
