export type VisitQualityHintInput = {
  notes?: string | null;
  contactFullName?: string | null;
  followUp?: string | null;
  methodOfContact?: string | null;
  quotationNumber?: string | null;
  salesValue?: number | string | null;
};

/**
 * Soft completeness checklist for end-visit. Does not block submit.
 */
export function visitQualityMissingFields(input: VisitQualityHintInput): string[] {
  const missing: string[] = [];
  if (!input.notes?.trim()) missing.push('Notes');
  if (!input.contactFullName?.trim()) missing.push('Contact person');
  if (!input.followUp?.trim()) missing.push('Follow-up date');
  const isTelephone = String(input.methodOfContact ?? '').toLowerCase() === 'telephone';
  const quoteNumber = input.quotationNumber?.trim();
  const value = Number(input.salesValue);
  const hasQuote = Boolean(quoteNumber) || (Number.isFinite(value) && value > 0);
  if (isTelephone && !hasQuote) missing.push('Quotation or value');
  return missing;
}
