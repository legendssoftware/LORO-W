export type PulsePeriod = 'morning' | 'evening';
export type PulseMood = 'excellent' | 'good' | 'okay' | 'stressed' | 'not_feeling_well';
export type PulseTalkTo = 'none' | 'manager' | 'hr' | 'regional_manager' | 'confidential';

export interface PulseSubmitBody {
  period: PulsePeriod;
  mood: PulseMood;
  contributors?: string[];
  talkTo?: PulseTalkTo;
  followUpRequested?: boolean;
  comments?: string;
  localDate?: string;
  attendanceUid?: number;
}

export interface PulseSubmitResponse {
  uid: number;
  period: PulsePeriod;
  mood: PulseMood;
  score: number;
  localDate: string;
  talkTo: PulseTalkTo;
  followUpRequested: boolean;
  xpAwarded: boolean;
}

export interface PulseMeResponse {
  date: string;
  morningSubmitted: boolean;
  eveningSubmitted: boolean;
  morningMood: PulseMood | null;
  eveningMood: PulseMood | null;
}

export interface PulseKpis {
  employeesCheckedIn: number;
  morningMoodScore: number | null;
  eveningMoodScore: number | null;
  dailyChange: number | null;
  supportRequests: number;
  highRiskEmployees: number;
  burnoutRisk: 'Low' | 'Medium' | 'High';
}

export interface PulseBranchRow {
  branchUid: number | null;
  branchName: string;
  morningScore: number | null;
  eveningScore: number | null;
  trend: 'up' | 'down' | 'flat';
}

export interface PulseNamedPerson {
  ownerUid: number;
  name: string;
  branchName: string | null;
  morningMood: PulseMood | null;
  eveningMood: PulseMood | null;
  talkTo: PulseTalkTo;
  followUpRequested: boolean;
  contributors: string[];
  comments: string | null;
  riskReason?: 'declining_streak' | 'day_drop' | 'support';
}

export interface PulseDailyResponse {
  date: string;
  kpis: PulseKpis;
  branches: PulseBranchRow[];
  supportQueue: PulseNamedPerson[];
  highRisk: PulseNamedPerson[];
  confidentialSupportCount: number;
}

export interface PulseInsightItem {
  severity: 'positive' | 'attention' | 'action';
  title: string;
  detail: string;
}

export interface PulseInsightsResponse {
  from: string;
  to: string;
  source: 'gemini' | 'deterministic';
  items: PulseInsightItem[];
  disclaimer: string;
}

export interface PulseIndex {
  label: string;
  value: number;
  unit: string;
}

export interface PulseExecutiveResponse {
  from: string;
  to: string;
  indices: PulseIndex[];
}

export interface PulseCorrelationRow {
  id: string;
  finding: string;
  deltaPct: number | null;
  association: string;
  n: number;
  window: string;
  confidence: 'low' | 'medium' | 'high';
  sourceLabel: string;
}

export interface PulseCorrelationsResponse {
  from: string;
  to: string;
  findings: PulseCorrelationRow[];
}
