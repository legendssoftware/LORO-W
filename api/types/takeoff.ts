export interface TakeoffInputField {
  key: string;
  label: string;
  unit: string;
  required: boolean;
}

export interface TakeoffSystemSummary {
  code: string;
  name: string;
  category: string;
  unit: string;
  inputs: TakeoffInputField[];
}

export interface TakeoffLine {
  productCode: string;
  description: string;
  size: string;
  length: string;
  unit: string;
  qty: number;
  each: number;
  subTotal: number;
  discount: number;
  total: number;
  matched: boolean;
  productUid: number | null;
  productName: string | null;
}

export interface TakeoffCalculation {
  systemId: string;
  systemName: string;
  inputs: Record<string, number>;
  lines: TakeoffLine[];
  subTotal: number;
  vat: number;
  vatRate: number;
  total: number;
  perArea: number | null;
  perAreaIncl: number | null;
  perLinear: number | null;
  errors: string[];
}

export interface TakeoffBatchResult {
  items: Array<{ systemCode: string; result: TakeoffCalculation }>;
  rollup: {
    lines: TakeoffLine[];
    subTotal: number;
    vat: number;
    total: number;
  };
}

export interface TakeoffSection {
  uid: number;
  systemCode: string;
  systemName: string;
  inputs: Record<string, number>;
  result: TakeoffCalculation;
  sortOrder: number;
}

export interface TakeoffRecord {
  uid: number;
  clientUid: number | null;
  clientName: string | null;
  reference: string;
  notes: string;
  status: 'draft' | 'issued';
  quotationUid: number | null;
  quotationNumber: string | null;
  subTotal: number;
  vat: number;
  total: number;
  createdAt: string;
  sections?: TakeoffSection[];
}

export interface IssueTakeoffResult {
  message: string;
  quotationUid: number;
  quotationNumber: string;
  priceListType: string;
  takeoff: TakeoffRecord;
}

export const PRICE_LISTS = [
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'wholesale', label: 'Wholesale' },
  { value: 'retail', label: 'Retail' },
  { value: 'local', label: 'Local' },
  { value: 'foreign', label: 'Foreign' },
  { value: 'bulk', label: 'Bulk' },
  { value: 'new', label: 'New' },
] as const;
