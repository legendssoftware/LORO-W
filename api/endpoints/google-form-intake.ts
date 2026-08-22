export interface GoogleFormIntakeConfig {
  formUrl: string | null;
  sheetConfigured: boolean;
  cronEnabled: boolean;
  webhookConfigured: boolean;
}

export interface GoogleFormIntakeRowResult {
  rowNumber: number;
  email: string;
  status: string;
  username?: string;
  userUid?: number;
  error?: string;
}

export interface GoogleFormIntakeImportResponse {
  message: string;
  processed: number;
  imported: number;
  skipped: number;
  errors: number;
  rows: GoogleFormIntakeRowResult[];
}

export interface ImportGoogleFormIntakeBody {
  orgUid?: number;
  branchId?: number;
  accessLevel?: string;
  workforceType?: string;
  role?: string;
  dryRun?: boolean;
}

export interface SendGoogleFormResponse {
  message: string;
  emailSent: boolean;
  formUrl: string;
}

export async function getGoogleFormIntakeConfig(client: {
  get: <T>(url: string) => Promise<{ data: T }>;
}): Promise<GoogleFormIntakeConfig> {
  const { data } = await client.get<GoogleFormIntakeConfig>('/user/google-form-intake/config');
  return data;
}

export async function sendGoogleFormLink(
  client: { post: <T>(url: string, data?: unknown) => Promise<{ data: T }> },
  email: string,
): Promise<SendGoogleFormResponse> {
  const { data } = await client.post<SendGoogleFormResponse>('/user/google-form-intake/send', {
    email,
  });
  return data;
}

export async function importGoogleFormIntake(
  client: { post: <T>(url: string, data?: unknown) => Promise<{ data: T }> },
  body: ImportGoogleFormIntakeBody = {},
): Promise<GoogleFormIntakeImportResponse> {
  const { data } = await client.post<GoogleFormIntakeImportResponse>(
    '/user/google-form-intake/import',
    body,
  );
  return data;
}
