"use client";

import { useRouter } from "next/navigation";
import Statistics from "@/components/dashboard/Statistics";

export default function StatisticsPage() {
  const router = useRouter();
  return (
    <Statistics
      onNavigate={(tab) => router.push(`/dashboard/${tab}`)}
      onOpenThread={(id) => router.push(`/dashboard/messages?thread=${id}`)}
    />
  );
}
