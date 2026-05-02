"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Clock, CheckCircle, XCircle, Star, MessageSquare, ThumbsUp, DollarSign } from "lucide-react";
import styles from "./NotificationBell.module.css";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  tab?: string | null;
  linkData?: string | null;
  readAt?: string | null;
  createdAt: string;
};

type Props = {
  onNavigate?: (tab: string, linkData?: string) => void;
};

const TYPE_ICONS: Record<string, React.ReactElement> = {
  BOOKING_REQUEST:   <Clock size={14} />,
  BOOKING_CONFIRMED: <CheckCircle size={14} />,
  BOOKING_CANCELLED: <XCircle size={14} />,
  BOOKING_COMPLETED: <Star size={14} />,
  NEW_MESSAGE:       <MessageSquare size={14} />,
  NEW_REVIEW:        <ThumbsUp size={14} />,
  PAYMENT_RECEIVED:  <DollarSign size={14} />,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return "just now";
  if (mins  < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days  < 7)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function NotificationBell({ onNavigate }: Props) {
  const [open, setOpen]                       = useState(false);
  const [notifications, setNotifications]     = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]         = useState(0);
  const [loading, setLoading]                 = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications");
      const json = await res.json();
      if (json.data) {
        setNotifications(json.data.notifications);
        setUnreadCount(json.data.unreadCount);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    }
  }

  function handleClick(n: Notification) {
    setOpen(false);
    if (n.tab && onNavigate) {
      onNavigate(n.tab, n.linkData ?? undefined);
    }
  }

  return (
    <div className={styles.wrap} ref={panelRef}>
      <button className={styles.bell} onClick={handleOpen} aria-label="Notifications">
        <span className={styles.bellIcon}><Bell size={20} /></span>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Notifications</span>
            {notifications.some((n) => !n.readAt) && (
              <button
                className={styles.markAll}
                onClick={async () => {
                  await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
                  setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
                  setUnreadCount(0);
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className={styles.list}>
            {loading && notifications.length === 0 && (
              <div className={styles.empty}>Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className={styles.empty}>No notifications yet</div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                className={`${styles.item}${!n.readAt ? " " + styles.unread : ""}`}
                onClick={() => handleClick(n)}
              >
                <span className={styles.itemIcon}>{TYPE_ICONS[n.type] ?? <DollarSign size={14} />}</span>
                <div className={styles.itemBody}>
                  <span className={styles.itemTitle}>{n.title}</span>
                  <span className={styles.itemText}>{n.body}</span>
                  <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                </div>
                {!n.readAt && <span className={styles.dot} />}
              </button>
            ))}
          </div>

          <div className={styles.panelFooter}>
            <button
              className={styles.viewAll}
              onClick={() => { setOpen(false); onNavigate?.("notifications"); }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
