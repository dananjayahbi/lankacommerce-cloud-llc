"use client";

import { Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  tags: string[];
  gender: "ALL" | "FEMALE" | "MALE" | "NON_BINARY";
  min_spend: number | "";
  max_spend: number | "";
  birthday_month: number | "";
}

interface Props {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  count: number;
  isCountLoading: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const GENDER_OPTIONS: { value: FilterState["gender"]; label: string }[] = [
  { value: "ALL", label: "All Genders" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "NON_BINARY", label: "Non-Binary" },
];

export default function BroadcastFilterPanel({
  filters,
  onChange,
  count,
  isCountLoading,
}: Props) {
  function removeTag(tag: string) {
    onChange({ ...filters, tags: filters.tags.filter((t) => t !== tag) });
  }

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-navy text-base font-semibold">
          Filter Audience
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tags */}
        <div>
          <Label className="text-sm font-medium text-navy mb-1 block">
            Tags
          </Label>
          {filters.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {filters.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="flex items-center gap-1 text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:opacity-70"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <Input
            placeholder="Type a tag and press Enter"
            className="text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const val = e.currentTarget.value.trim();
                if (val && !filters.tags.includes(val)) {
                  onChange({ ...filters, tags: [...filters.tags, val] });
                }
                e.currentTarget.value = "";
                e.preventDefault();
              }
            }}
          />
        </div>

        {/* Gender */}
        <div>
          <Label className="text-sm font-medium text-navy mb-2 block">
            Gender
          </Label>
          <RadioGroup
            value={filters.gender}
            onValueChange={(val) =>
              onChange({ ...filters, gender: val as FilterState["gender"] })
            }
            className="space-y-1"
          >
            {GENDER_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`gender-${opt.value}`} />
                <Label
                  htmlFor={`gender-${opt.value}`}
                  className="text-sm font-normal cursor-pointer"
                >
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Spend Band */}
        <div>
          <Label className="text-sm font-medium text-navy mb-2 block">
            Spend Band
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label
                htmlFor="min-spend"
                className="text-xs text-text-muted mb-1 block"
              >
                Min Spend (Rs.)
              </Label>
              <Input
                id="min-spend"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={filters.min_spend === "" ? "" : filters.min_spend}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    min_spend:
                      e.target.value === ""
                        ? ""
                        : (parseFloat(e.target.value) as number),
                  })
                }
                className="text-sm"
              />
            </div>
            <div>
              <Label
                htmlFor="max-spend"
                className="text-xs text-text-muted mb-1 block"
              >
                Max Spend (Rs.)
              </Label>
              <Input
                id="max-spend"
                type="number"
                min={0}
                step={0.01}
                placeholder="No limit"
                value={filters.max_spend === "" ? "" : filters.max_spend}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    max_spend:
                      e.target.value === ""
                        ? ""
                        : (parseFloat(e.target.value) as number),
                  })
                }
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Birthday Month */}
        <div>
          <Label className="text-sm font-medium text-navy mb-2 block">
            Birthday Month
          </Label>
          <Select
            value={filters.birthday_month === "" ? "" : String(filters.birthday_month)}
            onValueChange={(val) =>
              onChange({
                ...filters,
                birthday_month: (val ?? "") === "" ? "" : parseInt(val ?? "", 10),
              })
            }
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Any Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any Month</SelectItem>
              {MONTH_NAMES.map((name, idx) => (
                <SelectItem key={idx + 1} value={String(idx + 1)}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audience Count */}
        <div
          className={`p-4 rounded-lg border ${
            !isCountLoading && count === 0
              ? "bg-red-50 border-red-200"
              : "bg-blue-50 border-blue-200"
          }`}
        >
          {isCountLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
              <span className="text-sm text-text-muted">
                Counting customers...
              </span>
            </div>
          ) : count === 0 ? (
            <p className="text-sm font-medium text-red-600">
              No customers match your filters. Adjust the criteria above.
            </p>
          ) : (
            <p className="text-sm font-medium text-navy">
              <span className="font-bold text-lg">{count}</span>{" "}
              customer{count !== 1 ? "s" : ""} match your filters
            </p>
          )}
        </div>

        {/* Clear Filters */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            onChange({
              tags: [],
              gender: "ALL",
              min_spend: "",
              max_spend: "",
              birthday_month: "",
            })
          }
        >
          Clear Filters
        </Button>
      </CardContent>
    </Card>
  );
}
