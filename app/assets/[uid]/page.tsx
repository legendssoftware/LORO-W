import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { AssetsContent } from '../assets-content';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ uid: string }>;
}): Promise<Metadata> {
  const { uid } = await params;
  return buildPageMetadata({
    segmentTitle: PAGE_COPY.assetDetail.title,
    description: PAGE_COPY.assetDetail.description,
    path: `/assets/${uid}`,
  });
}

export default async function AssetDetailRoutePage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const { userId } = await auth();
  if (!userId) redirectToSignIn(`/assets/${uid}`);
  const assetUid = Number(uid);
  if (!Number.isFinite(assetUid) || assetUid <= 0) notFound();

  return <AssetsContent initialAssetUid={assetUid} />;
}
