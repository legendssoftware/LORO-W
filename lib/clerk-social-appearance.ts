/** Clerk element overrides that leave Google as the only social sign-in. */
export const googleOnlySocialElements = {
  socialButtonsBlockButton__apple: { display: 'none' },
  socialButtonsIconButton__apple: { display: 'none' },
} as const;
