import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { ClientDetailPage } from './client-detail-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ref: string }>;
}): Promise<Metadata> {
  const { ref } = await params;
  return buildPageMetadata({
    segmentTitle: PAGE_COPY.clientDetail.title,
    description: PAGE_COPY.clientDetail.description,
    path: `/clients/${ref}`,
  });
}

export default async function ClientDetailRoutePage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { ref: refStr } = await params;
  const refNum = Number(refStr);
  if (!Number.isFinite(refNum) || refNum <= 0) notFound();

  return <ClientDetailPage refParam={refNum} />;
}
