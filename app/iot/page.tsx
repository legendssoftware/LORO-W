import { auth } from '@clerk/nextjs/server';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { IotContent } from './iot-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.iot.title,
  description: PAGE_COPY.iot.description,
  path: '/iot',
});

export default async function IotPage() {
  const { userId } = await auth();
  if (!userId) redirectToSignIn('/iot');

  return <IotContent />;
}
