import type { Metadata } from "next";
import { LandingPage } from "@/components/site/LandingPage";
import { findLanding } from "@/lib/landings";
import { pageMetadata } from "@/lib/seo";

const landing = findLanding("/cancel-subscriptions");

export const metadata: Metadata = pageMetadata({ title: landing.metaTitle, description: landing.description, path: landing.path });

export default function CancelSubscriptionsPage() {
  return <LandingPage landing={landing} />;
}
