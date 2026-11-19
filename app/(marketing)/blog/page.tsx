import Link from 'next/link';
import { getBlogPostsSorted } from '@/lib/blog';
import { buildPageMetadata, PAGE_COPY } from '@/lib/seo';
import { BlogIndexHeading } from './blog-index-heading';

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
      <BlogIndexHeading />
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
