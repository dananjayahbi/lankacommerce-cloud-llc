'use client'

import { AlertCircleIcon, CreditCardIcon, LifeBuoyIcon } from 'lucide-react'
import Link from 'next/link'

export default function SuspendedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white shadow-md">
        {/* Header */}
        <div className="flex flex-col items-center rounded-t-2xl bg-red-50 px-8 py-8">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-100">
            <AlertCircleIcon className="size-7 text-red-500" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-red-700">Account Suspended</h1>
          <p className="mt-2 text-center text-sm text-red-600">
            Your subscription has been suspended due to a missed payment. Please reactivate to
            restore full access to LankaCommerce.
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 px-8 py-6">
          <div className="rounded-xl border border-border bg-[#F8FAFC] px-5 py-4">
            <p className="text-sm text-navy">
              While your account is suspended you cannot:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-text-muted">
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-red-400 inline-block" />
                Process POS transactions
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-red-400 inline-block" />
                Manage products or inventory
              </li>
              <li className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-red-400 inline-block" />
                View reports
              </li>
            </ul>
            <p className="mt-3 text-xs text-text-muted">
              Your data is safe and will be fully accessible once your subscription is reactivated.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <Link
              href="/billing"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#F97316] py-3 text-sm font-semibold text-white hover:bg-orange-600 transition"
            >
              <CreditCardIcon className="size-4" />
              Go to Billing & Reactivate
            </Link>

            <a
              href="mailto:support@lankacommerce.cloud"
              className="flex items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-navy hover:bg-gray-50 transition"
            >
              <LifeBuoyIcon className="size-4 text-text-muted" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
