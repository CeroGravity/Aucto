// Renders a JSON-LD <script> for structured data. The payload is a plain object
// (schema.org); we stringify it into a type="application/ld+json" script. Not a
// client component — it's static markup in the server-rendered HTML.
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // JSON-LD must be injected as a raw script body. `data` is server-built from
  // trusted DB values (no user HTML); JSON.stringify escapes the content.
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted JSON-LD payload, see above
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
