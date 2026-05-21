"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";

const DISMISS_KEY = "lankacommerce-grace-banner-dismissed";

interface GracePeriodBannerProps {
  graceEndsAt?: string | undefined;
}

export default function GracePeriodBanner({ graceEndsAt }: GracePeriodBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(DISMISS_KEY) === "true") {
        setDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(DISMISS_KEY, "true");
    }
  };

  if (dismissed) return null;

  const formattedDate = graceEndsAt
    ? new Date(graceEndsAt).toLocaleDateString("en-LK", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="w-full bg-amber-500 text-white px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle size={18} className="flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">
        <span className="font-bold">Your account is in a grace period.</span>{" "}
        Please renew your subscription to avoid suspension.
        {formattedDate && (
          <span className="ml-1">
            Access will be suspended on {formattedDate}.
          </span>
        )}
      </p>
      <Link
        href="/settings/billing"
        className="flex-shrink-0 rounded border border-white/60 px-3 py-1 text-xs font-medium hover:bg-white/10 transition-colors"
      >
        Resolve Now
      </Link>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 rounded p-0.5 hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
    </div>
  );
}
