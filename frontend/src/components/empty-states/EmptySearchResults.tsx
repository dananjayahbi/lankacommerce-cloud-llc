interface EmptySearchResultsProps {
  searchQuery: string
  onClearSearch?: () => void
}

export function EmptySearchResults({ searchQuery, onClearSearch }: EmptySearchResultsProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-48 h-48 mb-6"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="88" cy="88" r="46" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <circle cx="88" cy="88" r="30" fill="white" stroke="#E2E8F0" strokeWidth="1.5" />
        <line x1="123" y1="123" x2="158" y2="158" stroke="#CBD5E1" strokeWidth="6" strokeLinecap="round" />
        <path d="M80 88h16M88 80v16" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
        <path d="M76 82l24 12M76 94l24-12" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      </svg>

      <h2 className="text-[22px] font-semibold text-[#1B2B3A]">No results found</h2>
      <p className="mt-2 max-w-xs text-sm text-[#64748B]">
        Nothing matched{' '}
        <code className="font-mono text-[#1B2B3A]">&ldquo;{searchQuery}&rdquo;</code>.{' '}
        Try a different search term.
      </p>

      {onClearSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          Clear Search
        </button>
      )}
    </div>
  )
}
