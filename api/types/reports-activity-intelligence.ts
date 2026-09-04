export type ActivityIntelligenceReliability = {
  score: number;
  verdict: 'unusable' | 'mixed' | 'usable';
  disclaimer: string;
};

export type ActivityIntelligenceTotals = {
  activities: number;
  telephone: number;
  physical: number;
  email: number;
  whatsapp: number;
  uniqueUsers: number;
  uniquePlaces: number;
};

export type ActivityIntelligenceCompleteness = {
  blankNotesPct: number;
  missingContactPct: number;
  missingQuotePct: number;
  missingFollowUpPct: number;
  missingClientPct: number;
  zeroGpsPct: number;
  connectedCount: number;
};

export type ActivityIntelligenceCluster = {
  place: string;
  ownerClerkUserId: string | null;
  ownerName: string | null;
  count: number;
  windowStart: string;
  windowEnd: string;
  windowMinutes: number;
  avgSeconds: number;
  flags: string[];
  blankNotesCount: number;
  missingContactCount: number;
  missingQuoteCount: number;
  missingFollowUpCount: number;
  voicemailCount: number;
  noAnswerCount: number;
};

export type ActivityIntelligenceTrend = {
  label: string;
  direction: 'up' | 'down' | 'flat';
  detail: string;
};

export type ActivityIntelligenceBrief = {
  summary: string;
  trends: ActivityIntelligenceTrend[];
  dataGaps: string[];
  recommendedActions: string[];
};

export type ActivityIntelligenceResponse = {
  reliability: ActivityIntelligenceReliability;
  totals: ActivityIntelligenceTotals;
  completeness: ActivityIntelligenceCompleteness;
  completenessCounts: {
    blankNotes: number;
    missingContact: number;
    missingQuote: number;
    missingFollowUp: number;
    missingClient: number;
    zeroGps: number;
  };
  outcome: {
    contactMadeYes: number;
    contactMadeNo: number;
    voicemail: number;
    noAnswer: number;
    deadAir: number;
    connectedTelephone: number;
  };
  clusters: ActivityIntelligenceCluster[];
  funnel: {
    withLead: number;
    withQuote: number;
    withSalesValue: number;
    leadPct: number;
    quotePct: number;
    salesValuePct: number;
    connectedTelephone: number;
    deadAir: number;
    commercialFact: number;
    nextStep: number;
    qualityConversations: number;
    missedOpportunities: number;
    commercialFactPct: number;
    nextStepPct: number;
  };
  pbxMatchedCount: number;
  pbxMatchRate: number | null;
  pbxQualityConversationCount: number;
  telephoneCount: number;
  brief: ActivityIntelligenceBrief | null;
  generatedAt: string;
  comparedFrom: string | null;
  comparedTo: string | null;
};

export type ActivityIntelligenceParams = {
  from?: string;
  to?: string;
  branchId?: number;
  userUid?: number;
};
