interface ErrorBoundaryFallbackProps {
  error?: Error | undefined
  resetErrorBoundary?: (() => void) | undefined
  context?: string | undefined
}

export function ErrorBoundaryFallback({ error, resetErrorBoundary, context }: ErrorBoundaryFallbackProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center"
    >
      <svg
        className="mb-4 h-12 w-12 text-red-400"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <h3 className="text-base font-semibold text-[#1B2B3A]">
        {context ? `${context} failed to load` : 'Something went wrong'}
      </h3>
      <p className="mt-1 max-w-xs text-sm text-[#64748B]">
        {error?.message
          ? error.message.length > 100
            ? `${error.message.slice(0, 100)}…`
            : error.message
          : 'An unexpected error occurred. Please try again.'}
      </p>

      {resetErrorBoundary && (
        <button
          type="button"
          onClick={resetErrorBoundary}
          className="mt-5 rounded-lg bg-[#F97316] px-5 py-2 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          Try Again
        </button>
      )}
    </div>
  )
}
