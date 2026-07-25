import type { AxiosInstance } from 'axios';

export type ExplainZonePayload = {
  kind: 'catchment' | 'greenfield';
  title: string;
  rank?: number;
  radiusKm?: number;
  competitorCount?: number;
  clientCount?: number;
  addressablePoolZAR?: number;
  potentialLowZAR?: number;
  potentialHighZAR?: number;
  simulatedMonthlyZAR?: number;
  actualMonthlyZAR?: number | null;
  actualMonthLabel?: string | null;
  competitionLabel?: string;
  competitorNames?: string[];
  monthsToMature?: number | null;
};

export type ExplainZoneResponse = {
  explanation: string;
  source: 'ai' | 'fallback';
};

/** POST /map/explain-zone — Gemini (or fallback) summary for a simulation zone. */
export async function explainMapZone(
  client: AxiosInstance,
  payload: ExplainZonePayload,
): Promise<ExplainZoneResponse> {
  const { data } = await client.post<ExplainZoneResponse>(
    '/map/explain-zone',
    payload,
  );
  return data;
}
