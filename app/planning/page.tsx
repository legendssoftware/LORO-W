import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { PlanningContent } from './planning-content';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.planning.title,
  description: PAGE_COPY.planning.description,
  path: '/planning',
});

type PlanningPageProps = {
  searchParams: Promise<{ task?: string | string[] }>;
};

export default async function PlanningPage({ searchParams }: PlanningPageProps) {
  const { userId } = await auth();
  if (!userId) {
    const params = await searchParams;
    const raw = params.task;
    const task = Array.isArray(raw) ? raw[0] : raw;
    const nextPath = task && /^\d+$/.test(task) ? `/planning?task=${task}` : '/planning';
    redirect(`/sign-in?redirect_url=${encodeURIComponent(nextPath)}`);
  }

  return <PlanningContent />;
}
