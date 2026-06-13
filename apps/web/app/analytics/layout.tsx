import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const metadata: Metadata = {
  title: "Growth Analytics — Zeno",
  description: "Revenue, MRR, subscriber growth, churn, retention and acquisition analytics for Zeno.",
  robots: { index: false, follow: false }
};

export default function AnalyticsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      <Footer />
    </>
  );
}
