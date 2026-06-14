/**
 * Renders a JSON-LD <script> tag (server component). Pass any schema.org object.
 * Using a server component keeps the structured data in the initial HTML so
 * crawlers see it without executing JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Schema is author-controlled (no user input), so this is safe.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
