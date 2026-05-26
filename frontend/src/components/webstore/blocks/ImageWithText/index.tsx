/**
 * ImageWithText Block
 *
 * Two-column section combining an image and rich text content.
 * Image position (left/right) and width are configurable.
 * On mobile: single column, image always on top.
 */

import Link from "next/link";
import type { BlockComponentProps } from "@/lib/webstore/themeRenderer";

const IMAGE_WIDTH_MAP: Record<string, string> = {
  small: "lg:w-1/3",
  medium: "lg:w-1/2",
  large: "lg:w-3/5",
};

export function ImageWithText({ settings }: BlockComponentProps) {
  const {
    image,
    image_position,
    heading,
    body,
    cta_label,
    cta_link,
    background_color,
    desktop_image_width,
  } = settings;

  const isRight = image_position === "right";
  const imgWidthClass = IMAGE_WIDTH_MAP[(desktop_image_width as string) ?? "medium"] ?? "lg:w-1/2";

  return (
    <section
      className="w-full py-12"
      style={{ backgroundColor: (background_color as string) ?? "var(--ws-color-background)" }}
    >
      <div
        className={`mx-auto flex max-w-[var(--ws-max-width,1280px)] flex-col gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8 ${isRight ? "lg:flex-row-reverse" : ""}`}
      >
        {/* Image column */}
        <div className={`${imgWidthClass} w-full flex-shrink-0`}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image as string}
              alt={(heading as string) ?? ""}
              className="h-auto w-full rounded-lg object-cover shadow-md"
              loading="lazy"
            />
          ) : (
            <div
              className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed"
              style={{ borderColor: "var(--ws-color-secondary)", opacity: 0.3 }}
            >
              <span className="text-sm text-gray-400">No image</span>
            </div>
          )}
        </div>

        {/* Text column */}
        <div className="flex flex-1 flex-col gap-4">
          {heading && (
            <h2
              className="text-2xl font-bold sm:text-3xl"
              style={{
                color: "var(--ws-color-text)",
                fontFamily: "var(--ws-font-heading)",
              }}
            >
              {heading as string}
            </h2>
          )}
          {body && (
            <div
              className="prose prose-sm max-w-none"
              style={{ color: "var(--ws-color-text)" }}
              dangerouslySetInnerHTML={{ __html: body as string }}
            />
          )}
          {cta_label && cta_link && (
            <Link
              href={cta_link as string}
              className="mt-2 inline-block rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ws-color-primary)]"
              style={{ backgroundColor: "var(--ws-color-primary)" }}
            >
              {cta_label as string}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
