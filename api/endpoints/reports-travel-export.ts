/**
 * GET /reports/travel-export — multi-sheet visits/travel Excel workbook.
 */

import type { AxiosInstance } from 'axios';
import { downloadBlob } from '@/lib/utils/report-export';

export type TravelExportParams = {
  from: string;
  to: string;
  userUid?: number;
  branchId?: number;
};

export function parseContentDispositionFilename(
  header: string | undefined,
  fallback: string
): string {
  if (!header) return fallback;
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1];
  const plain = /filename=([^;]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim();
  return fallback;
}

/**
 * Download the visits and travel Excel workbook for the given calendar range.
 */
export async function downloadTravelExport(
  client: AxiosInstance,
  params: TravelExportParams
): Promise<void> {
  const fallback = `travel-report-${params.from}-to-${params.to}.xlsx`;
  const response = await client.get<Blob>('/reports/travel-export', {
    params: {
      from: params.from,
      to: params.to,
      ...(params.userUid != null ? { userUid: params.userUid } : {}),
      ...(params.branchId != null ? { branchId: params.branchId } : {}),
    },
    responseType: 'blob',
    timeout: 120_000,
  });
  const disposition =
    (response.headers['content-disposition'] as string | undefined) ??
    (response.headers['Content-Disposition'] as string | undefined);
  const filename = parseContentDispositionFilename(disposition, fallback);
  downloadBlob(response.data, filename);
}
