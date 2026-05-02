"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Monitor, Wrench, Tent, Car, Shirt, Sofa, Music, BookOpen,
  Gamepad2, Camera, PartyPopper, Package, MessageCircle, Flag,
} from "lucide-react";
import styles from "./Messages.module.css";
import type { MessageThread, Message, ReportReason, ThreadBookingInfo, BookingStatus } from "@/lib/types";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "NO_SHOW",               label: "No-show"                },
  { value: "DAMAGED_EQUIPMENT",     label: "Damaged equipment"      },
  { value: "FRAUDULENT_LISTING",    label: "Fraudulent listing"     },
  { value: "INAPPROPRIATE_BEHAVIOR",label: "Inappropriate behavior" },
  { value: "PAYMENT_DISPUTE",       label: "Payment dispute"        },
  { value: "OTHER",                 label: "Other"                  },
];

function initials(name: string, surname: string) {
  return `${name?.[0] ?? ""}${surname?.[0] ?? ""}`.toUpperCase();
}

function relativeTime(date: Date | string | null): string {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7)   return `${days}d ago`;
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  ELECTRONICS:          <Monitor size={22} />,
  TOOLS_EQUIPMENT:      <Wrench size={22} />,
  SPORTS_OUTDOORS:      <Tent size={22} />,
  VEHICLES:             <Car size={22} />,
  CLOTHING_ACCESSORIES: <Shirt size={22} />,
  FURNITURE_HOME:       <Sofa size={22} />,
  MUSICAL_INSTRUMENTS:  <Music size={22} />,
  BOOKS_MEDIA:          <BookOpen size={22} />,
  GAMES_TOYS:           <Gamepad2 size={22} />,
  CAMERAS_PHOTOGRAPHY:  <Camera size={22} />,
  PARTY_EVENTS:         <PartyPopper size={22} />,
  OTHER:                <Package size={22} />,
};

const STATUS_LABELS: Record<BookingStatus, { label: string; color: string }> = {
  PENDING:   { label: "Pending",   color: "var(--text-3)"  },
  CONFIRMED: { label: "Confirmed", color: "#60a5fa"        },
  ACTIVE:    { label: "Active",    color: "var(--accent)"  },
  COMPLETED: { label: "Completed", color: "#22c55e"        },
  CANCELLED: { label: "Cancelled", color: "#f87171"        },
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function fmtMoney(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ItemCard({ info }: { info: ThreadBookingInfo }) {
  const thumb = info.listing.images?.[0];
  const icon  = CATEGORY_ICONS[info.listing.category] ?? <Package size={22} />;
  const status = STATUS_LABELS[info.status as BookingStatus] ?? STATUS_LABELS.PENDING;

  return (
    <div className={styles.itemCard}>
      <div className={styles.itemCardThumb}>
        {thumb
          ? <img src={thumb} alt="" className={styles.itemCardImg} />
          : <span className={styles.itemCardIcon}>{icon}</span>}
      </div>
      <div className={styles.itemCardBody}>
        <p className={styles.itemCardTitle}>{info.listing.title}</p>
        <p className={styles.itemCardLocation}>
          {info.listing.city}, {info.listing.province}
        </p>
        <p className={styles.itemCardDates}>
          {fmtDate(info.startDate)} → {fmtDate(info.endDate)}
        </p>
      </div>
      <div className={styles.itemCardRight}>
        <p className={styles.itemCardAmount}>{fmtMoney(info.totalAmount)}</p>
        <span className={styles.itemCardStatus} style={{ color: status.color }}>
          {status.label}
        </span>
      </div>
    </div>
  );
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

interface ReportModalProps {
  thread: MessageThread;
  myId: string;
  onClose: () => void;
}

function ReportModal({ thread, myId, onClose }: ReportModalProps) {
  const [reason, setReason]   = useState<ReportReason>("OTHER");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone]       = useState(false);

  const otherParticipant = thread.participants.find((p) => p.userId !== myId);

  async function submit() {
    if (!otherParticipant) return;
    setSending(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedId: otherParticipant.userId,
          bookingId: thread.bookingId ?? undefined,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setDone(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {done ? (
          <>
            <p className={styles.modalTitle}>Report submitted</p>
            <p className={styles.modalSub}>
              Thanks for letting us know. Our team will review this shortly.
            </p>
            <button className={styles.modalClose} onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <p className={styles.modalTitle}>Report user</p>
            <p className={styles.modalSub}>
              Reporting{" "}
              <strong>
                {otherParticipant?.user.name} {otherParticipant?.user.surname}
              </strong>
            </p>

            <label className={styles.modalLabel}>Reason</label>
            <select
              className={styles.modalSelect}
              value={reason}
              onChange={(e) => setReason(e.target.value as ReportReason)}
            >
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <label className={styles.modalLabel}>Details (optional)</label>
            <textarea
              className={styles.modalTextarea}
              placeholder="Describe what happened…"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />

            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={onClose}>Cancel</button>
              <button
                className={styles.modalSubmit}
                disabled={sending}
                onClick={submit}
              >
                {sending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MessagesProps {
  initialThreadId?: string | null;
  onThreadOpened?: () => void;
}

export default function Messages({ initialThreadId, onThreadOpened }: MessagesProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id ?? "";

  const [threads, setThreads]         = useState<MessageThread[]>([]);
  const [threadsLoading, setTL]       = useState(true);
  const [selectedId, setSelectedId]   = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages]       = useState<Message[]>([]);
  const [msgsLoading, setML]          = useState(false);
  const [reply, setReply]             = useState("");
  const [sending, setSending]         = useState(false);
  const [reporting, setReporting]     = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);

  // keep selectedId in sync if parent passes initialThreadId after mount
  useEffect(() => {
    if (initialThreadId) {
      setSelectedId(initialThreadId);
      onThreadOpened?.();
    }
  }, [initialThreadId, onThreadOpened]);

  const fetchThreads = useCallback(async () => {
    setTL(true);
    try {
      const res  = await fetch("/api/messages");
      const json = await res.json();
      setThreads(json.data ?? []);
    } finally {
      setTL(false);
    }
  }, []);

  useEffect(() => { fetchThreads(); }, [fetchThreads]);

  const fetchMessages = useCallback(async (threadId: string) => {
    setML(true);
    try {
      const res  = await fetch(`/api/messages/${threadId}`);
      const json = await res.json();
      setMessages(json.data ?? []);
    } finally {
      setML(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    fetchMessages(selectedId);
    // mark thread as read in local state
    setThreads((prev) =>
      prev.map((t) => t.id === selectedId ? { ...t, unreadCount: 0 } : t)
    );
  }, [selectedId, fetchMessages]);

  // scroll to bottom when messages load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!selectedId || !reply.trim()) return;
    setSending(true);
    const body = reply.trim();
    setReply("");
    try {
      const res  = await fetch(`/api/messages/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (json.data) {
        setMessages((prev) => [...prev, json.data]);
        // update thread preview
        setThreads((prev) =>
          prev.map((t) =>
            t.id === selectedId
              ? { ...t, lastMessage: json.data, lastMessageAt: json.data.createdAt }
              : t
          )
        );
      }
    } finally {
      setSending(false);
    }
  }

  const activeThread = threads.find((t) => t.id === selectedId) ?? null;

  function otherParty(thread: MessageThread) {
    const other = thread.participants.find((p) => p.userId !== myId);
    return other?.user ?? null;
  }

  const totalUnread = threads.reduce((n, t) => n + t.unreadCount, 0);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Inbox</p>
        <h1 className={styles.pageTitle}>
          Messages
          {totalUnread > 0 && (
            <span className={styles.headBadge}>{totalUnread}</span>
          )}
        </h1>
      </div>

      <div className={styles.layout}>

        {/* ── Thread list ── */}
        <div className={styles.list}>
          {threadsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem} />
            ))
          ) : threads.length === 0 ? (
            <div className={styles.listEmpty}>
              <p className={styles.listEmptyText}>No conversations yet.</p>
              <p className={styles.listEmptySub}>
                Click &quot;Message&quot; on any booking to start one.
              </p>
            </div>
          ) : (
            threads.map((t) => {
              const other   = otherParty(t);
              const isActive = t.id === selectedId;
              return (
                <div
                  key={t.id}
                  className={`${styles.item}${t.unreadCount > 0 ? " " + styles.itemUnread : ""}${isActive ? " " + styles.itemActive : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className={styles.avatar}>
                    {other ? initials(other.name, other.surname) : "?"}
                  </div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemFrom}>
                        {other ? `${other.name} ${other.surname}` : "Unknown"}
                      </span>
                      <span className={styles.itemTime}>
                        {relativeTime(t.lastMessageAt)}
                      </span>
                    </div>
                    {t.subject && (
                      <p className={styles.itemSubject}>{t.subject}</p>
                    )}
                    <p className={styles.itemPreview}>
                      {t.lastMessage?.body ?? "No messages yet"}
                    </p>
                  </div>
                  {t.unreadCount > 0 && (
                    <span className={styles.unreadDot} />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* ── Thread / empty state ── */}
        <div className={styles.thread}>
          {!activeThread ? (
            <div className={styles.threadEmpty}>
              <span className={styles.threadEmptyIcon}><MessageCircle size={48} /></span>
              <p className={styles.threadEmptyTitle}>Select a conversation</p>
              <p className={styles.threadEmptySub}>
                Choose a message from the left to read and reply
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className={styles.threadHead}>
                <div className={styles.avatarLg}>
                  {(() => {
                    const o = otherParty(activeThread);
                    return o ? initials(o.name, o.surname) : "?";
                  })()}
                </div>
                <div className={styles.threadHeadInfo}>
                  {(() => {
                    const o = otherParty(activeThread);
                    return (
                      <>
                        <p className={styles.threadFrom}>
                          {o ? `${o.name} ${o.surname}` : "Unknown"}
                        </p>
                        {activeThread.subject && (
                          <p className={styles.threadSub}>{activeThread.subject}</p>
                        )}
                      </>
                    );
                  })()}
                </div>
                <button
                  className={styles.reportBtn}
                  onClick={() => setReporting(true)}
                  title="Report this user"
                >
                  <Flag size={13} /> Report
                </button>
              </div>

              {/* Item card */}
              {activeThread.bookingInfo && (
                <ItemCard info={activeThread.bookingInfo} />
              )}

              {/* Messages */}
              <div className={styles.threadMessages}>
                {msgsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className={`${styles.skeletonBubble}${i % 2 === 1 ? " " + styles.skeletonBubbleRight : ""}`}
                    />
                  ))
                ) : messages.length === 0 ? (
                  <div className={styles.noMsgs}>
                    No messages yet. Say hello!
                  </div>
                ) : (
                  messages.map((m) => {
                    const mine = m.senderId === myId;
                    return (
                      <div
                        key={m.id}
                        className={`${styles.bubbleWrap}${mine ? " " + styles.bubbleWrapMine : ""}`}
                      >
                        <div className={`${styles.bubble}${mine ? " " + styles.bubbleMine : ""}`}>
                          {m.body}
                        </div>
                        <span className={styles.bubbleTime}>
                          {relativeTime(m.createdAt)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Reply box */}
              <div className={styles.replyBox}>
                <input
                  type="text"
                  className={styles.replyInput}
                  placeholder="Type a message…"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sending}
                />
                <button
                  className={styles.sendBtn}
                  disabled={!reply.trim() || sending}
                  onClick={handleSend}
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* ── Report modal ── */}
      {reporting && activeThread && (
        <ReportModal
          thread={activeThread}
          myId={myId}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}
