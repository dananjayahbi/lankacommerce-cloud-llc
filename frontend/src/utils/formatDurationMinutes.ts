/**
 * Format a duration in minutes as "Xh Ym".
 * Examples: 75 → "1h 15m", 59 → "0h 59m", 120 → "2h 0m"
 */
export function formatDurationMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}
