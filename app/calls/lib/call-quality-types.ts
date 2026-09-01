export const CALL_QUALITY_METRIC_TYPES = ['boolean', 'score', 'text', 'enum', 'ratio'] as const;
export type CallQualityMetricType = (typeof CALL_QUALITY_METRIC_TYPES)[number];

export const CALL_QUALITY_METRIC_CATEGORIES = ['discovery', 'closing', 'behaviour', 'outcome'] as const;
export type CallQualityMetricCategory = (typeof CALL_QUALITY_METRIC_CATEGORIES)[number];

/** Metrics the AI pipeline expects — cannot be removed from the scorecard. */
export const PROTECTED_CALL_QUALITY_METRIC_IDS = ['coaching_recommendation', 'sales_opportunity'] as const;

export const BITDRYWALL_DEMO_COACHING_PROMPT = `Prioritise commercial discovery before presenting products or pricing. Reps should confirm business type, current supplier, monthly volume, and pain points (price, stock, delivery, quality) on every call.

On closing: always request permission to quote, capture WhatsApp or email, and agree a specific follow-up date — vague promises don't count.

Behaviour: aim for roughly 40% talk / 60% listen during discovery. When objections arise, acknowledge, clarify, respond, and confirm before moving on.

Flag calls scoring below 50 for manager review. Use coaching notes to give one concrete, transcript-specific improvement for the next call.`;

export type CallQualityMetricDefinition = {
  id: string;
  label: string;
  type: CallQualityMetricType;
  enumOptions?: string[];
  weight?: number;
  category?: CallQualityMetricCategory;
  required?: boolean;
};

export type OrganisationCallQualityConfig = {
  enabled?: boolean;
  dailyCallTarget?: number;
  productName?: string;
  dimensions?: CallQualityMetricDefinition[];
  coachingPrompt?: string;
  autoCreateLead?: boolean;
  reviewScoreThreshold?: number;
};

export type CallQualityMetricResult =
  | { type: 'boolean'; value: boolean; evidence?: string }
  | { type: 'score'; value: number; evidence?: string }
  | { type: 'text'; value: string }
  | { type: 'enum'; value: string; evidence?: string }
  | { type: 'ratio'; agentPct: number; clientPct: number };

export type CallQualityMetricsMap = Record<string, CallQualityMetricResult>;

function createMetricId(prefix = 'custom'): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : String(Date.now());
  return `${prefix}_${suffix}`;
}

export function createEmptyCallQualityMetric(
  overrides: Partial<CallQualityMetricDefinition> = {},
): CallQualityMetricDefinition {
  return {
    id: createMetricId(),
    label: 'New question',
    type: 'boolean',
    category: 'discovery',
    weight: 1,
    required: false,
    ...overrides,
  };
}

export function buildBitDrywallCallQualityTemplate(productName = 'BitDrywall'): OrganisationCallQualityConfig {
  const introLabel = `Did the salesperson introduce ${productName} properly?`;
  return {
    enabled: true,
    dailyCallTarget: 60,
    productName,
    reviewScoreThreshold: 50,
    autoCreateLead: false,
    coachingPrompt: BITDRYWALL_DEMO_COACHING_PROMPT,
    dimensions: [
      { id: 'intro_product', label: introLabel, type: 'boolean', category: 'discovery', required: true },
      { id: 'business_type', label: "Did they identify the customer's business type?", type: 'boolean', category: 'discovery' },
      { id: 'current_products', label: 'Did they ask what ceiling and partition products they currently buy?', type: 'boolean', category: 'discovery' },
      { id: 'monthly_volume', label: 'Did they ask about monthly purchasing volume?', type: 'boolean', category: 'discovery' },
      { id: 'current_supplier', label: "Did they identify the customer's current supplier?", type: 'boolean', category: 'discovery' },
      { id: 'pain_points', label: 'Did they ask about problems with price, stock, delivery or quality?', type: 'boolean', category: 'discovery' },
      { id: 'decision_maker', label: 'Did they establish who makes purchasing decisions?', type: 'boolean', category: 'discovery' },
      { id: 'quotation_permission', label: 'Did they request permission to send a quotation?', type: 'boolean', category: 'closing' },
      { id: 'contact_captured', label: 'Did they obtain a WhatsApp number or email?', type: 'boolean', category: 'closing' },
      { id: 'follow_up_date', label: 'Did they agree on a specific follow-up date?', type: 'boolean', category: 'closing' },
      { id: 'talk_listen_ratio', label: 'Talk/listen balance', type: 'ratio', category: 'behaviour' },
      { id: 'objection_handling', label: 'How well did they handle objections?', type: 'score', category: 'behaviour', weight: 2 },
      { id: 'sales_opportunity', label: 'Was there a genuine sales opportunity?', type: 'boolean', category: 'outcome', required: true },
      { id: 'lead_quality', label: 'Lead quality', type: 'enum', enumOptions: ['Cold', 'Warm', 'Hot'], category: 'outcome' },
      { id: 'coaching_recommendation', label: 'Coaching recommendation', type: 'text', category: 'outcome' },
    ],
  };
}

export const BITDRYWALL_CALL_QUALITY_TEMPLATE: OrganisationCallQualityConfig = buildBitDrywallCallQualityTemplate();
