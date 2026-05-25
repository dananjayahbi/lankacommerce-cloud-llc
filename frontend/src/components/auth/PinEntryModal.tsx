"use client";

import { useState } from "react";
import { jwtDecode } from "jwt-decode";

import { loginWithPin } from "@/lib/api/auth";
import { useAuthStore, UserPayload } from "@/stores/authStore";

interface PinEntryModalProps {
  email: string;
  onSuccess: (user: UserPayload) => void;
  onClose: () => void;
  /** Called when the user wants to sign in with email & password instead of PIN */
  onUsePassword?: () => void;
}

const PIN_LENGTH = 4;

const NUMPAD_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["←", "0", "✓"],
];

export function PinEntryModal({ email, onSuccess, onClose, onUsePassword }: PinEntryModalProps) {
  const setUser = useAuthStore((state) => state.setUser);
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [noPinConfigured, setNoPinConfigured] = useState(false);

  const handleKeyPress = (key: string) => {
    setError(null);

    if (key === "←") {
      setPin((prev) => prev.slice(0, -1));
      return;
    }

    if (key === "✓") {
      void handleSubmit();
      return;
    }

    if (pin.length < PIN_LENGTH) {
      setPin((prev) => prev + key);
    }
  };

  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH) {
      setError(`PIN must be ${PIN_LENGTH} digits.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await loginWithPin(email, pin);

      await fetch("/api/auth/set-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access: response.access,
          refresh: response.refresh,
        }),
      });

      const payload = jwtDecode<UserPayload>(response.access);
      setUser({
        user_id: payload.user_id,
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions ?? [],
        tenant_id: payload.tenant_id,
        session_version: payload.session_version,
      });

      onSuccess(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid PIN. Please try again.";
      setError(msg);
      setPin("");
      // If PIN is not set up, auto-surface the password fallback
      if (msg.toLowerCase().includes("not configured")) {
        setNoPinConfigured(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(27, 43, 58, 0.85)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4 border"
        style={{ borderColor: "#E2E8F0" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-lg font-bold"
              style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
            >
              Enter PIN
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>
              {email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-sm font-medium hover:underline"
            style={{ color: "#64748B" }}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>

        {/* PIN dot indicators */}
        <div className="flex justify-center gap-3 mb-6">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 transition-colors"
              style={{
                backgroundColor: i < pin.length ? "#F97316" : "transparent",
                borderColor: i < pin.length ? "#F97316" : "#E2E8F0",
              }}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-center text-sm mb-4" style={{ color: "#EF4444" }}>
            {error}
          </p>
        )}

        {/* No PIN configured — show password fallback */}
        {noPinConfigured && onUsePassword && (
          <div
            className="rounded-lg px-4 py-3 mb-4 text-sm text-center"
            style={{ backgroundColor: "#FFF7ED", color: "#92400E" }}
          >
            No PIN has been set up for this account.{" "}
            <button
              onClick={onUsePassword}
              className="underline font-medium"
              style={{ color: "#F97316" }}
            >
              Sign in with password instead
            </button>
          </div>
        )}

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {NUMPAD_KEYS.flat().map((key) => {
            const isConfirm = key === "✓";

            return (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={isLoading}
                className="h-14 rounded-xl text-xl font-semibold transition-opacity disabled:opacity-50"
                style={{
                  backgroundColor: isConfirm ? "#F97316" : "#1B2B3A",
                  color: "#FFFFFF",
                }}
              >
                {isLoading && isConfirm ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                  </span>
                ) : (
                  key
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
