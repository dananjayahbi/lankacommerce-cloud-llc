import { z } from 'zod/v4'

/**
 * Validate and type-narrow raw API/query results using a Zod schema.
 * Throws if the data does not match the expected shape.
 *
 * Usage:
 *   const schema = z.array(z.object({ id: z.number(), name: z.string() }))
 *   const typed = parseQueryResult(schema, rawData)  // typed: { id: number; name: string }[]
 */
export function parseQueryResult<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T {
  return schema.parse(data)
}
