import type { Metadata } from 'next';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { redirectToSignIn } from '@/lib/auth-redirect';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { CompetitorDetailPage } from './competitor-detail-page';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  return buildPageMetadata({
    segmentTitle: PAGE_COPY.competitorDetail.title,
    description: PAGE_COPY.competitorDetail.description,
    path: `/competitors/${id}`,
  });
}

export default async function CompetitorDetailRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const { userId } = await auth();
  if (!userId) redirectToSignIn(`/competitors/${idStr}`);
  const idNum = Number(idStr);
  if (!Number.isFinite(idNum) || idNum <= 0) notFound();

  return <CompetitorDetailPage idParam={idNum} />;
}
