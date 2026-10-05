import { SITE_URL } from "@/lib/site";
import { THEME_SCRIPT } from "@/lib/theme";
import type { Metadata } from "next";
import { fontClassNames } from "./fonts";
import { MotionProvider } from "@/components/site/MotionProvider";
import { JsonLd } from "@/components/site/JsonLd";
import { siteGraph } from "@/lib/structured-data";
import { HOME_DESCRIPTION, HOME_TITLE, pageMetadata } from "@/lib/seo";
import "./globals.css";

// The Honest Ledger type trio (./fonts.ts): self-hosted files, served from
// /_next/static, so font-src 'self' holds and the build needs no network (F103).

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  keywords: "subscription tracker, subscription manager, cancel subscriptions, renewal reminders, free trial tracker",
  // The homepage's own (SEO.md §3): keyword first, brand last. Every other page
  // sets its complete set through pageMetadata() (lib/seo.ts).
  ...pageMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: "/"
  })
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontClassNames} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <a href="#main" className="skip-to-content">
          Skip to content
        </a>
        <JsonLd data={siteGraph()} />
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
