/**
 * Blog Article Detail Page — Server Component
 *
 * Route: `/blog/[handle]`
 *
 * Renders a full blog article with cover image, prose-styled body,
 * author/date, tags, and Article JSON-LD structured data.
 *
 * ISR: revalidate = 3600 with on-demand revalidation via webstore-blog-<slug> tag.
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { JsonLd } from "@/components/webstore/seo/JsonLd";

export const revalidate = 3600;

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

interface BlogPostDetail {
  id: string;
  title: string;
  handle: string;
  author_name: string;
  body_html: string;
  excerpt: string;
  featured_image_url: string;
  published_at: string | null;
  tags: string[];
  seo_title: string;
  seo_description: string;
}

async function fetchBlogPost(slug: string, handle: string): Promise<BlogPostDetail | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/blog/${handle}/`,
      {
        next: {
          tags: [`webstore-blog-${slug}`, `webstore-${slug}`],
          revalidate: 3600,
        },
      },
    );
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return res.json() as Promise<BlogPostDetail>;
  } catch {
    return null;
  }
}

interface Props {
  params: Promise<{ handle: string }>;
}

export async function generateMetadata(
  { params }: Props,
  _parent: ResolvingMetadata,
): Promise<Metadata> {
  const { handle } = await params;
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) return {};

  const post = await fetchBlogPost(slug, handle);
  if (!post) return {};

  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      publishedTime: post.published_at ?? undefined,
      authors: post.author_name ? [post.author_name] : undefined,
      images: post.featured_image_url ? [post.featured_image_url] : undefined,
    },
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { handle } = await params;

  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) notFound();

  const post = await fetchBlogPost(slug, handle);
  if (!post) notFound();

  // Article JSON-LD structured data
  const host = `${slug}.lankacommerce.com`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt || undefined,
    image: post.featured_image_url || undefined,
    author: {
      "@type": "Person",
      name: post.author_name,
    },
    datePublished: post.published_at ?? undefined,
    publisher: {
      "@type": "Organization",
      name: slug,
      url: `https://${host}`,
    },
    url: `https://${host}/blog/${post.handle}`,
  };

  return (
    <>
      <JsonLd schema={articleSchema} />
      <main className="mx-auto max-w-3xl px-4 py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-500">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/"
                className="hover:underline focus-visible:outline-2 focus-visible:outline-(--color-primary)"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/blog"
                className="hover:underline focus-visible:outline-2 focus-visible:outline-(--color-primary)"
              >
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-gray-900 font-medium">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Hero image */}
        {post.featured_image_url && (
          <div className="relative mb-8 aspect-video w-full overflow-hidden rounded-xl bg-gray-100">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        {/* Article header */}
        <header className="mb-8">
          <h1 className="mb-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span>By {post.author_name}</span>
            {post.published_at && (
              <time dateTime={post.published_at}>
                {new Date(post.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
            )}
          </div>
          {post.tags.length > 0 && (
            <ul
              aria-label="Article tags"
              className="mt-3 flex flex-wrap gap-2"
            >
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </header>

        {/* Article body — rendered as sanitized HTML from the backend */}
        <article
          className="prose prose-gray max-w-none"
          // body_html is sanitized by the backend before storage
          dangerouslySetInnerHTML={{ __html: post.body_html }}
        />

        {/* Back link */}
        <div className="mt-12 border-t border-gray-200 pt-8">
          <Link
            href="/blog"
            className="text-sm font-medium text-(--color-primary) hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
          >
            ← Back to Blog
          </Link>
        </div>
      </main>
    </>
  );
}
