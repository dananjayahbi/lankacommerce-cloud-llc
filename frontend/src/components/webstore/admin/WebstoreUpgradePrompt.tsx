import Link from "next/link";
import { Globe, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  "Launch a fully branded online storefront",
  "Manage products, collections, and navigation menus",
  "Accept orders online with integrated checkout",
  "Customize your design with the visual theme builder",
  "Built-in SEO tools to grow your organic traffic",
  "Track webstore orders from a dedicated dashboard",
];

export function WebstoreUpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-50 mb-6">
          <Globe className="w-8 h-8 text-[#F97316]" />
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Sell Online with LankaCommerce Webstore
        </h1>
        <p className="text-slate-500 mb-8 leading-relaxed text-sm">
          Your current plan doesn&apos;t include Webstore access. Upgrade to
          reach customers beyond your physical store and start selling online
          today.
        </p>

        <ul className="text-left space-y-3 mb-10 mx-auto max-w-sm">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#F97316] mt-0.5 shrink-0" />
              <span className="text-sm text-slate-700">{feature}</span>
            </li>
          ))}
        </ul>

        <Link href="/store/billing">
          <Button
            size="lg"
            className="bg-[#F97316] hover:bg-orange-600 text-white gap-2 w-full sm:w-auto"
          >
            Upgrade Your Plan
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>

        <p className="text-xs text-slate-400 mt-4">
          Your existing store data stays safe. Upgrading only takes a minute.
        </p>
      </div>
    </div>
  );
}
