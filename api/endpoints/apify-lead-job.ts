import type { AxiosInstance } from 'axios';
import type {
  ApifyLeadScrapeJobMutationResponse,
  CreateApifyLeadScrapeJobBody,
  ListApifyLeadScrapeJobsResponse,
  PatchApifyLeadScrapeJobBody,
} from '@/api/types/apify-lead-job';

function jobsPath(orgRef: string, uid?: number): string {
  const base = `/organisations/${encodeURIComponent(orgRef)}/apify-lead-jobs`;
  return uid == null ? base : `${base}/${uid}`;
}

export async function getApifyLeadScrapeJobs(
  client: AxiosInstance,
  orgRef: string
): Promise<ListApifyLeadScrapeJobsResponse> {
  const { data } = await client.get<ListApifyLeadScrapeJobsResponse>(jobsPath(orgRef));
  return data;
}

export async function postApifyLeadScrapeJob(
  client: AxiosInstance,
  orgRef: string,
  body: CreateApifyLeadScrapeJobBody
): Promise<ApifyLeadScrapeJobMutationResponse> {
  const { data } = await client.post<ApifyLeadScrapeJobMutationResponse>(
    jobsPath(orgRef),
    body
  );
  return data;
}

export async function patchApifyLeadScrapeJob(
  client: AxiosInstance,
  orgRef: string,
  uid: number,
  body: PatchApifyLeadScrapeJobBody
): Promise<ApifyLeadScrapeJobMutationResponse> {
  const { data } = await client.patch<ApifyLeadScrapeJobMutationResponse>(
    jobsPath(orgRef, uid),
    body
  );
  return data;
}

export async function runApifyLeadScrapeJobNow(
  client: AxiosInstance,
  orgRef: string,
  uid: number
): Promise<ApifyLeadScrapeJobMutationResponse> {
  const { data } = await client.post<ApifyLeadScrapeJobMutationResponse>(
    `${jobsPath(orgRef, uid)}/run-now`
  );
  return data;
}

export async function deleteApifyLeadScrapeJob(
  client: AxiosInstance,
  orgRef: string,
  uid: number
): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(jobsPath(orgRef, uid));
  return data;
}
