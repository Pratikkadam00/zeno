import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "./JsonLd";

// The server-rendered HTML is what crawlers and browsers parse, so the tests
// read that, not a DOM built from it.
const inner = (html: string) => {
  const m = /^<script type="application\/ld\+json">([\s\S]*)<\/script>$/.exec(html);
  if (!m) throw new Error(`not one JSON-LD script: ${html}`);
  return m[1]!;
};

describe("JsonLd", () => {
  it("emits one application/ld+json script whose text parses back to the data", () => {
    const data = { "@context": "https://schema.org", "@type": "Organization", name: "Zeno", nested: { list: [1, "two"] } };
    expect(JSON.parse(inner(renderToStaticMarkup(<JsonLd data={data} />)))).toEqual(data);
  });

  it("takes an array of schema objects", () => {
    const data = [{ "@type": "Organization" }, { "@type": "WebSite" }];
    expect(JSON.parse(inner(renderToStaticMarkup(<JsonLd data={data} />)))).toEqual(data);
  });

  it("F165: a value holding </script> cannot close the tag; the text still parses back to the same value", () => {
    const hostile = 'Cancel </script><script>alert(1)</script> <!-- here';
    const html = renderToStaticMarkup(<JsonLd data={{ name: hostile }} />);
    // Exactly one closing tag (the real one) and no raw "<" inside the script.
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(inner(html)).not.toContain("<");
    expect(JSON.parse(inner(html))).toEqual({ name: hostile });
  });
});
