/**
 * Blog Listing Page — Server Component
 *
 * Route: `/blog` on any webstore subdomain
 *
 * Displays a paginated grid of published blog posts for the tenant's store.
 * ISR: revalidate = 3600 (on-demand revalidation via webstore-blog-<slug> tag).
 */

import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 3600;

const INTERNAL_API =
  process.env.NEXT_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

interface BlogPost {
  id: string;
  title: string;
  handle: string;
  author_name: string;
  excerpt: string;
  featured_image_url: string;
  published_at: string | null;
  tags: string[];
}

async function fetchBlogPosts(slug: string, page: number = 1): Promise<{ posts: BlogPost[]; meta: { total: number; total_pages: number } } | null> {
  try {
    const res = await fetch(
      `${INTERNAL_API}/api/webstore/public/${slug}/blog/?page=${page}&page_size=12`,
      {
        next: {
          tags: [`webstore-blog-${slug}`, `webstore-${slug}`],
          revalidate: 3600,
        },
      },
    );
    if (!res.ok) return null;
    return res.json() as Promise<{ posts: BlogPost[]; meta: { total: number; total_pages: number } }>;
  } catch {
    return null;
  }
}

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) return {};
  return {
    title: "Blog",
    description: "Articles, tips and updates from our store.",
  };
}

export default async function BlogListingPage({ searchParams }: Props) {
  const headerStore = await headers();
  const slug = headerStore.get("x-tenant-slug");
  if (!slug) notFound();

  const resolvedParams = await searchParams;
  const page = Math.max(1, parseInt(resolvedParams.page ?? "1", 10) || 1);

  const data = await fetchBlogPosts(slug, page);
  if (!data) notFound();

  const { posts, meta } = data;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight text-gray-900">
        Blog
      </h1>

      {posts.length === 0 ? (
        <p className="text-gray-500">No articles published yet.</p>
      ) : (
        <ul
          role="list"
          className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3"
        >
          {posts.map((post) => (
            <li key={post.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              {post.featured_image_url && (
                <Link
                  href={`/blog/${post.handle}`}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
                    <Image
                      src={post.featured_image_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                </Link>
              )}
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold leading-snug text-gray-900">
                    <Link
                      href={`/blog/${post.handle}`}
                      className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                      {post.excerpt}
                    </p>
                  )}
                </div>
                <footer className="flex items-center justify-between text-xs text-gray-500">
                  <span>{post.author_name}</span>
                  {post.published_at && (
                    <time dateTime={post.published_at}>
                      {new Date(post.published_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  )}
                </footer>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {meta.total_pages > 1 && (
        <nav
          aria-label="Blog pagination"
          className="mt-12 flex items-center justify-center gap-4"
        >
          {page > 1 && (
            <Link
              href={`/blog?page=${page - 1}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-gray-600">
            Page {page} of {meta.total_pages}
          </span>
          {page < meta.total_pages && (
            <Link
              href={`/blog?page=${page + 1}`}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-primary)"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </main>
  );
}
