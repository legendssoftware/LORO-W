import type { AxiosInstance } from 'axios';
import type { LeavesByUserResponse } from '@/api/types/leave';

/**
 * GET /leave/user/:ref - employee leave history (requires clerkUserId).
 * Returns leaves for the authenticated user's organization context.
 */
export async function getLeavesByUser(
  client: AxiosInstance,
  clerkUserId: string
): Promise<LeavesByUserResponse> {
  const { data } = await client.get<LeavesByUserResponse>(`/leave/user/${clerkUserId}`);
  return data;
}
