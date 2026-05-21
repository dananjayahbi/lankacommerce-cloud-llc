interface EmptyCustomerListProps {
  onAddCustomer?: () => void
}

export function EmptyCustomerList({ onAddCustomer }: EmptyCustomerListProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-48 h-48 mb-6"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="100" cy="75" r="30" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <circle cx="100" cy="68" r="14" fill="#E2E8F0" />
        <path d="M65 140c0-19.33 15.67-35 35-35s35 15.67 35 35" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" fill="#F1F5F9" />
        <circle cx="150" cy="145" r="22" fill="#F97316" />
        <path d="M150 135v20M140 145h20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <h2 className="text-[22px] font-semibold text-[#1B2B3A]">No customers yet</h2>
      <p className="mt-2 max-w-xs text-sm text-[#64748B]">
        Start building your customer base. Add customers to track their purchase history and preferences.
      </p>

      {onAddCustomer && (
        <button
          type="button"
          onClick={onAddCustomer}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          Add First Customer
        </button>
      )}
    </div>
  )
}
