"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./Notifications.module.css";

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

const TYPE_ICONS: Record<string, string> = {
  BOOKING_REQUEST:   "◷",
  BOOKING_CONFIRMED: "✓",
  BOOKING_CANCELLED: "✕",
  BOOKING_COMPLETED: "★",
  NEW_MESSAGE:       "◻",
  NEW_REVIEW:        "◈",
  PAYMENT_RECEIVED:  "◎",
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

export default function Notifications({ onNavigate }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res  = await fetch("/api/notifications");
      const json = await res.json();
      if (!res.ok || json.error) { setError(true); return; }
      setNotifications(json.data?.notifications ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH", body: JSON.stringify({}) });
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  }

  async function markOneRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)
    );
  }

  function handleClick(n: Notification) {
    if (!n.readAt) markOneRead(n.id);
    if (n.tab && onNavigate) onNavigate(n.tab, n.linkData ?? undefined);
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Inbox</p>
          <h1 className={styles.title}>Notifications</h1>
          {unreadCount > 0 && (
            <span className={styles.subtitle}>{unreadCount} unread</span>
          )}
        </div>
        {unreadCount > 0 && (
          <button className={styles.markAll} onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {loading && (
        <div className={styles.empty}>Loading…</div>
      )}

      {!loading && error && (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>Couldn't load notifications</p>
          <p className={styles.emptyText}>Please refresh the page to try again.</p>
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>○</span>
          <p className={styles.emptyTitle}>All caught up</p>
          <p className={styles.emptyText}>You have no notifications yet.</p>
        </div>
      )}

      {!loading && !error && notifications.length > 0 && (
        <div className={styles.list}>
          {notifications.map((n) => (
            <button
              key={n.id}
              className={`${styles.item}${!n.readAt ? " " + styles.unread : ""}`}
              onClick={() => handleClick(n)}
            >
              <span className={styles.itemIcon}>{TYPE_ICONS[n.type] ?? "◎"}</span>
              <div className={styles.itemBody}>
                <div className={styles.itemTop}>
                  <span className={styles.itemTitle}>{n.title}</span>
                  <span className={styles.itemTime}>{timeAgo(n.createdAt)}</span>
                </div>
                <span className={styles.itemText}>{n.body}</span>
              </div>
              {!n.readAt && <span className={styles.dot} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
