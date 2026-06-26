import { notFound } from "next/navigation";
import Dashboard from "./Dashboard";

export default function AnalyticsPage() {
  // The dashboard renders synthetic sample KPIs. To avoid broadcasting
  // plausible-looking-but-fake business metrics publicly, it is hidden in
  // production unless explicitly opted in (SHOW_PUBLIC_ANALYTICS=1, e.g. for a
  // demo). Always available in development.
  if (process.env.NODE_ENV === "production" && process.env.SHOW_PUBLIC_ANALYTICS !== "1") {
    notFound();
  }
  return <Dashboard />;
}
