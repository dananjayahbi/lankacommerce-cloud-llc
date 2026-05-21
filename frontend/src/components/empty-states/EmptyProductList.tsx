interface EmptyProductListProps {
  onAddProduct?: () => void
}

export function EmptyProductList({ onAddProduct }: EmptyProductListProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="w-48 h-48 mb-6"
        viewBox="0 0 200 200"
        fill="none"
        aria-hidden="true"
      >
        <rect x="40" y="60" width="120" height="100" rx="8" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="2" />
        <rect x="60" y="80" width="50" height="50" rx="4" fill="#E2E8F0" />
        <rect x="120" y="88" width="30" height="4" rx="2" fill="#CBD5E1" />
        <rect x="120" y="100" width="24" height="4" rx="2" fill="#CBD5E1" />
        <rect x="120" y="112" width="28" height="4" rx="2" fill="#CBD5E1" />
        <circle cx="145" cy="145" r="22" fill="#F97316" />
        <path d="M145 135v20M135 145h20" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <h2 className="text-[22px] font-semibold text-[#1B2B3A]">Your catalogue is empty</h2>
      <p className="mt-2 max-w-xs text-sm text-[#64748B]">
        Add your first product to start selling. You can upload images, set prices, and manage stock.
      </p>

      {onAddProduct && (
        <button
          type="button"
          onClick={onAddProduct}
          className="mt-6 rounded-lg bg-[#F97316] px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:ring-offset-2"
        >
          Add First Product
        </button>
      )}
    </div>
  )
}
