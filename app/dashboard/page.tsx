import { Suspense } from "react";
import TodaysPicks from "@/components/dashboard/TodaysPicks";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <TodaysPicks />
    </Suspense>
  );
}
