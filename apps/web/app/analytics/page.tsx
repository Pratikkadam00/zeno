import { notFound } from "next/navigation";
import { isPublicAnalyticsEnabled } from "@/lib/analytics-flag";
import Dashboard from "./Dashboard";

export default function AnalyticsPage() {
  if (!isPublicAnalyticsEnabled()) {
    notFound();
  }
  return <Dashboard />;
}
