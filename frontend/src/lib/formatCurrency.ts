import Decimal from "decimal.js";

/**
 * Formats a Decimal, number, or numeric string as a Sri Lankan Rupee amount.
 * Output: "Rs. X,XXX.XX"
 */
export function formatCurrency(value: Decimal | number | string): string {
  const d = value instanceof Decimal ? value : new Decimal(value);
  const fixed = d.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `Rs.\u00a0${withCommas}.${decPart}`;
}
