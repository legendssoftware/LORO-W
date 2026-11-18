import type { AxiosInstance } from 'axios';

export interface QuotationConversionStatus {
  converted?: boolean;
  status?: string;
  orderUid?: number;
  message?: string;
}

/** POST /quotations/:id/convert */
export async function convertQuotation(
  client: AxiosInstance,
  id: number,
  body: { notes?: string; markAsPaid?: boolean } = {}
): Promise<{ message?: string }> {
  const { data } = await client.post<{ message?: string }>(`/quotations/${id}/convert`, body);
  return data;
}

/** GET /quotations/:ref/conversion-status */
export async function getQuotationConversionStatus(
  client: AxiosInstance,
  ref: number | string
): Promise<QuotationConversionStatus> {
  const { data } = await client.get<QuotationConversionStatus>(`/quotations/${ref}/conversion-status`);
  return data;
}

/** POST /quotations/:ref/conversion/rollback */
export async function rollbackQuotationConversion(
  client: AxiosInstance,
  ref: number | string
): Promise<{ message?: string }> {
  const { data } = await client.post<{ message?: string }>(`/quotations/${ref}/conversion/rollback`);
  return data;
}
