"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LogoutButtonProps {
  email: string;
}

export default function LogoutButton({ email }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
    } catch {
      // Proceed even if the request fails
    }
    router.push("/login");
  };

  return (
    <div className="px-4 py-4 border-t border-white/10">
      <p className="text-xs text-white/60 truncate mb-3">{email}</p>
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="flex items-center gap-2 text-sm text-white/80 hover:text-[#F97316] transition-colors disabled:opacity-50"
      >
        <LogOut size={16} />
        <span>{isLoading ? "Signing out…" : "Log out"}</span>
      </button>
    </div>
  );
}
