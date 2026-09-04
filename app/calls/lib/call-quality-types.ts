export const CALL_QUALITY_METRIC_TYPES = ['boolean', 'score', 'text', 'enum', 'ratio'] as const;
export type CallQualityMetricType = (typeof CALL_QUALITY_METRIC_TYPES)[number];

export const CALL_QUALITY_METRIC_CATEGORIES = ['discovery', 'closing', 'behaviour', 'outcome'] as const;
export type CallQualityMetricCategory = (typeof CALL_QUALITY_METRIC_CATEGORIES)[number];

/** Metrics the AI pipeline expects — cannot be removed from the scorecard. */
export const PROTECTED_CALL_QUALITY_METRIC_IDS = ['coaching_recommendation', 'missed_opportunity'] as const;

export const BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION = 3;

export const BITDRYWALL_DEMO_COACHING_PROMPT = `Score whether the rep asked the right commercial questions and attempted to create an opportunity — not whether the customer already had a job.

Prioritise decision-maker access, then discovery: what they do, immediate material needs, current/starting projects (location, timing, type), current supplier and buying criteria, then specifically ask for a BOQ, material list, or a chance to quote.

When the customer already has a supplier, do not end the call. Ask what they struggle to get, or what they are currently pricing. Never dump a price list in place of project/BOQ discovery.

Agree a specific next step (quote, BOQ, WhatsApp, meeting, or callback date). Vague "I'll send something" does not count.

Flag missed opportunities: if the customer volunteered a project, material need, or competitor, the rep must follow up with contractor/material/quantity/BOQ/timing/quote — not "okay, thanks".

A call with no current requirement can still score highly if the script was followed. Flag scores below 55 and any missed opportunity for manager review. Give one concrete, transcript-specific coaching note.`;

export const OLD_BITDRYWALL_METRIC_IDS = [
  'intro_product',
  'business_type',
  'current_products',
  'monthly_volume',
  'current_supplier',
  'pain_points',
  'decision_maker',
  'quotation_permission',
  'contact_captured',
  'follow_up_date',
  'talk_listen_ratio',
  'objection_handling',
  'sales_opportunity',
  'lead_quality',
  'coaching_recommendation',
] as const;

export type CallQualityMetricDefinition = {
  id: string;
  label: string;
  type: CallQualityMetricType;
  enumOptions?: string[];
  weight?: number;
  category?: CallQualityMetricCategory;
  required?: boolean;
  affectsScore?: boolean;
};

export type OrganisationCallQualityConfig = {
  enabled?: boolean;
  dailyCallTarget?: number;
  productName?: string;
  dimensions?: CallQualityMetricDefinition[];
  coachingPrompt?: string;
  autoCreateLead?: boolean;
  reviewScoreThreshold?: number;
  scorecardVersion?: number;
};

export type CallQualityMetricResult =
  | { type: 'boolean'; value: boolean; evidence?: string }
  | { type: 'score'; value: number; evidence?: string; notApplicable?: boolean }
  | { type: 'text'; value: string }
  | { type: 'enum'; value: string; evidence?: string }
  | { type: 'ratio'; agentPct: number; clientPct: number };

export type CallQualityMetricsMap = Record<string, CallQualityMetricResult>;

export type CallMissedOpportunity = {
  customerQuote: string;
  repResponse: string;
  shouldHaveAsked: string[];
};

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
    affectsScore: true,
    ...overrides,
  };
}

function metric(
  partial: CallQualityMetricDefinition & { id: string; label: string; type: CallQualityMetricType },
): CallQualityMetricDefinition {
  return {
    weight: 0,
    required: false,
    affectsScore: partial.category === 'outcome' ? false : true,
    ...partial,
  };
}

export function buildBitDrywallCallQualityTemplate(productName = 'BitDrywall'): OrganisationCallQualityConfig {
  return {
    enabled: true,
    dailyCallTarget: 60,
    productName,
    reviewScoreThreshold: 55,
    autoCreateLead: false,
    scorecardVersion: BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION,
    coachingPrompt: BITDRYWALL_DEMO_COACHING_PROMPT,
    dimensions: [
      metric({
        id: 'correct_decision_maker',
        label: 'Correct decision-maker (owner, buyer, procurement, QS, PM, architect)',
        type: 'score',
        category: 'discovery',
        weight: 10,
      }),
      metric({
        id: 'professional_introduction',
        label: `Professional introduction (name, ${productName}, reason for calling)`,
        type: 'score',
        category: 'behaviour',
        weight: 0,
        affectsScore: false,
      }),
      metric({
        id: 'customer_discovery',
        label: 'Customer discovery (what they do, type of work, projects, purchasing responsibility)',
        type: 'score',
        category: 'discovery',
        weight: 10,
      }),
      metric({
        id: 'immediate_opportunity',
        label: 'Immediate opportunity (material needed now, current work, current quotations)',
        type: 'score',
        category: 'discovery',
        weight: 15,
      }),
      metric({
        id: 'project_discovery',
        label: 'Project discovery (current/starting projects, location, timing, type)',
        type: 'score',
        category: 'discovery',
        weight: 15,
      }),
      metric({
        id: 'buying_information',
        label: 'Buying information (current supplier, criteria, problems, stock, price/service)',
        type: 'score',
        category: 'discovery',
        weight: 10,
      }),
      metric({
        id: 'boq_quotation_opportunity',
        label: 'BOQ / quotation opportunity (asked for BOQ, material list, or chance to quote)',
        type: 'score',
        category: 'closing',
        weight: 20,
      }),
      metric({
        id: 'questioning_listening',
        label: 'Good questioning and listening (open-ended, follow-ups, did not dominate)',
        type: 'score',
        category: 'behaviour',
        weight: 0,
        affectsScore: false,
      }),
      metric({
        id: 'objection_handling',
        label: 'Objection handling (have a supplier, send a price list, not interested)',
        type: 'score',
        category: 'behaviour',
        weight: 5,
      }),
      metric({
        id: 'next_action',
        label: 'Next action (specific quote, BOQ, WhatsApp, meeting, or callback date)',
        type: 'score',
        category: 'closing',
        weight: 15,
      }),
      metric({
        id: 'decision_maker_reached',
        label: 'Spoke to a commercial decision-maker',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'quality_conversation',
        label: 'Quality conversation (real two-way selling conversation with a decision-maker)',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'immediate_opportunity_found',
        label: 'Customer indicated a current material or quotation need',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'project_identified',
        label: 'Customer mentioned a current or upcoming project',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'boq_requested',
        label: 'Rep asked for a BOQ or material list',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'follow_up_booked',
        label: 'Specific follow-up was agreed',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'missed_opportunity',
        label: 'Missed opportunity (customer volunteered commercial info the rep did not pursue)',
        type: 'boolean',
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'lead_quality',
        label: 'Lead quality',
        type: 'enum',
        enumOptions: ['Cold', 'Warm', 'Hot'],
        category: 'outcome',
        affectsScore: false,
      }),
      metric({
        id: 'coaching_recommendation',
        label: 'Coaching recommendation',
        type: 'text',
        category: 'outcome',
        affectsScore: false,
      }),
    ],
  };
}

function dimensionIds(dimensions: CallQualityMetricDefinition[]): string[] {
  return dimensions.map((row) => row.id).sort();
}

function sameIdSet(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedRight = [...right].sort();
  return left.every((id, index) => id === sortedRight[index]);
}

export function isLegacyBitDrywallDimensionSet(
  dimensions: CallQualityMetricDefinition[] | undefined,
): boolean {
  if (!dimensions?.length) return false;
  return sameIdSet(dimensionIds(dimensions), OLD_BITDRYWALL_METRIC_IDS);
}

export function resolveOrganisationCallQualityConfig(
  config: Partial<OrganisationCallQualityConfig> | null | undefined,
): OrganisationCallQualityConfig {
  const template = buildBitDrywallCallQualityTemplate(config?.productName);
  if (!config) return template;

  const savedVersion = config.scorecardVersion ?? 0;
  const templateIds = dimensionIds(template.dimensions);
  const shouldUpgrade =
    savedVersion < BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION &&
    (!config.dimensions?.length ||
      isLegacyBitDrywallDimensionSet(config.dimensions) ||
      sameIdSet(dimensionIds(config.dimensions), templateIds));

  if (shouldUpgrade) {
    const customPrompt = config.coachingPrompt?.trim();
    const defaultV1PromptStarts =
      'Prioritise commercial discovery before presenting products or pricing';
    const keepCustomPrompt = Boolean(customPrompt && !customPrompt.startsWith(defaultV1PromptStarts));
    return {
      ...template,
      enabled: config.enabled ?? template.enabled,
      dailyCallTarget: config.dailyCallTarget ?? template.dailyCallTarget,
      productName: config.productName?.trim() || template.productName,
      autoCreateLead: config.autoCreateLead ?? template.autoCreateLead,
      reviewScoreThreshold:
        config.reviewScoreThreshold != null && config.reviewScoreThreshold !== 50
          ? config.reviewScoreThreshold
          : template.reviewScoreThreshold,
      coachingPrompt: keepCustomPrompt ? customPrompt : template.coachingPrompt,
    };
  }

  if (config.dimensions?.length) {
    return {
      ...template,
      ...config,
      dimensions: config.dimensions,
      scorecardVersion: Math.max(savedVersion, BITDRYWALL_CALL_QUALITY_SCORECARD_VERSION),
    };
  }

  return {
    ...template,
    ...config,
    dimensions: template.dimensions,
  };
}

export function scoringCallQualityDimensions(
  config: OrganisationCallQualityConfig,
): CallQualityMetricDefinition[] {
  return (config.dimensions ?? []).filter((dimension) => {
    if (dimension.affectsScore === false) return false;
    return dimension.type === 'boolean' || dimension.type === 'score';
  });
}

export const BITDRYWALL_CALL_QUALITY_TEMPLATE: OrganisationCallQualityConfig =
  buildBitDrywallCallQualityTemplate();
