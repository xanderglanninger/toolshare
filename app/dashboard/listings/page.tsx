"use client";

import { useRouter } from "next/navigation";
import MyListings from "@/components/dashboard/MyListings";

export default function ListingsPage() {
  const router = useRouter();
  return (
    <MyListings onEdit={(id) => router.push(`/dashboard/listings/${id}/edit`)} />
  );
}
