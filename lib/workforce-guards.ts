import { WorkforceType } from '@/api/types/user';

/** Same discriminator as server WorkforceType / reports cohort filters (workforce-report-filters). */
export function isGeneralWorkerWorkforce(workforceType: string | null | undefined): boolean {
  return workforceType === WorkforceType.GENERAL_WORKER;
}
