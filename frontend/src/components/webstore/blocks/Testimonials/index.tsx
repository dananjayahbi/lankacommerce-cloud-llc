/**
 * Testimonials Block
 *
 * Social proof section with grid or carousel layout.
 * Carousel uses CSS scroll-snap — no JS library needed.
 * Respects prefers-reduced-motion for auto-play.
 */

"use client";

import { useEffect, useRef } from "react";
import { Star } from "lucide-react";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

// ---------------------------------------------------------------------------
// Star rating
// ---------------------------------------------------------------------------

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className="h-4 w-4"
          fill={n <= rating ? "currentColor" : "none"}
          style={{ color: "var(--ws-color-accent)" }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TestimonialCard
// ---------------------------------------------------------------------------

interface TestimonialCardProps {
  quote: string;
  author: string;
  authorTitle?: string | undefined;
  rating?: number | undefined;
  avatarUrl?: string | undefined;
  showStars: boolean;
}

function TestimonialCard({
  quote,
  author,
  authorTitle,
  rating,
  avatarUrl,
  showStars,
}: TestimonialCardProps) {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-6 shadow-sm"
      style={{
        borderColor: "var(--ws-color-secondary)",
        backgroundColor: "var(--ws-color-background)",
      }}
    >
      {showStars && rating !== undefined && <StarRating rating={rating} />}
      <blockquote
        className="flex-1 text-sm leading-relaxed"
        style={{ color: "var(--ws-color-text)" }}
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <div className="flex items-center gap-3">
        {avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full object-cover"
            loading="lazy"
            aria-hidden="true"
          />
        )}
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ws-color-text)" }}>
            {author}
          </p>
          {authorTitle && (
            <p className="text-xs" style={{ color: "var(--ws-color-text)", opacity: 0.6 }}>
              {authorTitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials
// ---------------------------------------------------------------------------

export function Testimonials({
  settings,
  blocks,
  blockOrder,
}: BlockComponentProps) {
  const { heading, layout, rating_style, background_color } = settings;
  const isCarousel = layout === "carousel";
  const showStars = rating_style === "stars";

  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto-play is disabled by default; could be wired to a setting later.
  // Respects prefers-reduced-motion.
  useEffect(() => {
    if (!isCarousel) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;
    // No auto-play in Phase 6 baseline — user can add later.
  }, [isCarousel]);

  const testimonials = blockOrder
    .map((id) => ({ id, blk: blocks[id] }))
    .filter(({ blk }) => blk?.type === "testimonial");

  return (
    <section
      className="w-full py-12"
      style={{ backgroundColor: (background_color as string) ?? "#F8FAFC" }}
    >
      <div className="mx-auto max-w-[var(--ws-max-width,1280px)] px-4 sm:px-6 lg:px-8">
        {heading && (
          <h2
            className="mb-8 text-center text-2xl font-bold sm:text-3xl"
            style={{
              color: "var(--ws-color-text)",
              fontFamily: "var(--ws-font-heading)",
            }}
          >
            {heading as string}
          </h2>
        )}

        {testimonials.length === 0 && (
          <p className="text-center text-sm" style={{ color: "var(--ws-color-text)", opacity: 0.5 }}>
            No testimonials added yet.
          </p>
        )}

        {/* Grid layout */}
        {!isCarousel && testimonials.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map(({ id, blk }) => (
              <TestimonialCard
                key={id}
                quote={(blk!.settings.quote as string) ?? ""}
                author={(blk!.settings.author as string) ?? ""}
                authorTitle={blk!.settings.author_title as string | undefined}
                rating={blk!.settings.rating as number | undefined}
                avatarUrl={blk!.settings.avatar_image as string | undefined}
                showStars={showStars}
              />
            ))}
          </div>
        )}

        {/* Carousel layout */}
        {isCarousel && testimonials.length > 0 && (
          <div className="relative">
            <div
              ref={carouselRef}
              className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 scrollbar-hide"
              style={{ scrollBehavior: "smooth" }}
              aria-live="polite"
            >
              {testimonials.map(({ id, blk }) => (
                <div
                  key={id}
                  className="w-[min(340px,85vw)] flex-shrink-0 snap-center"
                >
                  <TestimonialCard
                    quote={(blk!.settings.quote as string) ?? ""}
                    author={(blk!.settings.author as string) ?? ""}
                    authorTitle={blk!.settings.author_title as string | undefined}
                    rating={blk!.settings.rating as number | undefined}
                    avatarUrl={blk!.settings.avatar_image as string | undefined}
                    showStars={showStars}
                  />
                </div>
              ))}
            </div>
            {/* Dot indicators */}
            <div className="mt-4 flex justify-center gap-2">
              {testimonials.map(({ id }, idx) => (
                <button
                  key={id}
                  type="button"
                  aria-label={`Go to testimonial ${idx + 1}`}
                  className="h-2 w-2 rounded-full transition-colors"
                  style={{ backgroundColor: "var(--ws-color-primary)", opacity: 0.4 }}
                  onClick={() => {
                    const el = carouselRef.current?.children[idx] as HTMLElement | undefined;
                    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
