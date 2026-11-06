/** SessionStorage key for the forgot-password email passed between pages. */
export const LORO_RESET_EMAIL_KEY = 'loro_reset_email';

/** @deprecated The reset code is kept in memory. Left so old tabs can be cleared. */
export const LORO_RESET_CODE_KEY = 'loro_reset_code';

let passwordResetCode: string | null = null;

/**
 * Keep the email OTP in memory for the next reset step. It is not written to storage.
 */
export function setPasswordResetCode(code: string): void {
  passwordResetCode = code;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(LORO_RESET_CODE_KEY);
  }
}

/**
 * Read the in-memory reset code for the new-password step.
 */
export function getPasswordResetCode(): string | null {
  return passwordResetCode;
}

/**
 * Drop the in-memory reset code after it is used or the flow is abandoned.
 */
export function clearPasswordResetCode(): void {
  passwordResetCode = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(LORO_RESET_CODE_KEY);
  }
}
