import type { Metadata } from 'next';

/** Search Console / Bing verification from env (content values only). */
export function buildSiteVerificationMetadata(): Pick<Metadata, 'verification'> {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();

  if (!google && !bing) return {};

  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing
        ? {
            other: {
              'msvalidate.01': bing,
            },
          }
        : {}),
    },
  };
}
