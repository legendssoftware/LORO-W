import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAllBlogSlugs, getBlogPost } from '@/lib/blog';
import { MarkdownBody } from '@/components/marketing/markdown-body';
import { MarketingCta } from '@/components/marketing/marketing-shell';
import { buildPageMetadata, getSiteUrl, PAGE_COPY } from '@/lib/seo';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) {
    return buildPageMetadata({
      segmentTitle: PAGE_COPY.notFound.title,
      description: PAGE_COPY.notFound.description,
      path: false,
    });
  }
  return buildPageMetadata({
    segmentTitle: post.title,
    description: post.description,
    path: `/blog/${slug}`,
    indexable: true,
    keywords: post.tags.join(', '),
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: post.author },
    publisher: { '@type': 'Organization', name: 'LORO', url: getSiteUrl() },
    mainEntityOfPage: `${getSiteUrl()}/blog/${slug}`,
  };

  return (
    <div className="w-full">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <Link
        href="/blog"
        className="font-body text-sm text-purple-400 hover:text-purple-300 mb-6 inline-block"
      >
        ← Blog
      </Link>
      <article>
        <time dateTime={post.publishedAt} className="font-body text-xs text-zinc-500">
          {post.publishedAt}
        </time>
        <h1 className="font-body text-3xl font-normal tracking-tight text-white mt-2 mb-4">
          {post.title}
        </h1>
        <p className="font-body text-zinc-400 mb-8">{post.description}</p>
        <MarkdownBody content={post.content} />
      </article>
      <MarketingCta />
    </div>
  );
}
