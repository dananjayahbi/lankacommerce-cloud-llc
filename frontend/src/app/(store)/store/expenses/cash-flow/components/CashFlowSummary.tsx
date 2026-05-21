"use client";

import Decimal from "decimal.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  totalIncome: string;
  totalExpenses: string;
  netCashFlow: string;
}

export function CashFlowSummary({ totalIncome, totalExpenses, netCashFlow }: Props) {
  const incomeD = new Decimal(totalIncome);
  const expensesD = new Decimal(totalExpenses);
  const netD = new Decimal(netCashFlow);

  const incomeStyle = incomeD.gt(0)
    ? { background: "rgba(34, 197, 94, 0.08)" }
    : { background: "#F1F5F9" };
  const expensesStyle = expensesD.gt(0)
    ? { background: "rgba(239, 68, 68, 0.08)" }
    : { background: "#F1F5F9" };
  const netStyle = netD.isPositive() && !netD.isZero()
    ? { background: "rgba(34, 197, 94, 0.08)" }
    : netD.isNegative()
    ? { background: "rgba(239, 68, 68, 0.08)" }
    : { background: "#F1F5F9" };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card style={incomeStyle}>
        <CardHeader className="pb-2">
          <CardTitle className="font-inter text-[14px]" style={{ color: "#64748B" }}>
            Total Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-[24px] font-bold" style={{ color: "#1B2B3A" }}>
            Rs. {incomeD.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card style={expensesStyle}>
        <CardHeader className="pb-2">
          <CardTitle className="font-inter text-[14px]" style={{ color: "#64748B" }}>
            Total Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-mono text-[24px] font-bold" style={{ color: "#1B2B3A" }}>
            Rs. {expensesD.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card style={netStyle}>
        <CardHeader className="pb-2">
          <CardTitle className="font-inter text-[14px]" style={{ color: "#64748B" }}>
            Net Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className="font-mono text-[32px] font-bold"
            style={{ color: netD.isNegative() ? "#EF4444" : netD.isZero() ? "#1B2B3A" : "#22C55E" }}
          >
            Rs. {netD.toFixed(2)}
          </p>
          <p className="mt-1 font-inter text-[12px]" style={{ color: "#64748B" }}>
            Income minus expenses and outflows
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
