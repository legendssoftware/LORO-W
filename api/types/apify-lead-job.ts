export const APIFY_JOB_RUN_STATUSES = [
  'idle',
  'running',
  'importing',
  'succeeded',
  'failed',
] as const;

export type ApifyJobRunStatus = (typeof APIFY_JOB_RUN_STATUSES)[number];

export type ApifyLeadJobImportSummary = {
  imported: number;
  failed: number;
  skippedDuplicates: number;
  remindersCreated?: number;
  finishedAt: string;
};

export type ApifyLeadScrapeJobRecord = {
  uid: number;
  name: string;
  searchStrings: string[];
  locationQuery: string;
  maxPlaces: number;
  skipClosedPlaces: boolean;
  scrapeContacts: boolean;
  source: string | null;
  assignedUserIds: number[] | null;
  targetBranchIds: number[] | null;
  daysOfWeek: number[];
  hour: number;
  minute: number;
  timeZone: string;
  isEnabled: boolean;
  isRunning: boolean;
  lastRunStatus: ApifyJobRunStatus;
  inFlightRunId: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastError: string | null;
  lastImportSummary: ApifyLeadJobImportSummary | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateApifyLeadScrapeJobBody = {
  name?: string;
  searchStrings: string[];
  locationQuery: string;
  maxPlaces?: number;
  skipClosedPlaces?: boolean;
  scrapeContacts?: boolean;
  source?: string;
  assignedUserIds?: number[];
  targetBranchIds?: number[];
  daysOfWeek?: number[];
  hour?: number;
  minute?: number;
  timeZone?: string;
  isEnabled?: boolean;
};

export type PatchApifyLeadScrapeJobBody = Partial<CreateApifyLeadScrapeJobBody>;

export type ListApifyLeadScrapeJobsResponse = {
  apifyConfigured: boolean;
  jobs: ApifyLeadScrapeJobRecord[];
};

export type ApifyLeadScrapeJobMutationResponse = {
  job: ApifyLeadScrapeJobRecord;
  message: string;
};
