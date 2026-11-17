/** Matches the server Engage draft controls and the WhatsApp template variable cap. */

export const ENGAGE_WHATSAPP_MAX_CHARS = 300;

export const ENGAGE_INTENTS = [
  'first_contact',
  'follow_up',
  'proposal_check_in',
  'quote_follow_up',
  're_engage',
] as const;

export const ENGAGE_TONES = ['professional', 'friendly', 'direct', 'formal'] as const;

export type EngageIntent = (typeof ENGAGE_INTENTS)[number];
export type EngageTone = (typeof ENGAGE_TONES)[number];
export type EngageChannel = 'email' | 'sms' | 'whatsapp';

export const ENGAGE_INTENT_OPTIONS: { value: EngageIntent; label: string }[] = [
  { value: 'first_contact', label: 'First contact' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'proposal_check_in', label: 'Proposal check-in' },
  { value: 'quote_follow_up', label: 'Quote follow-up' },
  { value: 're_engage', label: 'Re-engage' },
];

export const ENGAGE_TONE_OPTIONS: { value: EngageTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'direct', label: 'Direct' },
  { value: 'formal', label: 'Formal' },
];

export const ENGAGE_MIXED_INDUSTRY = '__mixed__';

/**
 * Stored BANT need, then notes, used to prefill the single-lead Need field.
 */
export function prefillEngageNeed(lead: {
  notes?: string | null;
  painPoints?: string | null;
  bantQualification?: {
    need?: { description?: string | null; painPoints?: string[] | null };
  } | null;
}): string {
  const description = lead.bantQualification?.need?.description?.trim();
  if (description) return description.slice(0, 160);
  const pains = lead.bantQualification?.need?.painPoints
    ?.map((point) => point.trim())
    .filter(Boolean);
  if (pains && pains.length > 0) return pains.join(', ').slice(0, 160);
  const notes = lead.notes?.trim();
  if (notes) return notes.slice(0, 160);
  return lead.painPoints?.trim().slice(0, 160) ?? '';
}

export function whatsAppOverCap(channel: EngageChannel | null, message: string): boolean {
  return channel === 'whatsapp' && message.trim().length > ENGAGE_WHATSAPP_MAX_CHARS;
}
