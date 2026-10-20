import type { AxiosInstance } from 'axios';
import type {
  IssueTakeoffResult,
  TakeoffBatchResult,
  TakeoffCalculation,
  TakeoffRecord,
  TakeoffSystemSummary,
} from '@/api/types/takeoff';

export async function getTakeoffSystems(client: AxiosInstance): Promise<TakeoffSystemSummary[]> {
  const { data } = await client.get<TakeoffSystemSummary[]>('/takeoff/systems');
  return data;
}

export async function calculateTakeoffBatch(
  client: AxiosInstance,
  body: {
    items: Array<{ systemCode: string; inputs: Record<string, number> }>;
    clientUid?: number;
  },
): Promise<TakeoffBatchResult> {
  const { data } = await client.post<TakeoffBatchResult>('/takeoff/calculate/batch', body);
  return data;
}

export async function calculateTakeoff(
  client: AxiosInstance,
  systemCode: string,
  inputs: Record<string, number>,
): Promise<TakeoffCalculation> {
  const { data } = await client.post<TakeoffCalculation>('/takeoff/calculate', { systemCode, inputs });
  return data;
}

export async function listTakeoffs(client: AxiosInstance): Promise<TakeoffRecord[]> {
  const { data } = await client.get<TakeoffRecord[]>('/takeoff');
  return data;
}

export async function getTakeoff(client: AxiosInstance, uid: number): Promise<TakeoffRecord> {
  const { data } = await client.get<TakeoffRecord>(`/takeoff/${uid}`);
  return data;
}

export async function saveTakeoff(
  client: AxiosInstance,
  body: {
    clientUid?: number;
    reference?: string;
    notes?: string;
    sections: Array<{ systemCode: string; inputs: Record<string, number> }>;
  },
): Promise<TakeoffRecord> {
  const { data } = await client.post<TakeoffRecord>('/takeoff', body);
  return data;
}

export async function deleteTakeoff(client: AxiosInstance, uid: number): Promise<{ message: string }> {
  const { data } = await client.delete<{ message: string }>(`/takeoff/${uid}`);
  return data;
}

export async function issueTakeoff(
  client: AxiosInstance,
  uid: number,
  body: { priceListType: string; clientUid?: number },
): Promise<IssueTakeoffResult> {
  const { data } = await client.post<IssueTakeoffResult>(`/takeoff/${uid}/issue`, body);
  return data;
}
