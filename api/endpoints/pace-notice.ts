import type { AxiosInstance } from 'axios';
import type { OrganisationNoticeContent } from '@/api/types/organisation-notice';

export type PaceNoticeTheme = 'alert' | 'policy' | 'success';

export type PerformanceInsightNextStep = 'calls' | 'leads' | 'quotations';

export type PerformanceInsightRecovery = {
  calls: number;
  newLeads: number;
  quotations: number;
  remainingWorkingDays: number;
};

/** Flyer fields for the Performance Insight dialog. */
export type PerformanceInsight = {
  paceBand: 'red' | 'yellow' | 'green';
  activityPct: number;
  activityPctDisplay: number;
  gapPointsToMinExpected: number;
  rewardCapPctPoints: number;
  banner: string;
  headline: string;
  nextSteps: PerformanceInsightNextStep[];
  ctaLabel: string;
  recovery: PerformanceInsightRecovery | null;
};

export type PaceNoticeRecord = {
  uid: number;
  title: string;
  subtitle: string;
  content: OrganisationNoticeContent;
  insight: PerformanceInsight | null;
  translations: null;
  showFrom: string;
  showUntil: null;
  theme: PaceNoticeTheme;
  isEnabled: true;
  createdAt: string;
  updatedAt: string;
};

export type PaceNoticeResponse = {
  notice: PaceNoticeRecord | null;
};

export type AcknowledgePaceNoticeResponse = {
  message: string;
  noticeUid: number;
  status: 'acknowledged';
};

/** Load the signed-in user's automatic pace notice. The server refreshes it on each call. */
export async function getPaceNotice(
  client: AxiosInstance,
  userRef: string
): Promise<PaceNoticeResponse> {
  const { data } = await client.get<PaceNoticeResponse>(
    `/user/${encodeURIComponent(userRef)}/target/pace-notice`
  );
  return data;
}

/** Mark the current period's pace notice as read. */
export async function acknowledgePaceNotice(
  client: AxiosInstance,
  userRef: string
): Promise<AcknowledgePaceNoticeResponse> {
  const { data } = await client.post<AcknowledgePaceNoticeResponse>(
    `/user/${encodeURIComponent(userRef)}/target/pace-notice/acknowledge`
  );
  return data;
}
