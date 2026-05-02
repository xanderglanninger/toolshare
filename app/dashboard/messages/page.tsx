"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Messages from "@/components/dashboard/Messages";

function MessagesContent() {
  const searchParams = useSearchParams();
  const threadId = searchParams.get("thread");
  return <Messages initialThreadId={threadId} />;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesContent />
    </Suspense>
  );
}
