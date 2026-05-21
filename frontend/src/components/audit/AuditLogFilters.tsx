"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ENTITY_TYPE_OPTIONS } from "@/types/audit";

interface AuditLogFiltersProps {
  entityType: string;
  startDate: string;
  endDate: string;
  onEntityTypeChange: (v: string) => void;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  onClear: () => void;
}

export function AuditLogFilters({
  entityType,
  startDate,
  endDate,
  onEntityTypeChange,
  onStartDateChange,
  onEndDateChange,
  onClear,
}: AuditLogFiltersProps) {
  const hasFilters = entityType !== "all" || startDate !== "" || endDate !== "";

  return (
    <div className="flex flex-wrap items-end gap-3">
      {/* Entity type filter */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-muted">
          Entity Type
        </label>
        <Select value={entityType} onValueChange={onEntityTypeChange}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {ENTITY_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Start date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-muted">From</label>
        <Input
          type="date"
          className="w-40"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
        />
      </div>

      {/* End date */}
      <div className="flex flex-col gap-1">
        <label className="text-xs font-medium text-text-muted">To</label>
        <Input
          type="date"
          className="w-40"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
        />
      </div>

      {hasFilters && (
        <Button variant="ghost" size="sm" className="mb-0!" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  );
}
