"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

export interface CollectionRule {
  id: string;
  field: "tag" | "vendor" | "product_type" | "price" | "category";
  relation:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "greater_than"
    | "less_than";
  value: string;
}

const FIELDS: { value: CollectionRule["field"]; label: string }[] = [
  { value: "tag", label: "Product tag" },
  { value: "vendor", label: "Vendor" },
  { value: "product_type", label: "Product type" },
  { value: "price", label: "Price" },
  { value: "category", label: "Category" },
];

const RELATIONS: {
  value: CollectionRule["relation"];
  label: string;
  numericOnly?: boolean;
}[] = [
  { value: "equals", label: "is equal to" },
  { value: "not_equals", label: "is not equal to" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "greater_than", label: "is greater than", numericOnly: true },
  { value: "less_than", label: "is less than", numericOnly: true },
];

const NUMERIC_FIELDS: CollectionRule["field"][] = ["price"];

function getRelationsForField(field: CollectionRule["field"]) {
  if (NUMERIC_FIELDS.includes(field)) {
    return RELATIONS;
  }
  return RELATIONS.filter((r) => !r.numericOnly);
}

interface CollectionRuleEditorProps {
  rules: CollectionRule[];
  disjunctive: boolean;
  onChange: (rules: CollectionRule[], disjunctive: boolean) => void;
}

export function CollectionRuleEditor({
  rules,
  disjunctive,
  onChange,
}: CollectionRuleEditorProps) {
  function addRule() {
    const newRule: CollectionRule = {
      id: `rule_${Date.now()}`,
      field: "tag",
      relation: "equals",
      value: "",
    };
    onChange([...rules, newRule], disjunctive);
  }

  function updateRule(
    id: string,
    patch: Partial<Omit<CollectionRule, "id">>,
  ) {
    onChange(
      rules.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, ...patch };
        // Reset relation if switching away from numeric field
        if (
          patch.field &&
          !NUMERIC_FIELDS.includes(patch.field) &&
          (r.relation === "greater_than" || r.relation === "less_than")
        ) {
          updated.relation = "equals";
        }
        return updated;
      }),
      disjunctive,
    );
  }

  function deleteRule(id: string) {
    onChange(rules.filter((r) => r.id !== id), disjunctive);
  }

  return (
    <div className="space-y-4">
      {/* Conjunction */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-600 font-medium">
          Products must match
        </span>
        <RadioGroup
          value={disjunctive ? "any" : "all"}
          onValueChange={(v) => onChange(rules, v === "any")}
          className="flex gap-4"
        >
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="all" id="conj-all" />
            <Label htmlFor="conj-all" className="cursor-pointer text-sm">
              ALL conditions
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <RadioGroupItem value="any" id="conj-any" />
            <Label htmlFor="conj-any" className="cursor-pointer text-sm">
              ANY condition
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Rules */}
      {rules.length === 0 && (
        <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-200 rounded-lg">
          No rules yet. Add a condition to automatically populate this
          collection.
        </div>
      )}

      {rules.map((rule, idx) => {
        const availableRelations = getRelationsForField(rule.field);
        return (
          <div
            key={rule.id}
            className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200"
          >
            {idx > 0 && (
              <span className="text-xs font-medium text-slate-500 w-full -mb-1">
                {disjunctive ? "OR" : "AND"}
              </span>
            )}
            <Select
              value={rule.field}
              onValueChange={(v) =>
                updateRule(rule.id, { field: v as CollectionRule["field"] })
              }
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELDS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={rule.relation}
              onValueChange={(v) =>
                updateRule(rule.id, {
                  relation: v as CollectionRule["relation"],
                })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRelations.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              className="flex-1 min-w-[120px]"
              placeholder={
                rule.field === "price" ? "e.g. 1000" : "e.g. sale"
              }
              value={rule.value}
              onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            />

            <button
              type="button"
              onClick={() => deleteRule(rule.id)}
              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
              title="Remove rule"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        className="border-dashed gap-2"
        onClick={addRule}
      >
        <Plus className="w-4 h-4" />
        Add Condition
      </Button>
    </div>
  );
}
