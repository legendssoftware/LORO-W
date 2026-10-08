/**
 * Play Store listing for the LORO Android app.
 * Set `NEXT_PUBLIC_ANDROID_APP_URL` so the public site can change the listing without a code change.
 */
export const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL?.trim() ||
  'https://play.google.com/apps/testing/za.co.loro.app';
