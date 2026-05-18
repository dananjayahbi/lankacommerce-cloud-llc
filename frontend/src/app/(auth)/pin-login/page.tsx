"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PinEntryModal } from "@/components/auth/PinEntryModal";
import type { UserPayload } from "@/stores/authStore";

const emailSchema = z.object({
  email: z.string().min(1, "Email is required.").email("Enter a valid email."),
});

type EmailForm = z.infer<typeof emailSchema>;

function getRedirectPath(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/superadmin/dashboard";
    case "CASHIER":
      return "/store/pos";
    case "STOCK_CLERK":
      return "/store/stock";
    default:
      return "/store/dashboard";
  }
}

export default function PinLoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailForm>({ resolver: zodResolver(emailSchema) });

  const onEmailSubmit = (data: EmailForm) => {
    setSubmittedEmail(data.email);
    setShowModal(true);
  };

  const onPinSuccess = (user: UserPayload) => {
    router.push(getRedirectPath(user.role));
  };

  return (
    <>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-[#E2E8F0]">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
              style={{ backgroundColor: "#F97316" }}
            >
              <span className="text-white font-bold text-xl font-mono">LC</span>
            </div>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#0F172A", fontFamily: "Inter, sans-serif" }}
            >
              LankaCommerce
            </h1>
            <p className="text-sm mt-1" style={{ color: "#64748B" }}>
              Quick PIN access
            </p>
          </div>

          {/* Email form */}
          <form onSubmit={handleSubmit(onEmailSubmit)}>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#0F172A" }}
              >
                Your email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{
                  borderColor: errors.email ? "#EF4444" : "#E2E8F0",
                  color: "#0F172A",
                }}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-xs" style={{ color: "#EF4444" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full rounded-lg py-2.5 px-4 text-sm font-semibold text-white"
              style={{ backgroundColor: "#F97316" }}
            >
              Continue with PIN
            </button>
          </form>

          <p className="mt-4 text-center text-sm" style={{ color: "#64748B" }}>
            <a
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "#F97316" }}
            >
              Back to password login
            </a>
          </p>
        </div>
      </div>

      {showModal && (
        <PinEntryModal
          email={submittedEmail}
          onSuccess={onPinSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
