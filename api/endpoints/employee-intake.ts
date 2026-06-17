const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

export interface EmployeeIntakeMetadata {
  organisationName: string;
  branchName: string;
  prefillEmail: string | null;
  expiresAt: string;
  status: string;
}

export interface CompleteIntakeResponse {
  message: string;
  user: { uid: number; email: string };
  signInUrl: string;
}

export interface IntakeDocumentUploadResult {
  publicUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export interface CreateIntakeInvitationBody {
  branchId?: number;
  accessLevel: string;
  workforceType?: string;
  role?: string;
  prefillEmail?: string;
  expiresInDays?: number;
}

export interface IntakeInvitationRecord {
  uid: number;
  token: string;
  tokenExpiresAt: string;
  status: string;
  organisationRef?: string | null;
  organisationUid?: number | null;
  branchUid?: number | null;
  accessLevel?: string | null;
  workforceType?: string | null;
  role?: string | null;
  prefillEmail?: string | null;
  completedUserUid?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIntakeInvitationResponse {
  message: string;
  invitation: {
    uid: number;
    intakeUrl: string;
    tokenExpiresAt: string;
    emailSent: boolean;
  };
}

export interface ListIntakeInvitationsResponse {
  message: string;
  data: IntakeInvitationRecord[];
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body?.message === 'string'
        ? body.message
        : Array.isArray(body?.message)
          ? body.message.join(', ')
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

export async function getIntakeByToken(token: string): Promise<EmployeeIntakeMetadata> {
  const res = await fetch(`${API_URL}/user/intake/${encodeURIComponent(token)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });
  return parseJson<EmployeeIntakeMetadata>(res);
}

export async function uploadIntakeDocument(
  token: string,
  file: File,
): Promise<IntakeDocumentUploadResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(
    `${API_URL}/user/intake/${encodeURIComponent(token)}/upload`,
    {
      method: 'POST',
      body: formData,
    },
  );
  return parseJson<IntakeDocumentUploadResult>(res);
}

export async function completeIntake(
  token: string,
  body: Record<string, unknown>,
): Promise<CompleteIntakeResponse> {
  const res = await fetch(
    `${API_URL}/user/intake/${encodeURIComponent(token)}/complete`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  return parseJson<CompleteIntakeResponse>(res);
}

export async function createIntakeInvitation(
  client: { post: <T>(url: string, data?: unknown) => Promise<{ data: T }> },
  body: CreateIntakeInvitationBody,
): Promise<CreateIntakeInvitationResponse> {
  const { data } = await client.post<CreateIntakeInvitationResponse>(
    '/user/intake-invitations',
    body,
  );
  return data;
}

export async function listIntakeInvitations(
  client: { get: <T>(url: string) => Promise<{ data: T }> },
): Promise<ListIntakeInvitationsResponse> {
  const { data } = await client.get<ListIntakeInvitationsResponse>(
    '/user/intake-invitations',
  );
  return data;
}

export async function resendIntakeInvitation(
  client: { post: <T>(url: string, data?: unknown) => Promise<{ data: T }> },
  uid: number,
): Promise<CreateIntakeInvitationResponse> {
  const { data } = await client.post<CreateIntakeInvitationResponse>(
    `/user/intake-invitations/${uid}/resend`,
  );
  return data;
}

export interface DeleteIntakeInvitationResponse {
  message: string;
}

export async function deleteIntakeInvitation(
  client: { delete: <T>(url: string) => Promise<{ data: T }> },
  uid: number,
): Promise<DeleteIntakeInvitationResponse> {
  const { data } = await client.delete<DeleteIntakeInvitationResponse>(
    `/user/intake-invitations/${uid}`,
  );
  return data;
}
