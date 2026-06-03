/** Routes that use full document flow (window scroll) instead of the fixed viewport dashboard shell. */
export const FULL_DOCUMENT_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/onboarding',
  '/forgot-password',
  '/privacy-policy',
  '/about',
  '/pricing',
  '/customers',
  '/integrations',
  '/solutions',
  '/compare',
  '/blog',
] as const;

export function isFullDocumentRoute(pathname: string): boolean {
  return FULL_DOCUMENT_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
