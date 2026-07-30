import type { AxiosInstance } from 'axios';

export interface ExchangeRateRow {
  code: string;
  rate: number;
}

export interface ExchangeRatesResponse {
  date: string;
  rates: ExchangeRateRow[];
}

/** GET /reports/exchange-rates — tblforex_history rates for ZAR conversion. */
export async function getExchangeRates(
  client: AxiosInstance,
  date?: string
): Promise<ExchangeRatesResponse> {
  const { data } = await client.get<ExchangeRatesResponse>('/reports/exchange-rates', {
    params: date ? { date } : undefined,
  });
  return data;
}
