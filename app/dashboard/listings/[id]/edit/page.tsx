"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import EditListing from "@/components/dashboard/EditListing";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  return (
    <EditListing listingId={id} onDone={() => router.push("/dashboard/listings")} />
  );
}
