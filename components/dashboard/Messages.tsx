"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import {
  Monitor, Wrench, Tent, Car, Shirt, Sofa, Music, BookOpen,
  Gamepad2, Camera, PartyPopper, Package, MessageCircle, Flag, ArrowLeft,
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
  ELECTRONICS:          <Monitor size={20} />,
  TOOLS_EQUIPMENT:      <Wrench size={20} />,
  SPORTS_OUTDOORS:      <Tent size={20} />,
  VEHICLES:             <Car size={20} />,
  CLOTHING_ACCESSORIES: <Shirt size={20} />,
  FURNITURE_HOME:       <Sofa size={20} />,
  MUSICAL_INSTRUMENTS:  <Music size={20} />,
  BOOKS_MEDIA:          <BookOpen size={20} />,
  GAMES_TOYS:           <Gamepad2 size={20} />,
  CAMERAS_PHOTOGRAPHY:  <Camera size={20} />,
  PARTY_EVENTS:         <PartyPopper size={20} />,
  OTHER:                <Package size={20} />,
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

function fmtMoney(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ItemCard({ info }: { info: ThreadBookingInfo }) {
  const thumb = info.listing.images?.[0];
  const icon  = CATEGORY_ICONS[info.listing.category] ?? <Package size={20} />;
  return (
    <div className={styles.itemCard}>
      <div className={styles.itemCardThumb}>
        {thumb
          ? <img src={thumb} alt="" className={styles.itemCardImg} />
          : <span className={styles.itemCardIcon}>{icon}</span>}
      </div>
      <div className={styles.itemCardBody}>
        <p className={styles.itemCardTitle}>{info.listing.title}</p>
        <p className={styles.itemCardMeta}>
          {fmtDate(info.startDate)} – {fmtDate(info.endDate)} · {fmtMoney(info.totalAmount)}
        </p>
      </div>
    </div>
  );
}

function ReportModal({ thread, myId, onClose }: { thread: MessageThread; myId: string; onClose: () => void }) {
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
            <p className={styles.modalSub}>Thanks for letting us know. Our team will review this shortly.</p>
            <button className={styles.modalClose} onClick={onClose}>Close</button>
          </>
        ) : (
          <>
            <p className={styles.modalTitle}>Report user</p>
            <p className={styles.modalSub}>
              Reporting <strong>{otherParticipant?.user.name} {otherParticipant?.user.surname}</strong>
            </p>
            <label className={styles.modalLabel}>Reason</label>
            <select className={styles.modalSelect} value={reason} onChange={(e) => setReason(e.target.value as ReportReason)}>
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
              <button className={styles.modalSubmit} disabled={sending} onClick={submit}>
                {sending ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface MessagesProps {
  initialThreadId?: string | null;
  onThreadOpened?: () => void;
}

export default function Messages({ initialThreadId, onThreadOpened }: MessagesProps) {
  const { data: session } = useSession();
  const myId = session?.user?.id ?? "";

  const [threads, setThreads]       = useState<MessageThread[]>([]);
  const [threadsLoading, setTL]     = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(initialThreadId ?? null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [msgsLoading, setML]        = useState(false);
  const [reply, setReply]           = useState("");
  const [sending, setSending]       = useState(false);
  const [reporting, setReporting]   = useState(false);
  // mobile: "list" shows the thread list, "chat" shows the open conversation
  const [mobileView, setMobileView] = useState<"list" | "chat">(initialThreadId ? "chat" : "list");
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialThreadId) {
      setSelectedId(initialThreadId);
      setMobileView("chat");
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
    setThreads((prev) =>
      prev.map((t) => t.id === selectedId ? { ...t, unreadCount: 0 } : t)
    );
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openThread(id: string) {
    setSelectedId(id);
    setMobileView("chat");
  }

  function backToList() {
    setMobileView("list");
  }

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
  const totalUnread  = threads.reduce((n, t) => n + t.unreadCount, 0);

  function otherParty(thread: MessageThread) {
    return thread.participants.find((p) => p.userId !== myId)?.user ?? null;
  }

  return (
    <div className={styles.page}>

      {/* ── Thread list panel ── */}
      <div className={`${styles.listPanel}${mobileView === "chat" ? " " + styles.listPanelHidden : ""}`}>
        <div className={styles.listHead}>
          <h1 className={styles.listTitle}>
            Messages
            {totalUnread > 0 && <span className={styles.headBadge}>{totalUnread}</span>}
          </h1>
        </div>

        <div className={styles.list}>
          {threadsLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.skeletonItem} />
            ))
          ) : threads.length === 0 ? (
            <div className={styles.listEmpty}>
              <MessageCircle size={36} className={styles.listEmptyIcon} />
              <p className={styles.listEmptyText}>No conversations yet</p>
              <p className={styles.listEmptySub}>Click "Message" on any booking to start one.</p>
            </div>
          ) : (
            threads.map((t) => {
              const other = otherParty(t);
              return (
                <button
                  key={t.id}
                  className={`${styles.item}${t.unreadCount > 0 ? " " + styles.itemUnread : ""}${t.id === selectedId ? " " + styles.itemActive : ""}`}
                  onClick={() => openThread(t.id)}
                >
                  <div className={styles.avatar}>
                    {other ? initials(other.name, other.surname) : "?"}
                    {t.unreadCount > 0 && <span className={styles.avatarDot} />}
                  </div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemHeader}>
                      <span className={styles.itemFrom}>
                        {other ? `${other.name} ${other.surname}` : "Unknown"}
                      </span>
                      <span className={styles.itemTime}>{relativeTime(t.lastMessageAt)}</span>
                    </div>
                    {t.subject && <p className={styles.itemSubject}>{t.subject}</p>}
                    <p className={`${styles.itemPreview}${t.unreadCount > 0 ? " " + styles.itemPreviewBold : ""}`}>
                      {t.lastMessage?.body ?? "No messages yet"}
                    </p>
                  </div>
                  <span className={styles.itemChevron}>›</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      <div className={`${styles.chatPanel}${mobileView === "list" ? " " + styles.chatPanelHidden : ""}`}>
        {!activeThread ? (
          <div className={styles.threadEmpty}>
            <MessageCircle size={48} className={styles.threadEmptyIcon} />
            <p className={styles.threadEmptyTitle}>Select a conversation</p>
            <p className={styles.threadEmptySub}>Choose a message from the list to read and reply</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={styles.chatHead}>
              <button className={styles.backBtn} onClick={backToList} aria-label="Back">
                <ArrowLeft size={20} />
              </button>
              <div className={styles.avatarLg}>
                {(() => { const o = otherParty(activeThread); return o ? initials(o.name, o.surname) : "?"; })()}
              </div>
              <div className={styles.chatHeadInfo}>
                {(() => {
                  const o = otherParty(activeThread);
                  return (
                    <>
                      <p className={styles.chatFrom}>{o ? `${o.name} ${o.surname}` : "Unknown"}</p>
                      {activeThread.subject && <p className={styles.chatSub}>{activeThread.subject}</p>}
                    </>
                  );
                })()}
              </div>
              <button className={styles.reportBtn} onClick={() => setReporting(true)} title="Report user">
                <Flag size={14} />
              </button>
            </div>

            {/* Booking context strip */}
            {activeThread.bookingInfo && <ItemCard info={activeThread.bookingInfo} />}

            {/* Messages */}
            <div className={styles.threadMessages}>
              {msgsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={`${styles.skeletonBubble}${i % 2 === 1 ? " " + styles.skeletonBubbleRight : ""}`} />
                ))
              ) : messages.length === 0 ? (
                <p className={styles.noMsgs}>No messages yet. Say hello!</p>
              ) : (
                messages.map((m) => {
                  const mine = m.senderId === myId;
                  return (
                    <div key={m.id} className={`${styles.bubbleWrap}${mine ? " " + styles.bubbleWrapMine : ""}`}>
                      <div className={`${styles.bubble}${mine ? " " + styles.bubbleMine : ""}`}>
                        {m.body}
                      </div>
                      <span className={styles.bubbleTime}>{relativeTime(m.createdAt)}</span>
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
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                disabled={sending}
              />
              <button className={styles.sendBtn} disabled={!reply.trim() || sending} onClick={handleSend}>
                {sending ? "…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>

      {reporting && activeThread && (
        <ReportModal thread={activeThread} myId={myId} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
