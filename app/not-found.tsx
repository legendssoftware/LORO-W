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
    <div className="fixed inset-0 z-[100] flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-black px-4">
      <h1 className="text-3xl font-bold text-white">Page not found</h1>
      <p className="mt-2 text-white/80">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-500"
        >
          <Link href="/">Go to home</Link>
        </Button>
        <Button
          asChild
          className="bg-purple-600 text-white hover:bg-purple-700 focus-visible:ring-purple-500"
        >
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
