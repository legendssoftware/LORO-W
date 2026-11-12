import type { AxiosInstance } from 'axios';
import type { OrganisationNoticeRecord } from '@/api/types/organisation-notice';

export type PaceNoticeResponse = {
  notice: OrganisationNoticeRecord | null;
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
