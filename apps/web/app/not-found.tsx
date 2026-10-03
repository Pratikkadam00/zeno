import Link from "next/link";
import { ContentShell } from "@/components/site/ContentShell";

/**
 * The site's 404, inside the root layout. Without this file, a page that calls
 * notFound() while prerendering (the sample /analytics, while its flag is off)
 * got Next's bare error document: no lang attribute, no fonts, no theme script
 * (F184). Unknown paths render it too.
 */
export default function NotFound() {
  return (
    <ContentShell eyebrow="404" title="Page not found" lead="There's no page at this address.">
      <p>
        <Link href="/">Go to the homepage</Link> or <Link href="/cancel">browse the cancel guides</Link>.
      </p>
    </ContentShell>
  );
}
