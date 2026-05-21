export function EmptyOrderHistory() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-48 h-48 mb-6"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <rect x="50" y="40" width="100" height="130" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <rect x="66" y="60" width="68" height="4" rx="2" fill="#E2E8F0" />
        <rect x="66" y="74" width="50" height="4" rx="2" fill="#E2E8F0" />
        <rect x="66" y="88" width="60" height="4" rx="2" fill="#E2E8F0" />
        <rect x="66" y="110" width="40" height="4" rx="2" fill="#E2E8F0" />
        <rect x="66" y="124" width="68" height="4" rx="2" fill="#E2E8F0" />
        <circle cx="100" cy="155" r="18" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <path d="M94 155l4 4 8-8" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <h2 className="text-[22px] font-semibold text-[#1B2B3A]">No sales recorded yet</h2>
      <p className="mt-2 max-w-xs text-sm text-[#64748B]">
        Sales completed at the POS will appear here. Start processing transactions to see order history.
      </p>
    </div>
  )
}
