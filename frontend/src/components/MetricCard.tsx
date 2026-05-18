import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accentColour?: "orange" | "amber";
}

export default function MetricCard({
  label,
  value,
  icon: Icon,
  accentColour = "orange",
}: MetricCardProps) {
  const isAmber = accentColour === "amber";

  const iconBg = isAmber ? "bg-amber-50" : "bg-orange-50";
  const iconColour = isAmber ? "text-amber-500" : "text-[#F97316]";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`rounded-lg p-2 ${iconBg}`}>
          <Icon size={18} className={iconColour} />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}
