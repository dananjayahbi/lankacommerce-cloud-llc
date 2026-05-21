/**
 * URL parameter utilities for filter state management.
 * All filter state lives in URL params (not Zustand) for bookmark-ability.
 */

/**
 * Merges a partial params update into the current search params,
 * preserving all existing params unless overridden.
 * Setting a value to null/undefined removes the param.
 */
export function mergeSearchParams(
  current: URLSearchParams | { toString(): string },
  updates: Record<string, string | string[] | null | undefined>,
): string {
  const next = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === undefined || value === "") {
      next.delete(key);
    } else if (Array.isArray(value)) {
      if (value.length === 0) {
        next.delete(key);
      } else {
        next.set(key, value.join(","));
      }
    } else {
      next.set(key, value);
    }
  }

  return next.toString();
}

/** Reads a comma-separated URL param as an array of strings. */
export function getParamArray(params: URLSearchParams, key: string): string[] {
  const val = params.get(key);
  if (!val) return [];
  return val.split(",").filter(Boolean);
}
