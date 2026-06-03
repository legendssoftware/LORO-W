export type BlogPostMeta = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: string;
  tags: string[];
};

export type BlogPost = BlogPostMeta & {
  content: string;
};
