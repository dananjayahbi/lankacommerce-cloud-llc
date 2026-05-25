"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { PinEntryModal } from "@/components/auth/PinEntryModal";
import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";
import type { UserPayload } from "@/stores/authStore";

export function ScreenLockOverlay() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearUser = useAuthStore((state) => state.clearUser);
  const unlockScreen = useUIStore((state) => state.unlockScreen);
  const isScreenLocked = useUIStore((state) => state.isScreenLocked);

  const [showPinModal, setShowPinModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isScreenLocked) return null;

  const handlePinSuccess = (_payload: UserPayload) => {
    unlockScreen();
    setShowPinModal(false);
  };

  const handleLogout = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } finally {
      clearUser();
      unlockScreen();
      router.push("/login");
    }
  };

  return (
    <>
      {/* Full-screen lock overlay */}
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center"
        style={{ backgroundColor: "rgba(27, 43, 58, 0.92)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Screen locked"
      >
        {/* Lock icon */}
        <div className="mb-6">
          <svg
            className="w-16 h-16"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#F97316"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1
          className="text-3xl font-bold mb-2"
          style={{ color: "#FFFFFF", fontFamily: "Inter, sans-serif" }}
        >
          Screen Locked
        </h1>

        {/* User info */}
        {user && (
          <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
            {user.email}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => setShowPinModal(true)}
            className="px-8 py-3 rounded-xl text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: "#F97316" }}
            onMouseEnter={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = "#EA6C05")
            }
            onMouseLeave={(e) =>
              ((e.target as HTMLButtonElement).style.backgroundColor = "#F97316")
            }
          >
            Unlock with PIN
          </button>

          <button
            onClick={handleLogout}
            disabled={isSigningOut}
            className="text-sm hover:underline disabled:opacity-50"
            style={{ color: "#94A3B8" }}
          >
            {isSigningOut ? "Signing out\u2026" : "Sign in with email & password"}
          </button>
        </div>

        {/* LankaCommerce branding */}
        <div className="absolute bottom-8 flex items-center gap-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white text-xs font-bold">LC</span>
          </div>
          <span className="text-xs" style={{ color: "#475569" }}>
            LankaCommerce
          </span>
        </div>
      </div>

      {/* PIN Entry Modal (rendered above the overlay) */}
      {showPinModal && user && (
        <PinEntryModal
          email={user.email}
          onSuccess={handlePinSuccess}
          onClose={() => setShowPinModal(false)}
          onUsePassword={handleLogout}
        />
      )}
    </>
  );
}
