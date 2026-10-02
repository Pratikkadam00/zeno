/**
 * Renders a JSON-LD <script> tag (server component). Pass any schema.org object.
 * Using a server component keeps the structured data in the initial HTML so
 * crawlers see it without executing JS.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify leaves "<" alone, so a value holding "</script>" would end
      // the tag early and the rest would be read as HTML (F165). The JSON escape
      // < is the same character to a JSON parser and inert to the HTML
      // parser; it is the escape Next's own JSON-LD guide gives. Values come
      // from our catalog and copy, never from a visitor, but 509 catalog
      // entries are too many to trust by eye.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
