"use client";

import { useRef, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  credit_balance: string;
}

interface CustomersListResponse {
  results: CustomerResult[];
}

interface Props {
  onSelect: (customer: { id: string; name: string; credit_balance: string }) => void;
  onClear: () => void;
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function CustomerSearchDropdown({ onSelect }: Props) {
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const accessToken = useAuthStore((s) => s.accessToken);
  const debouncedSearch = useDebounce(searchValue, 300);

  const { data, isLoading } = useQuery<CustomersListResponse>({
    queryKey: ["customer-search", debouncedSearch],
    queryFn: async () => {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"}/api/crm/customers/?search=${encodeURIComponent(debouncedSearch)}&limit=5`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to search customers");
      const json = await res.json();
      return json.data as CustomersListResponse;
    },
    enabled: debouncedSearch.length >= 2,
  });

  const results = data?.results ?? [];

  // Close on outside click
  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
        <Input
          placeholder="Search customer by name or phone..."
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => searchValue.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-8 pr-8 h-9 text-sm"
        />
        {isLoading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] animate-spin" />
        )}
      </div>

      {isOpen && debouncedSearch.length >= 2 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border border-[#E2E8F0] rounded-md bg-white shadow-md overflow-hidden">
          {results.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-[#64748B]">No customers found.</div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-[#F1F5F9] transition-colors"
                onClick={() => {
                  onSelect({ id: c.id, name: c.name, credit_balance: c.credit_balance });
                  setSearchValue("");
                  setIsOpen(false);
                }}
              >
                <p className="text-sm font-medium text-[#1B2B3A]">{c.name}</p>
                {c.phone && (
                  <p className="text-xs text-[#64748B]">{c.phone}</p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
