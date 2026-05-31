"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { z } from "zod/v4";
import Link from "next/link";

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
  } = useForm<EmailForm>({ resolver: standardSchemaResolver(emailSchema) });

  const onEmailSubmit = (data: EmailForm) => {
    setSubmittedEmail(data.email);
    setShowModal(true);
  };

  const onPinSuccess = (user: UserPayload) => {
    router.push(getRedirectPath(user.role));
  };

  return (
    <>
      <div className="w-full flex flex-col justify-center">
        {/* Brand/Header */}
        <div className="flex flex-col mb-8">
          {/* Mobile-only branding icon */}
          <div
            className="lg:hidden w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-500/10"
            style={{ backgroundColor: "#F97316" }}
          >
            <span className="text-white font-bold text-xl font-mono">LC</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 font-sans leading-none mb-3">
            Quick PIN Access
          </h1>
          <p className="text-base text-slate-500 font-normal">
            Enter your email to verify with your store cashier or clerk PIN code.
          </p>
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit(onEmailSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2"
            >
              Your email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5"
              style={{
                borderColor: errors.email ? "#EF4444" : undefined,
                color: "#0F172A",
              }}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1.5 text-xs font-medium text-red-500 flex items-center gap-1">
                <span>•</span> {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-950 py-3.5 px-4 text-sm font-semibold text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-950/10 focus:outline-none focus:ring-4 focus:ring-slate-950/20"
          >
            Continue with PIN
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 font-light">
          <Link
            href="/login"
            className="font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-colors"
          >
            Back to password login
          </Link>
        </p>
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
