import Link from 'next/link';
import { getBlogPostsSorted } from '@/lib/blog';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';

export const metadata = buildPageMetadata({
  segmentTitle: PAGE_COPY.blog.title,
  description: PAGE_COPY.blog.description,
  path: '/blog',
  indexable: true,
});

export default function BlogIndexPage() {
  const posts = getBlogPostsSorted();

  return (
    <div className="w-full text-center">
      <h1 className="font-body text-3xl md:text-4xl font-normal tracking-tight text-white mb-4">
        Field sales <span className="font-serif italic">blog</span>
      </h1>
      <p className="font-body text-zinc-400 text-lg mb-10">
        Guides for South African field sales managers and reps.
      </p>
      <ul className="w-full space-y-6 text-left">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block rounded-xl border border-white/10 bg-zinc-900/30 p-5 hover:border-purple-500/40 transition-colors"
            >
              <time dateTime={post.publishedAt} className="text-xs text-zinc-500">
                {post.publishedAt}
              </time>
              <h2 className="font-body text-lg text-white font-medium mt-1 group-hover:text-purple-300">
                {post.title}
              </h2>
              <p className="font-body text-sm text-zinc-400 mt-2">{post.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
