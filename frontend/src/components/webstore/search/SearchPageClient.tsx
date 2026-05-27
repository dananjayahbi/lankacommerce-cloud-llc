/**
 * Search Page — Client Component
 *
 * Route: `/search`
 *
 * Interactive search with:
 *   - URL-synced query (?q=...)
 *   - 400ms debounced input → router.replace
 *   - Results grid using ProductCard
 *   - Sort dropdown
 *   - Empty state
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { ProductCard } from "@/components/webstore/product/ProductCard";
import type { ProductSummary } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchResults {
  count: number;
  results: ProductSummary[];
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "title_asc", label: "Name: A–Z" },
  { value: "newest", label: "Newest" },
] as const;

// ---------------------------------------------------------------------------
// Hook: debounce
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Search page
// ---------------------------------------------------------------------------

interface SearchPageClientProps {
  tenantSlug: string;
  currency: string;
  initialQuery: string;
  initialSort: string;
}

function SearchPageInner({
  tenantSlug,
  currency,
  initialQuery,
  initialSort,
}: SearchPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(initialSort);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const debouncedQuery = useDebounce(query, 400);
  const abortRef = useRef<AbortController | null>(null);

  // Sync query + sort to URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedQuery) {
      params.set("q", debouncedQuery);
    } else {
      params.delete("q");
    }
    if (sort) {
      params.set("sort", sort);
    } else {
      params.delete("sort");
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [debouncedQuery, sort, router, searchParams]);

  // Fetch results when debounced query or sort changes
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
    const url = new URL(
      `${apiBase}/api/webstore/public/${tenantSlug}/search/`,
    );
    url.searchParams.set("q", debouncedQuery.trim());
    if (sort) url.searchParams.set("sort", sort);

    fetch(url.toString(), { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: SearchResults | null) => {
        if (data) setResults(data);
        setLoading(false);
      })
      .catch(() => {
        // AbortError is expected on rapid typing — ignore
        setLoading(false);
      });

    return () => controller.abort();
  }, [debouncedQuery, sort, tenantSlug]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value),
    [],
  );

  const handleSortChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value),
    [],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Search input */}
      <div className="relative mb-8">
        <Search
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          placeholder="Search products…"
          autoFocus
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-base focus:border-transparent focus:outline-none focus:ring-2"
          style={
            {
              "--tw-ring-color": "var(--ws-color-primary)",
              color: "var(--ws-color-text)",
            } as React.CSSProperties
          }
          aria-label="Search products"
        />
      </div>

      {/* Results header */}
      {results !== null && (
        <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm" style={{ color: "var(--ws-color-text)", opacity: 0.7 }}>
            {results.count} result{results.count !== 1 ? "s" : ""}{" "}
            {query ? `for "${query}"` : ""}
          </p>

          <select
            value={sort}
            onChange={handleSortChange}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none"
            style={{ color: "var(--ws-color-text)" }}
            aria-label="Sort results"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="flex justify-center py-20">
          <Loader2
            className="h-8 w-8 animate-spin"
            style={{ color: "var(--ws-color-primary)" }}
            aria-label="Loading…"
          />
        </div>
      )}

      {/* Results grid */}
      {!loading && results !== null && results.results.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {results.results.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              currency={currency}
              cardStyle="standard"
              isPreview={false}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && results !== null && results.results.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center gap-3">
          <Search className="h-12 w-12 text-gray-300" aria-hidden="true" />
          <p
            className="text-lg font-medium"
            style={{ color: "var(--ws-color-text)" }}
          >
            No results for &ldquo;{query}&rdquo;
          </p>
          <p className="text-sm text-gray-400">
            Try different keywords or browse our collections.
          </p>
        </div>
      )}

      {/* Idle state */}
      {!loading && results === null && !query && (
        <div className="flex flex-col items-center py-24 text-center gap-2">
          <Search className="h-12 w-12 text-gray-300" aria-hidden="true" />
          <p className="text-gray-400">Start typing to search products</p>
        </div>
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page wrapper — reads initial state from URL search params
// ---------------------------------------------------------------------------

export function SearchPageClient({
  tenantSlug,
  currency,
  initialQuery,
  initialSort,
}: SearchPageClientProps) {
  return (
    <SearchPageInner
      tenantSlug={tenantSlug}
      currency={currency}
      initialQuery={initialQuery}
      initialSort={initialSort}
    />
  );
}
