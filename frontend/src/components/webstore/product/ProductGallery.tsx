/**
 * ProductGallery
 *
 * Product image viewer for the storefront product detail page.
 *
 * Features:
 *   - Main large image (changes on thumbnail click or swipe)
 *   - Prev / Next arrow buttons when > 1 image
 *   - Dot indicators for galleries up to 6 images
 *   - Horizontally scrollable thumbnail strip (scroll-snap) for 2+ images
 *   - Pinch-to-zoom enabled on mobile via CSS `touch-action: pinch-zoom`
 *   - Swipe between images on mobile using CSS scroll-snap on the thumbnail row
 *
 * Accessibility:
 *   - Arrow buttons labelled with aria-label
 *   - Thumbnail buttons use aria-pressed to indicate active image
 *   - Active thumbnail is visually bordered with the theme primary colour
 */

"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GalleryImage {
  url: string;
  alt?: string;
}

interface ProductGalleryProps {
  images: GalleryImage[];
  /** Product title — used as alt-text fallback when image has no explicit alt. */
  title: string;
}

// ---------------------------------------------------------------------------
// ProductGallery
// ---------------------------------------------------------------------------

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  const prev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback(() => {
    setActiveIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100 flex items-center justify-center">
        <span className="text-sm text-gray-400">No image available</span>
      </div>
    );
  }

  const activeImage = images[activeIndex]!;
  const showArrows = images.length > 1;
  const showDots = images.length > 1 && images.length <= 6;
  const showThumbnails = images.length > 1;

  return (
    <div className="space-y-3">
      {/* ── Main image ───────────────────────────────────────────────────── */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100 select-none"
        style={{ touchAction: "pinch-zoom" }}
        aria-label={`Product image ${activeIndex + 1} of ${images.length}`}
        aria-live="polite"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={activeImage.url}
          src={activeImage.url}
          alt={activeImage.alt ?? title}
          className="h-full w-full object-cover transition-opacity duration-200"
          loading="eager"
          draggable={false}
        />

        {/* Prev arrow */}
        {showArrows && (
          <button
            type="button"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/80 p-1.5 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" aria-hidden="true" />
          </button>
        )}

        {/* Next arrow */}
        {showArrows && (
          <button
            type="button"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/80 p-1.5 shadow-md backdrop-blur-sm transition-all hover:bg-white hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5 text-gray-700" aria-hidden="true" />
          </button>
        )}

        {/* Dot indicators */}
        {showDots && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5"
            role="tablist"
            aria-label="Image navigation"
          >
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === activeIndex}
                aria-label={`Image ${i + 1}`}
                onClick={() => setActiveIndex(i)}
                className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-white ${
                  i === activeIndex ? "w-4 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Thumbnail strip ───────────────────────────────────────────────── */}
      {showThumbnails && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 scroll-smooth"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
          role="list"
          aria-label="Product image thumbnails"
        >
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              role="listitem"
              aria-label={`View image ${i + 1}: ${img.alt ?? title}`}
              aria-pressed={i === activeIndex}
              onClick={() => setActiveIndex(i)}
              className={`flex-shrink-0 h-16 w-16 overflow-hidden rounded-md border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)] focus-visible:ring-offset-1 ${
                i === activeIndex
                  ? "border-[var(--ws-color-primary)] opacity-100"
                  : "border-transparent opacity-60 hover:opacity-100 hover:border-gray-300"
              }`}
              style={
                i === activeIndex
                  ? { borderColor: "var(--ws-color-primary)", scrollSnapAlign: "start" }
                  : { scrollSnapAlign: "start" }
              }
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.alt ?? `${title} — image ${i + 1}`}
                className="h-full w-full object-cover"
                loading="lazy"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
