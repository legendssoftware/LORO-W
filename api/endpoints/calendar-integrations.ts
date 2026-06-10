import type { AxiosInstance } from 'axios';

export type CalendarProvider = 'google' | 'microsoft';

export interface CalendarConnectionStatus {
  provider: CalendarProvider;
  linkedEmail: string;
  status: 'active' | 'revoked' | 'error';
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface GetCalendarIntegrationsStatusResponse {
  loroEmail: string;
  suggestedProvider: CalendarProvider | 'both';
  allowedProviders: CalendarProvider[];
  calendarSyncEnabled: boolean;
  connections: CalendarConnectionStatus[];
}

export interface CalendarConnectResponse {
  url: string;
}

export interface CalendarDisconnectResponse {
  message: string;
}

export interface CalendarBackfillResponse {
  synced: number;
}

export async function getCalendarIntegrationsStatus(
  client: AxiosInstance
): Promise<GetCalendarIntegrationsStatusResponse> {
  const { data } = await client.get<GetCalendarIntegrationsStatusResponse>(
    '/calendar-integrations/status'
  );
  return data;
}

export async function postCalendarConnect(
  client: AxiosInstance,
  provider: CalendarProvider
): Promise<CalendarConnectResponse> {
  const { data } = await client.post<CalendarConnectResponse>(
    `/calendar-integrations/${provider}/connect`
  );
  return data;
}

export async function deleteCalendarConnection(
  client: AxiosInstance,
  provider: CalendarProvider,
  deleteEvents = false
): Promise<CalendarDisconnectResponse> {
  const { data } = await client.delete<CalendarDisconnectResponse>(
    `/calendar-integrations/${provider}`,
    { params: deleteEvents ? { deleteEvents: 'true' } : undefined }
  );
  return data;
}

export async function postCalendarSyncBackfill(
  client: AxiosInstance,
  provider: CalendarProvider
): Promise<CalendarBackfillResponse> {
  const { data } = await client.post<CalendarBackfillResponse>(
    `/calendar-integrations/${provider}/sync-backfill`
  );
  return data;
}
