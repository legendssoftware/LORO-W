import type { AxiosInstance } from 'axios';

/** ERP quotation line from GET /erp/profile/quotations */
export interface ErpProfileQuotationLine {
  itemCode: string | null;
  description: string | null;
  quantity: number;
  inclLineTotal: number;
  tax: number;
  exclPrice: number;
  inclPrice: number;
  unit: string | null;
  category: string | null;
}

export interface ErpProfileQuotation {
  key: string;
  docNumber: string | null;
  store: string | null;
  saleDate: string | null;
  customerCode: string | null;
  totalIncl: number;
  totalTax: number;
  salesCode: string | null;
  salesName?: string | null;
  status?: string | null;
  invoiceUsed?: number;
  items: ErpProfileQuotationLine[];
}

export interface ProfileQuotationsData {
  salesCode: string;
  salesName: string;
  quotations: ErpProfileQuotation[];
}

export interface ProfileQuotationsApiResponse {
  success: boolean;
  data: ProfileQuotationsData | null;
  message?: string;
  error?: string;
  periodStartDate?: string;
  periodEndDate?: string;
  userId?: string;
  orgId?: string;
}

export type ProfileQuotationsResult = (ProfileQuotationsData & {
  periodStartDate?: string;
  periodEndDate?: string;
  infoMessage?: string;
}) | null;

/**
 * GET /erp/profile/quotations — Pastel quotations for target period (or month=YYYY-MM).
 */
export async function getProfileQuotations(
  client: AxiosInstance,
  options?: { month?: string }
): Promise<ProfileQuotationsApiResponse> {
  const { data } = await client.get<ProfileQuotationsApiResponse>('/erp/profile/quotations', {
    params: options?.month ? { month: options.month } : undefined,
  });
  return data;
}
