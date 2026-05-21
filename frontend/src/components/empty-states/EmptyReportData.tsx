interface EmptyReportDataProps {
  onChangeDateRange?: () => void
}

export function EmptyReportData({ onChangeDateRange }: EmptyReportDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-48 h-48 mb-6"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <rect x="30" y="150" width="20" height="20" rx="3" fill="#E2E8F0" />
        <rect x="60" y="120" width="20" height="50" rx="3" fill="#E2E8F0" />
        <rect x="90" y="90" width="20" height="80" rx="3" fill="#E2E8F0" />
        <rect x="120" y="110" width="20" height="60" rx="3" fill="#E2E8F0" />
        <rect x="150" y="130" width="20" height="40" rx="3" fill="#E2E8F0" />
        <line x1="25" y1="170" x2="175" y2="170" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="100" cy="65" r="22" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M100 55v10M100 73v2" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      </svg>

      <h2 className="text-[22px] font-semibold text-[#1B2B3A]">No data for this period</h2>
      <p className="mt-2 max-w-xs text-sm text-[#64748B]">
        There are no transactions or events in the selected date range. Try adjusting the period.
      </p>

      {onChangeDateRange && (
        <button
          type="button"
          onClick={onChangeDateRange}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          Change Date Range
        </button>
      )}
    </div>
  )
}
