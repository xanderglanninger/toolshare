"use client";

import { useRouter } from "next/navigation";
import Notifications from "@/components/dashboard/Notifications";
import { useDashboard } from "../context";

export default function NotificationsPage() {
  const router = useRouter();
  const { setNotifUnread } = useDashboard();

  return (
    <Notifications
      onNavigate={(tab, linkData) => {
        setNotifUnread(0);
        if (tab === "messages" && linkData) {
          router.push(`/dashboard/messages?thread=${linkData}`);
        } else {
          router.push(`/dashboard/${tab}`);
        }
      }}
    />
  );
}
