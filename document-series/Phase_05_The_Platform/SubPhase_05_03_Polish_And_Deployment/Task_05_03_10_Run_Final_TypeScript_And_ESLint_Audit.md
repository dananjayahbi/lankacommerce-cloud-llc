# Task 05.03.10 — Run Final TypeScript and ESLint Audit

## Metadata

| Field | Value |
|---|---|
| Task ID | 05.03.10 |
| SubPhase | 05.03 — Production Deployment and Polish |
| Complexity | Medium |
| Estimated Effort | 1 day |
| Dependencies | All prior tasks complete — entire codebase written and integrated |
| Produces | `.eslintrc.json` (updated), `frontend/lib/db/parse-query.ts`, no new source files |
| Blocked By | All prior tasks |

---

## Objective

Perform a final comprehensive audit of the entire LankaCommerce TypeScript codebase for type errors and linting violations. The target state is zero TypeScript compiler errors and zero ESLint errors across the `frontend/` directory. Document the resolution approach for the most common classes of issues encountered when integrating raw queries and dynamic API data, and confirm that `pnpm run build` produces a successful production build with no warnings escalated to errors.

---

## Instructions

### Step 1: Run the TypeScript Compiler in Check Mode

From the project root, run `pnpm tsc --noEmit`. This instructs the TypeScript compiler to perform a full type-check of all files without emitting output. On first run, expect three common categories of issues: (a) implicit any types on variables that could not be inferred, particularly in raw query result handling; (b) possibly-undefined access chains where a nullable relation field is used without a null check; and (c) missing return types on async function handlers. Address each category as described in subsequent steps. The goal is to see "Found 0 errors."

### Step 2: Resolve Any-Typed Raw Query Results

If `pnpm tsc --noEmit` reports implicit any errors on raw query results, apply the following pattern. Define a Zod schema that matches the expected shape of the raw query result. After the raw query call, pass the result through the schema using `schema.parse(rawResult)` — this both validates at runtime and gives TypeScript the correct inferred type. Encapsulate this pattern in a utility function `parseQueryResult(schema, data)` defined in `frontend/lib/db/parse-query.ts`.

### Step 3: Configure ESLint with Strict Rules

Open or create `.eslintrc.json` at the project root. Confirm the configuration extends `"next/core-web-vitals"`, `"plugin:@typescript-eslint/recommended"`, and `"plugin:react-hooks/recommended"`. Under the `rules` key, declare: `@typescript-eslint/no-explicit-any: "error"`, `no-console: "warn"`, `react-hooks/rules-of-hooks: "error"`, `react-hooks/exhaustive-deps: "warn"`, `@typescript-eslint/no-unused-vars: ["error", { "argsIgnorePattern": "^_" }]`, `@typescript-eslint/consistent-type-imports: "warn"`.

### Step 4: Run ESLint Across the Entire Source Directory

Run `pnpm eslint frontend/ --ext .ts,.tsx`. Review the output grouped by file. Common issues: `console.log` statements left in service functions — remove them or replace with a structured logger. Variables declared but never referenced — remove or prefix with underscore. Missing dependency arrays in `useEffect` or TanStack Query `queryFn` — add missing dependencies. Explicit any types remaining — resolve using the Zod pattern from Step 2. After resolving all items, re-run and confirm zero errors.

### Step 5: Run the Production Build

Run `pnpm run build` to perform a full Next.js production build. This compiles all pages, runs the TypeScript type checker, applies ESLint rules, and pre-renders static pages. The expected output is a build manifest with all routes listed and the final line "✓ Compiled successfully."

### Step 6: Document the Clean State

In the project README, under a section titled "Code Quality", document the commands that verify the codebase is in a clean state: `pnpm tsc --noEmit` for type checking, `pnpm eslint frontend/ --ext .ts,.tsx` for lint checking, and `pnpm run build` for a full production build verification.

---

## Expected Output

- `.eslintrc.json` — Updated with strict rules.
- `frontend/lib/db/parse-query.ts` — Utility function for Zod-validated raw query result parsing.
- No new source files — all other changes are removals, fixes, and type annotations on existing code.

---

## Validation

- `pnpm tsc --noEmit` outputs "Found 0 errors." with no additional diagnostic lines.
- `pnpm eslint frontend/ --ext .ts,.tsx` reports zero errors.
- `pnpm run build` completes successfully with "✓ Compiled successfully." output.
- No `@ts-ignore` suppression comments exist in the codebase.
- No explicit any types remain in `frontend/` files visible to the TypeScript compiler.
- All raw query results pass through a Zod schema before use.
- The three quality-check commands are documented in the project README.

---

## Notes

Next.js has a configuration option in `next.config.ts` to fail the build on ESLint errors: set `eslint.ignoreDuringBuilds` to `false` (the default). Ensure this option is not accidentally set to `true`, which would silently suppress ESLint errors during Vercel deployments. If the ShadCN source files under `frontend/components/ui/` contain type definitions that trip `@typescript-eslint/no-explicit-any`, add the `ui/` directory to the ESLint ignore list in `.eslintignore` rather than overriding the rule globally.
