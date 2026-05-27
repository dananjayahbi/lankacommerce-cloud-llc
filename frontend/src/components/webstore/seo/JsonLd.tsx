/**
 * JsonLd — Server Component
 *
 * Renders a <script type="application/ld+json"> tag with the given schema
 * object. Use this for structured data on any page.
 *
 * NEVER render user-controlled data directly inside the script tag without
 * JSON.stringify — JSON serialization escapes all dangerous characters.
 *
 * Usage:
 *   <JsonLd schema={productSchema} />
 *   <JsonLd schema={[schema1, schema2]} />
 */

interface JsonLdProps {
  schema: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Safely serialize a schema object to a JSON-LD script tag.
 * JSON.stringify escapes </script> sequences that could break the page.
 */
function serializeSchema(schema: JsonLdProps["schema"]): string {
  return JSON.stringify(schema)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function JsonLd({ schema }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: serializeSchema(schema) }}
    />
  );
}
