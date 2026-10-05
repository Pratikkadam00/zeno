import type { Metadata } from "next";
import { LandingPage } from "@/components/site/LandingPage";
import { findLanding } from "@/lib/landings";
import { pageMetadata } from "@/lib/seo";

const landing = findLanding("/budgeting");

export const metadata: Metadata = pageMetadata({ title: landing.metaTitle, description: landing.description, path: landing.path });

export default function BudgetingPage() {
  return <LandingPage landing={landing} />;
}
