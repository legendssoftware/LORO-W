import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { GeofencesContent } from './geofences-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.geofences.title,
  description: PAGE_COPY.geofences.description,
  path: '/geofences',
});

export default async function GeofencesPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/geofences');
  return <GeofencesContent />;
}
