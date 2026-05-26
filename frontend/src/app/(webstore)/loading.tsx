/**
 * Webstore Loading Skeleton
 *
 * Displayed during page transitions / suspense boundaries.
 * Keeps the layout chrome (header/footer) visible and shows a content
 * skeleton where the page body would be.
 */

export default function WebstoreLoading() {
  return (
    <div className="flex-1 animate-pulse">
      {/* Hero-sized block */}
      <div className="h-64 w-full bg-gray-100 sm:h-96" />

      {/* Content rows */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-6">
        <div className="h-6 w-48 rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="aspect-square w-full rounded-lg bg-gray-100" />
              <div className="h-4 w-3/4 rounded bg-gray-100" />
              <div className="h-3 w-1/2 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
