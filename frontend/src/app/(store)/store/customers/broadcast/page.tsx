"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/stores/authStore";

const MAX_CHARS = 1000;

type FilterMode = "all" | "tag" | "spend_min" | "birthday_month";

interface BroadcastFilters {
  tag?: string;
  spend_min?: string;
  birthday_month?: number;
}

async function previewCount(
  filters: BroadcastFilters,
  token: string,
): Promise<number> {
  const params = new URLSearchParams({ limit: "1" });
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.spend_min) params.set("spend_min", filters.spend_min);
  const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/crm/customers/?${params.toString()}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error("Failed to preview recipients");
  const json = await res.json();
  return (json.data?.total as number) ?? 0;
}

async function sendBroadcast(
  payload: { message: string; filters: BroadcastFilters },
  token: string,
): Promise<{ broadcast_id: string; recipient_count: number }> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/crm/customers/broadcast/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Broadcast failed");
  return json.data;
}

export default function BroadcastPage() {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  const [message, setMessage] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [tagValue, setTagValue] = useState("");
  const [spendMin, setSpendMin] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState<string>("");
  const [previewTotal, setPreviewTotal] = useState<number | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const remaining = MAX_CHARS - message.length;
  const isOverLimit = previewTotal !== null && previewTotal > 200;
  const canSend =
    message.trim().length > 0 &&
    previewTotal !== null &&
    previewTotal > 0 &&
    !isOverLimit;

  function buildFilters(): BroadcastFilters {
    if (filterMode === "tag" && tagValue.trim()) return { tag: tagValue.trim() };
    if (filterMode === "spend_min" && spendMin) return { spend_min: spendMin };
    if (filterMode === "birthday_month" && birthdayMonth)
      return { birthday_month: parseInt(birthdayMonth, 10) };
    return {};
  }

  async function handlePreview() {
    if (!accessToken) return;
    setIsPreviewing(true);
    setPreviewTotal(null);
    try {
      const count = await previewCount(buildFilters(), accessToken);
      setPreviewTotal(count);
    } catch {
      toast.error("Failed to preview recipients");
    } finally {
      setIsPreviewing(false);
    }
  }

  const mutation = useMutation({
    mutationFn: (payload: { message: string; filters: BroadcastFilters }) =>
      sendBroadcast(payload, accessToken ?? ""),
    onSuccess: (data) => {
      toast.success(`Broadcast sent to ${data.recipient_count} customers.`);
      router.push("/store/customers");
    },
    onError: (err: Error) => {
      toast.error(err.message ?? "Broadcast failed");
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-inter text-2xl font-bold text-[#1B2B3A]">
        Send WhatsApp Broadcast
      </h1>

      <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 space-y-6">
        {/* Message */}
        <div className="space-y-2">
          <Label htmlFor="message" className="font-inter font-medium text-[#1B2B3A]">
            Message
          </Label>
          <Textarea
            id="message"
            rows={5}
            maxLength={MAX_CHARS}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your broadcast message..."
            className="resize-none"
          />
          <p className={`text-xs text-right ${remaining < 50 ? "text-red-500 font-medium" : "text-[#64748B]"}`}>
            {remaining} characters remaining
          </p>
        </div>

        {/* Recipients filter */}
        <div className="space-y-3">
          <p className="font-inter font-medium text-[#1B2B3A]">Recipients</p>
          <p className="text-sm text-[#64748B]">
            Only active customers matching the selected filter will receive this message.
          </p>
          <div className="space-y-2">
            {[
              { value: "all", label: "All active customers" },
              { value: "tag", label: "Specific tag" },
              { value: "spend_min", label: "Spend band" },
              { value: "birthday_month", label: "Birthday month" },
            ].map((opt) => (
              <div key={opt.value}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="filterMode"
                    value={opt.value}
                    checked={filterMode === opt.value}
                    onChange={() => {
                      setFilterMode(opt.value as FilterMode);
                      setPreviewTotal(null);
                    }}
                    className="accent-[#F97316]"
                  />
                  <span className="text-sm text-[#1B2B3A]">{opt.label}</span>
                </label>
                {filterMode === "tag" && opt.value === "tag" && (
                  <div className="mt-2 ml-6">
                    <Input
                      placeholder="e.g. vip"
                      value={tagValue}
                      onChange={(e) => { setTagValue(e.target.value); setPreviewTotal(null); }}
                      className="h-8 text-sm max-w-xs"
                    />
                  </div>
                )}
                {filterMode === "spend_min" && opt.value === "spend_min" && (
                  <div className="mt-2 ml-6">
                    <Input
                      type="number"
                      placeholder="Min spend (e.g. 10000)"
                      value={spendMin}
                      onChange={(e) => { setSpendMin(e.target.value); setPreviewTotal(null); }}
                      className="h-8 text-sm max-w-xs"
                    />
                  </div>
                )}
                {filterMode === "birthday_month" && opt.value === "birthday_month" && (
                  <div className="mt-2 ml-6">
                    <select
                      value={birthdayMonth}
                      onChange={(e) => { setBirthdayMonth(e.target.value); setPreviewTotal(null); }}
                      className="h-8 text-sm border border-[#E2E8F0] rounded px-2 max-w-xs"
                    >
                      <option value="">Select month</option>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                        <option key={m} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handlePreview}
            disabled={isPreviewing}
          >
            {isPreviewing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Preview Recipients
          </Button>
          {previewTotal !== null && !isOverLimit && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm text-blue-700">
              This message will be sent to <strong>{previewTotal}</strong> customers.
            </div>
          )}
          {isOverLimit && (
            <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-sm text-amber-700">
              Recipient count exceeds 200. Refine your filters.
            </div>
          )}
          {previewTotal === 0 && (
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm text-blue-700">
              No customers match the selected filters.
            </div>
          )}
        </div>

        {/* Send */}
        <div className="flex justify-end gap-3 pt-2 border-t border-[#E2E8F0]">
          <Button variant="outline" type="button" onClick={() => router.push("/store/customers")}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canSend || mutation.isPending}
            onClick={() =>
              mutation.mutate({ message, filters: buildFilters() })
            }
            className="bg-[#F97316] hover:bg-[#ea6c0a] text-white"
          >
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Broadcast
          </Button>
        </div>
      </div>
    </div>
  );
}
