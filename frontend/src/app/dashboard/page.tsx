import { Suspense } from "react";
import { DashboardPageSkeleton } from "@/components/ui/Skeleton";
import DashboardClient from "./dashboard-client";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={<DashboardPageSkeleton />}
    >
      <DashboardClient />
    </Suspense>
  );
}
