"use client";

import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StaffMember, UserRole } from "@/types/hr";

// Role badge config — defined once, used in StaffTable and detail page
export const ROLE_BADGE_CONFIG: Record<
  UserRole,
  { background: string; color: string; label: string }
> = {
  OWNER: { background: "#1B2B3A", color: "#FFFFFF", label: "Owner" },
  MANAGER: { background: "#F97316", color: "#FFFFFF", label: "Manager" },
  CASHIER: { background: "#E2E8F0", color: "#1B2B3A", label: "Cashier" },
  STOCK_CLERK: { background: "#64748B", color: "#FFFFFF", label: "Stock Clerk" },
};

const rateFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

interface StaffTableProps {
  staff: StaffMember[];
  onToggleActive: (id: string, newValue: boolean) => void;
}

export function StaffTable({ staff, onToggleActive }: StaffTableProps) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-background">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Commission Rate</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-text-muted py-8">
                No staff members found.
              </TableCell>
            </TableRow>
          )}
          {staff.map((member) => {
            const badgeCfg = ROLE_BADGE_CONFIG[member.role];
            const rateDisplay =
              member.commission_rate !== null
                ? `${rateFormatter.format(Number(member.commission_rate))}%`
                : "—";
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium text-navy">
                  {member.name}
                </TableCell>
                <TableCell className="text-text-muted">{member.email}</TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: badgeCfg.background,
                      color: badgeCfg.color,
                    }}
                  >
                    {badgeCfg.label}
                  </span>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={member.is_active}
                    onCheckedChange={(checked: boolean) =>
                      onToggleActive(member.id, checked)
                    }
                    aria-label={`Toggle active status for ${member.name}`}
                  />
                </TableCell>
                <TableCell className="text-text-muted">{rateDisplay}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/staff/${member.id}`} className="inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-medium hover:bg-muted transition-colors">
                    View
                  </Link>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
