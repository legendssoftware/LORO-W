import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.notFound.title,
  description: PAGE_COPY.notFound.description,
  path: false,
});

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-background px-4">
      <h1 className="text-3xl font-bold text-foreground">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild variant="outline">
          <Link href="/">Go to home</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
