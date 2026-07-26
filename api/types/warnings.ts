/**
 * Formal HR warning types. Aligned with server Warning entity / DTOs.
 * @see server/src/warnings/entities/warning.entity.ts
 */

export type WarningSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export type WarningStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED';

export interface WarningUserRef {
  uid?: number;
  clerkUserId?: string;
  name?: string;
  surname?: string;
  email?: string;
}

export interface WarningRecord {
  uid: number;
  reason: string;
  severity: WarningSeverity;
  status: WarningStatus;
  issuedAt: string;
  expiresAt: string;
  isExpired?: boolean;
  owner?: WarningUserRef;
  issuedBy?: WarningUserRef;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserWarningsResponse {
  warnings: WarningRecord[];
  message: string;
}

export interface WarningMutationResponse {
  message: string;
  warning?: WarningRecord;
}

export interface CreateWarningPayload {
  recipientClerkId: string;
  reason: string;
  severity: WarningSeverity;
  expiresAt: string;
  issuedAt?: string;
  status?: WarningStatus;
}

export interface UpdateWarningPayload {
  reason?: string;
  severity?: WarningSeverity;
  expiresAt?: string;
  isExpired?: boolean;
  status?: WarningStatus;
  recipientClerkId?: string;
}
