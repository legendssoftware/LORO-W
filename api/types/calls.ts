export type TranscriptStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'skipped';
export type SpeakerRole = 'agent' | 'client' | 'unknown';
export type CallOrigin = 'in_app' | 'company_phone' | 'personal_mobile';

export type CallQualityMetricResult =
  | { type: 'boolean'; value: boolean; evidence?: string }
  | { type: 'score'; value: number; evidence?: string }
  | { type: 'text'; value: string }
  | { type: 'enum'; value: string; evidence?: string }
  | { type: 'ratio'; agentPct: number; clientPct: number };

export type CallQualityMetricsMap = Record<string, CallQualityMetricResult>;

export type CallQualityMetricDefinition = {
  id: string;
  label: string;
  type: 'boolean' | 'score' | 'text' | 'enum' | 'ratio';
  enumOptions?: string[];
  weight?: number;
  category?: 'discovery' | 'closing' | 'behaviour' | 'outcome';
  required?: boolean;
};

export type DialogueTurn = {
  speaker: string;
  speakerRole: SpeakerRole;
  text: string;
  startedAtMs?: number;
};

export type CallRecordingLinkedParty = {
  uid: number;
  name: string | null;
};

export type CallRecordingListItem = {
  uid: string;
  cdrUid: string;
  startedAt: string | null;
  durationSeconds: number | null;
  callType: string | null;
  fromNumber: string | null;
  toNumber: string | null;
  fromName: string | null;
  toName: string | null;
  origin: CallOrigin;
  companyCallerId: string | null;
  pbxExtension: string | null;
  transcriptStatus: TranscriptStatus;
  transcriptError: string | null;
  hasAudio: boolean;
  ownerClerkUserId: string | null;
  ownerName: string | null;
  scoreOverall: number | null;
  client: CallRecordingLinkedParty | null;
  lead: CallRecordingLinkedParty | null;
};

export type CallScoreDimension =
  | 'opening'
  | 'discovery'
  | 'productKnowledge'
  | 'nextSteps'
  | 'professionalism';

export type CallScoreBreakdown = {
  opening: number;
  discovery: number;
  productKnowledge: number;
  nextSteps: number;
  professionalism: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  metrics?: CallQualityMetricsMap;
};

export type CallRecordingDetail = CallRecordingListItem & {
  dialogue: DialogueTurn[] | null;
  audioUrl: string | null;
  fileName: string | null;
  checkInUid: number | null;
  scoreBreakdown: CallScoreBreakdown | null;
  ratedAt: string | null;
  localCallId: string | null;
  srcExt: string | null;
  dstExt: string | null;
  callId: string | null;
  recordingId: number | null;
};

export type CallRecordingListResponse = {
  data: CallRecordingListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CallRecordingDetailResponse = {
  call: CallRecordingDetail;
};

export type CallRetryTranscriptResponse = {
  message: string;
  uid: string;
  transcriptStatus: TranscriptStatus;
};

export type CallRateConversationResponse = CallRecordingDetailResponse;

export type CallStartPayload = {
  toNumber: string;
  clientUid?: number;
  leadUid?: number;
  checkInUid?: number;
};

export type CallStartResponse = {
  message: string;
  call: CallRecordingListItem;
};

export type GetCallsParams = {
  page?: number;
  limit?: number;
  status?: TranscriptStatus | '';
  search?: string;
  origin?: CallOrigin | '';
  ownerClerkUserId?: string;
  callType?: 'inbound' | 'outbound' | '';
  startDate?: string;
  endDate?: string;
  branchId?: number;
};
