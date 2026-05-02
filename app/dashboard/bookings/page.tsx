"use client";

import { useRouter } from "next/navigation";
import Bookings from "@/components/dashboard/Bookings";

export default function BookingsPage() {
  const router = useRouter();
  return (
    <Bookings onOpenThread={(id) => router.push(`/dashboard/messages?thread=${id}`)} />
  );
}
