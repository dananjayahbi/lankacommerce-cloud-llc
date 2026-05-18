"use client";

import { useState, useCallback, useRef } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import type { PlanRecord } from "../page";

interface TenantProvisioningWizardProps {
  plans: PlanRecord[];
  accessToken: string;
}

interface Step1Data {
  storeName: string;
  slug: string;
  currency: string;
  timezone: string;
  vatRate: string;
  ssclRate: string;
}

interface Step3Data {
  ownerEmail: string;
  ownerPassword: string;
  confirmPassword: string;
}

interface CreatedTenant {
  id: string;
  name: string;
  slug: string;
}

const CURRENCIES = ["LKR", "USD", "EUR", "GBP"];
const TIMEZONES = [
  "Asia/Colombo",
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "America/New_York",
];

const STEPS = [
  { number: 1, title: "Store Identity" },
  { number: 2, title: "Choose a Plan" },
  { number: 3, title: "Owner Account" },
];

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function passwordStrength(pw: string): { label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { label: "Weak", color: "text-red-500" };
  if (score === 2) return { label: "Fair", color: "text-amber-500" };
  return { label: "Strong", color: "text-green-600" };
}

export default function TenantProvisioningWizard({
  plans,
  accessToken,
}: TenantProvisioningWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [created, setCreated] = useState<CreatedTenant | null>(null);

  // Step 1 state
  const [step1, setStep1] = useState<Step1Data>({
    storeName: "",
    slug: "",
    currency: "LKR",
    timezone: "Asia/Colombo",
    vatRate: "18",
    ssclRate: "2.5",
  });
  const [step1Errors, setStep1Errors] = useState<Partial<Step1Data>>({});
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  // Step 2 state
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [step2Error, setStep2Error] = useState("");

  // Step 3 state
  const [step3, setStep3] = useState<Step3Data>({
    ownerEmail: "",
    ownerPassword: "",
    confirmPassword: "",
  });
  const [step3Errors, setStep3Errors] = useState<Partial<Step3Data>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slugDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Slug availability check
  const checkSlug = useCallback(
    async (slug: string) => {
      if (!slug) return;
      setSlugStatus("checking");
      try {
        const res = await fetch(
          `${API_BASE}/api/tenants/check-slug/?slug=${encodeURIComponent(slug)}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        if (res.ok) {
          const data = await res.json();
          setSlugStatus(data.available ? "available" : "taken");
        }
      } catch {
        setSlugStatus("idle");
      }
    },
    [accessToken]
  );

  const handleStoreNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const auto = slugify(value);
    setStep1((s) => ({ ...s, storeName: value, slug: auto }));
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (auto) {
      slugDebounceRef.current = setTimeout(() => checkSlug(auto), 500);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setStep1((s) => ({ ...s, slug: value }));
    if (slugDebounceRef.current) clearTimeout(slugDebounceRef.current);
    if (value) {
      slugDebounceRef.current = setTimeout(() => checkSlug(value), 500);
    }
  };

  // Step 1 validation
  const validateStep1 = (): boolean => {
    const errors: Partial<Step1Data> = {};
    if (!step1.storeName.trim()) errors.storeName = "Store name is required.";
    else if (step1.storeName.length > 255) errors.storeName = "Maximum 255 characters.";
    if (!step1.slug) errors.slug = "Slug is required.";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(step1.slug))
      errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
    else if (slugStatus === "taken") errors.slug = "This slug is already in use.";
    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 3 validation
  const validateStep3 = (): boolean => {
    const errors: Partial<Step3Data> = {};
    if (!step3.ownerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step3.ownerEmail))
      errors.ownerEmail = "A valid email is required.";
    if (step3.ownerPassword.length < 8)
      errors.ownerPassword = "Password must be at least 8 characters.";
    else if (!/[A-Z]/.test(step3.ownerPassword))
      errors.ownerPassword = "Password must contain at least one uppercase letter.";
    else if (!/\d/.test(step3.ownerPassword))
      errors.ownerPassword = "Password must contain at least one digit.";
    else if (!/[^A-Za-z0-9]/.test(step3.ownerPassword))
      errors.ownerPassword = "Password must contain at least one special character.";
    if (step3.ownerPassword !== step3.confirmPassword)
      errors.confirmPassword = "Passwords do not match.";
    setStep3Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2) {
      if (!selectedPlanId) { setStep2Error("Please select a subscription plan."); return; }
      setStep2Error("");
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch(`${API_BASE}/api/tenants/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          store_name: step1.storeName,
          slug: step1.slug,
          currency: step1.currency,
          timezone: step1.timezone,
          vat_rate: parseFloat(step1.vatRate),
          sscl_rate: parseFloat(step1.ssclRate),
          plan_id: selectedPlanId,
          owner_email: step3.ownerEmail,
          owner_password: step3.ownerPassword,
        }),
      });

      if (res.status === 201) {
        const data = await res.json();
        setCreated({ id: data.id, name: data.name, slug: data.slug });
      } else if (res.status === 400) {
        const data = await res.json();
        // Surface slug errors back to step 1
        if (data.slug) {
          setStep1Errors((e) => ({ ...e, slug: Array.isArray(data.slug) ? data.slug[0] : data.slug }));
          setCurrentStep(1);
        } else {
          setSubmitError(data.detail ?? JSON.stringify(data));
        }
      } else {
        setSubmitError(`Server error (HTTP ${res.status}). Please try again.`);
      }
    } catch {
      setSubmitError("Unable to reach the API. Please check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success view ────────────────────────────────────────────────────────
  if (created) {
    return (
      <div className="max-w-lg mx-auto rounded-lg border border-slate-200 bg-white p-10 text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle2 size={56} className="text-[#F97316]" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Tenant Created Successfully
        </h2>
        <div className="mb-6 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 text-left">
          <p><span className="font-medium">Name:</span> {created.name}</p>
          <p className="mt-1"><span className="font-medium">Slug:</span> <span className="font-mono">{created.slug}</span></p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/superadmin/tenants/${created.id}`}
            className="rounded-md bg-[#1B2B3A] px-4 py-2 text-sm font-medium text-white hover:bg-navy-700 transition-colors"
          >
            View Tenant
          </Link>
          <button
            onClick={() => {
              setCreated(null);
              setCurrentStep(1);
              setStep1({ storeName: "", slug: "", currency: "LKR", timezone: "Asia/Colombo", vatRate: "18", ssclRate: "2.5" });
              setSelectedPlanId("");
              setStep3({ ownerEmail: "", ownerPassword: "", confirmPassword: "" });
            }}
            className="rounded-md bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Create Another Tenant
          </button>
        </div>
      </div>
    );
  }

  const pwStrength = passwordStrength(step3.ownerPassword);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((step, idx) => {
          const isDone = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          return (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isDone
                      ? "bg-[#F97316] text-white"
                      : isCurrent
                      ? "border-2 border-[#F97316] bg-white text-[#F97316]"
                      : "border-2 border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  {isDone ? <Check size={14} /> : step.number}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isCurrent ? "text-[#F97316]" : "text-slate-400"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`h-px w-16 mx-1 mb-5 ${
                    currentStep > step.number ? "bg-[#F97316]" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        {/* ── Step 1 ── */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Store Identity</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Store Name
              </label>
              <input
                type="text"
                value={step1.storeName}
                onChange={handleStoreNameChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316]"
                placeholder="e.g. Dilani Boutique"
              />
              {step1Errors.storeName && (
                <p className="mt-1 text-xs text-red-500">{step1Errors.storeName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={step1.slug}
                onChange={handleSlugChange}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316]"
                placeholder="e.g. dilani-boutique"
              />
              {slugStatus === "checking" && (
                <p className="mt-1 text-xs text-slate-400">Checking availability…</p>
              )}
              {slugStatus === "available" && (
                <p className="mt-1 text-xs text-green-600">✓ Slug is available</p>
              )}
              {slugStatus === "taken" && (
                <p className="mt-1 text-xs text-red-500">✗ This slug is already in use</p>
              )}
              {step1Errors.slug && (
                <p className="mt-1 text-xs text-red-500">{step1Errors.slug}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Currency
                </label>
                <select
                  value={step1.currency}
                  onChange={(e) => setStep1((s) => ({ ...s, currency: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timezone
                </label>
                <select
                  value={step1.timezone}
                  onChange={(e) => setStep1((s) => ({ ...s, timezone: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  VAT Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={step1.vatRate}
                  onChange={(e) => setStep1((s) => ({ ...s, vatRate: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  SSCL Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={step1.ssclRate}
                  onChange={(e) => setStep1((s) => ({ ...s, ssclRate: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2 ── */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              Choose a Plan
            </h2>
            {plans.length === 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                No active plans found. Please run{" "}
                <code className="font-mono">python manage.py seed_plans</code> to
                seed subscription plans.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {plans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  return (
                    <div
                      key={plan.id}
                      className={`rounded-lg border-2 p-5 cursor-pointer transition-all ${
                        isSelected
                          ? "border-[#F97316] bg-orange-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                      onClick={() => setSelectedPlanId(plan.id)}
                    >
                      <h3 className="text-base font-bold text-slate-900">
                        {plan.name}
                      </h3>
                      <p className="text-xl font-semibold text-[#F97316] mt-1">
                        {new Intl.NumberFormat("en-LK", {
                          style: "currency",
                          currency: "LKR",
                          minimumFractionDigits: 0,
                        }).format(parseFloat(plan.price_monthly))}
                        <span className="text-sm font-normal text-slate-500"> / month</span>
                      </p>
                      {plan.description && (
                        <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                      )}
                      {plan.features.length > 0 && (
                        <ul className="mt-3 space-y-1">
                          {plan.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <Check size={12} className="text-[#F97316] mt-0.5 flex-shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-4">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#F97316]">
                            <Check size={12} /> Selected
                          </span>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedPlanId(plan.id); }}
                            className="text-xs font-medium text-slate-500 hover:text-[#F97316]"
                          >
                            Select
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {step2Error && (
              <p className="mt-3 text-sm text-red-500">{step2Error}</p>
            )}
          </div>
        )}

        {/* ── Step 3 ── */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Owner Account</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Owner Email
              </label>
              <input
                type="email"
                value={step3.ownerEmail}
                onChange={(e) => setStep3((s) => ({ ...s, ownerEmail: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                placeholder="owner@example.com"
              />
              {step3Errors.ownerEmail && (
                <p className="mt-1 text-xs text-red-500">{step3Errors.ownerEmail}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={step3.ownerPassword}
                  onChange={(e) => setStep3((s) => ({ ...s, ownerPassword: e.target.value }))}
                  className="w-full rounded-md border border-slate-200 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {step3.ownerPassword && (
                <p className={`mt-1 text-xs ${pwStrength.color}`}>
                  Strength: {pwStrength.label}
                </p>
              )}
              {step3Errors.ownerPassword && (
                <p className="mt-1 text-xs text-red-500">{step3Errors.ownerPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={step3.confirmPassword}
                onChange={(e) => setStep3((s) => ({ ...s, confirmPassword: e.target.value }))}
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
              />
              {step3Errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{step3Errors.confirmPassword}</p>
              )}
            </div>
            {submitError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => setCurrentStep((s) => s - 1)}
            disabled={currentStep === 1}
            className="rounded-md bg-[#1B2B3A] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-0 disabled:pointer-events-none"
          >
            ← Back
          </button>
          <button
            onClick={handleNext}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-md bg-[#F97316] px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {submitting ? (
              <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : null}
            {currentStep < 3 ? "Next Step →" : submitting ? "Creating…" : "Create Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}
