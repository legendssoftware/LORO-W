import type { LeadListItem } from '@/api/types/leads';

export type LeadMissedOpportunity = {
  customerQuote: string;
  repResponse: string;
  shouldHaveAsked: string[];
};

export type LeadCommercialSnapshot = {
  updatedAt?: string;
  callUid?: string;
  summary?: string | null;
  decisionMakerReached?: boolean;
  qualityConversation?: boolean;
  immediateNeed?: boolean;
  projectIdentified?: boolean;
  boqRequested?: boolean;
  followUpBooked?: boolean;
  missedOpportunity?: boolean;
  missedOpportunities?: LeadMissedOpportunity[];
  leadQuality?: string | null;
  coaching?: string | null;
  scoreOverall?: number | null;
};

export function parseLeadCommercialSnapshot(
  lead: LeadListItem | null | undefined,
): LeadCommercialSnapshot | null {
  const raw = lead?.customFields;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const snap = (raw as Record<string, unknown>).commercialSnapshot;
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return null;
  return snap as LeadCommercialSnapshot;
}

export function commercialSnapshotHeadline(snapshot: LeadCommercialSnapshot): string {
  const parts: string[] = [];
  if (snapshot.immediateNeed) parts.push('current need');
  if (snapshot.projectIdentified) parts.push('project');
  if (snapshot.boqRequested) parts.push('BOQ asked');
  if (snapshot.followUpBooked) parts.push('follow-up booked');
  if (snapshot.missedOpportunity) parts.push('missed pursuit');
  if (parts.length === 0 && snapshot.qualityConversation) return 'Quality conversation — no live requirement captured';
  if (parts.length === 0 && snapshot.summary) return snapshot.summary;
  if (parts.length === 0) return 'Last call scored, no commercial facts yet';
  return parts.join(' · ');
}
