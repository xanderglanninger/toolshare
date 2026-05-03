"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Monitor, Wrench, Tent, Car, Shirt, Sofa, Music, BookOpen,
  Gamepad2, Camera, PartyPopper, Package, ShoppingCart, Search, Calendar, Check,
} from "lucide-react";
import styles from "./Bookings.module.css";
import ReviewModal from "./ReviewModal";
import type { BookingWithDetails, BookingStatus } from "@/lib/types";

const CATEGORY_ICONS: Record<string, React.ReactElement> = {
  ELECTRONICS:          <Monitor size={28} />,
  TOOLS_EQUIPMENT:      <Wrench size={28} />,
  SPORTS_OUTDOORS:      <Tent size={28} />,
  VEHICLES:             <Car size={28} />,
  CLOTHING_ACCESSORIES: <Shirt size={28} />,
  FURNITURE_HOME:       <Sofa size={28} />,
  MUSICAL_INSTRUMENTS:  <Music size={28} />,
  BOOKS_MEDIA:          <BookOpen size={28} />,
  GAMES_TOYS:           <Gamepad2 size={28} />,
  CAMERAS_PHOTOGRAPHY:  <Camera size={28} />,
  PARTY_EVENTS:         <PartyPopper size={28} />,
  OTHER:                <Package size={28} />,
};

type TabId = "all" | "pending" | "confirmed" | "active" | "done";
type RoleTab = "borrowed" | "lent";

const STATUS_TABS: { id: TabId; label: string }[] = [
  { id: "all",       label: "All"       },
  { id: "pending",   label: "Pending"   },
  { id: "confirmed", label: "Confirmed" },
  { id: "active",    label: "Active"    },
  { id: "done",      label: "Closed"    },
];

function matchesTab(tab: TabId, status: BookingStatus): boolean {
  if (tab === "all")       return true;
  if (tab === "pending")   return status === "PENDING";
  if (tab === "confirmed") return status === "CONFIRMED";
  if (tab === "active")    return status === "ACTIVE";
  if (tab === "done")      return status === "COMPLETED" || status === "CANCELLED";
  return false;
}

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDateRange(start: Date | string, end: Date | string) {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${new Date(start).toLocaleDateString("en-ZA", opts)} – ${new Date(end).toLocaleDateString("en-ZA", opts)}`;
}

function daysBetween(start: Date | string, end: Date | string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / 86_400_000));
}

const STATUS_META: Record<BookingStatus, { label: string; cls: string }> = {
  PENDING:   { label: "Pending",   cls: "badgePending"   },
  CONFIRMED: { label: "Confirmed", cls: "badgeConfirmed" },
  ACTIVE:    { label: "Active",    cls: "badgeActive"    },
  COMPLETED: { label: "Completed", cls: "badgeDone"      },
  CANCELLED: { label: "Cancelled", cls: "badgeCancelled" },
};

function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, cls } = STATUS_META[status] ?? STATUS_META.PENDING;
  return <span className={`${styles.badge} ${styles[cls as keyof typeof styles]}`}>{label}</span>;
}

function Avatar({ name, surname }: { name: string; surname: string }) {
  return (
    <div className={styles.avatar}>
      {(name?.[0] ?? "").toUpperCase()}{(surname?.[0] ?? "").toUpperCase()}
    </div>
  );
}

const ESCROW_LABELS: Record<string, string> = {
  HELD: "Funds held in escrow",
  DISPUTED: "Funds frozen — dispute open",
  RELEASED: "Funds released to owner",
  REFUNDED: "Funds refunded",
  PARTIAL: "Partial refund issued",
};

function EscrowBadge({ escrowStatus }: { escrowStatus?: string }) {
  if (!escrowStatus || escrowStatus === "RELEASED" || escrowStatus === "REFUNDED") return null;
  const label = ESCROW_LABELS[escrowStatus] ?? escrowStatus;
  const colors: Record<string, string> = {
    HELD: "#c8a84b", DISPUTED: "#e55", PARTIAL: "#ff9800",
  };
  return (
    <span style={{
      display: "inline-block", fontSize: "0.7rem", fontWeight: 600,
      padding: "2px 8px", borderRadius: 20,
      background: colors[escrowStatus] ?? "#888", color: "#fff",
      marginLeft: 6, verticalAlign: "middle",
    }}>
      {label}
    </span>
  );
}

export default function Bookings({ onOpenThread }: { onOpenThread?: (threadId: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [roleTab, setRoleTab]           = useState<RoleTab>("borrowed");
  const [statusTab, setStatusTab]       = useState<TabId>("all");
  const [bookings, setBookings]         = useState<BookingWithDetails[]>([]);
  const [loading, setLoading]           = useState(true);
  const [cancellingId, setCancellingId]         = useState<string | null>(null);
  const [confirmId, setConfirmId]               = useState<string | null>(null);
  const [confirmingReturnId, setConfirmingReturnId] = useState<string | null>(null);
  const [openingMsg, setOpeningMsg]             = useState<string | null>(null);
  const [reviewBooking, setReviewBooking]       = useState<BookingWithDetails | null>(null);
  const [cancelRefundInfo, setCancelRefundInfo] = useState<{ tier: string; refundAmount: number } | null>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    setLoading(true);
    const role = roleTab === "lent" ? "owner" : "borrower";
    fetch(`/api/bookings?role=${role}`)
      .then((r) => r.json())
      .then((json) => setBookings(json.data ?? []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [session, roleTab]);

  const filtered = useMemo(
    () => bookings.filter((b) => matchesTab(statusTab, b.status)),
    [bookings, statusTab],
  );

  const tabCount = (id: TabId) => bookings.filter((b) => matchesTab(id, b.status)).length;

  const pendingCount = bookings.filter((b) => b.status === "PENDING").length;
  const activeCount  = bookings.filter((b) => b.status === "ACTIVE").length;

  async function openMessage(b: BookingWithDetails) {
    if (!onOpenThread) return;
    setOpeningMsg(b.id);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: b.id }),
      });
      const json = await res.json();
      if (json.data?.threadId) onOpenThread(json.data.threadId);
    } finally {
      setOpeningMsg(null);
    }
  }

  async function cancelBooking(id: string) {
    setCancellingId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/cancel`, { method: "POST" });
      const json = await res.json();
      if (json.data) setCancelRefundInfo(json.data);
      setBookings((prev) =>
        prev.map((b) => b.id === id ? { ...b, status: "CANCELLED" as BookingStatus } : b),
      );
    } finally {
      setCancellingId(null);
      setConfirmId(null);
    }
  }

  async function confirmReturn(id: string) {
    setConfirmingReturnId(id);
    try {
      const res = await fetch(`/api/bookings/${id}/confirm-completion`, { method: "POST" });
      const json = await res.json();
      if (json.data?.bothConfirmed) {
        setBookings((prev) =>
          prev.map((b) => b.id === id ? { ...b, status: "COMPLETED" as BookingStatus } : b),
        );
      }
    } finally {
      setConfirmingReturnId(null);
    }
  }

  const totalAmount = useMemo(
    () => bookings.reduce((sum, b) => sum + b.totalAmount, 0),
    [bookings],
  );

  return (
    <div className={styles.page}>

      {/* ── Hero header ───────────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.heroLeft}>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>Manage</p>
            <h1 className={styles.pageTitle}>Bookings</h1>
          </div>

          {!loading && bookings.length > 0 && (
            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{bookings.length}</span>
                <span className={styles.statLabel}>Total</span>
              </div>
              {pendingCount > 0 && (
                <>
                  <div className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{pendingCount}</span>
                    <span className={styles.statLabel}>Pending</span>
                  </div>
                </>
              )}
              {activeCount > 0 && (
                <>
                  <div className={styles.statDivider} />
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{activeCount}</span>
                    <span className={styles.statLabel}>Active</span>
                  </div>
                </>
              )}
              <div className={styles.statDivider} />
              <div className={styles.stat}>
                <span className={styles.statValue}>{fmt(totalAmount)}</span>
                <span className={styles.statLabel}>{roleTab === "borrowed" ? "Spent" : "Earned"}</span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.roleSwitch}>
          {(["borrowed", "lent"] as RoleTab[]).map((r) => (
            <button
              key={r}
              className={`${styles.roleBtn}${roleTab === r ? " " + styles.roleBtnActive : ""}`}
              onClick={() => { setRoleTab(r); setStatusTab("all"); }}
            >
              {r === "borrowed" ? "Items I've Booked" : "My Items Lent Out"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Status filter ─────────────────────────────────────── */}
      <div className={styles.tabs}>
        {STATUS_TABS.map((t) => {
          const count = tabCount(t.id);
          return (
            <button
              key={t.id}
              className={`${styles.tab}${statusTab === t.id ? " " + styles.tabActive : ""}`}
              onClick={() => setStatusTab(t.id)}
            >
              {t.label}
              {count > 0 && (
                <span className={`${styles.tabCount}${statusTab === t.id ? " " + styles.tabCountActive : ""}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── List ──────────────────────────────────────────────── */}
      <div className={styles.list}>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              {statusTab === "all"
                ? roleTab === "borrowed" ? <ShoppingCart size={40} /> : <Package size={40} />
                : <Search size={40} />}
            </span>
            <p className={styles.emptyTitle}>
              {statusTab === "all"
                ? roleTab === "borrowed" ? "No bookings yet" : "Nothing lent out yet"
                : `No ${STATUS_TABS.find(t => t.id === statusTab)?.label.toLowerCase()} bookings`}
            </p>
            {statusTab === "all" && roleTab === "borrowed" && (
              <p className={styles.emptyHint}>Browse items to make your first booking.</p>
            )}
          </div>
        ) : (
          filtered.map((b) => {
            const icon         = CATEGORY_ICONS[b.listing.category] ?? <Package size={28} />;
            const isLent       = roleTab === "lent";
            const party        = isLent ? b.borrower : b.listing.owner;
            const days         = daysBetween(b.startDate, b.endDate);
            const isPaid       = b.payment?.status === "SUCCEEDED";
            const needsPay     = b.status === "PENDING" && !isLent && !isPaid;
            const canCancel    = (b.status === "PENDING" || b.status === "CONFIRMED") && !b.listerHandoverSigned;
            // Owner goes to handover contract page (replaces direct markAsActive)
            const canHandOver      = b.status === "CONFIRMED" && isLent && isPaid && !b.listerHandoverSigned;
            // Borrower goes to receipt contract page after owner has signed
            const canConfirmReceipt = b.status === "CONFIRMED" && !isLent && b.listerHandoverSigned && !b.borrowerReceiptSigned;
            // Both parties confirm return once the item is back (owner uses cancel-return flow instead when requested)
            const canConfirmReturn = b.status === "ACTIVE" && !(isLent && b.cancelReturnRequested);
            // Borrower requests cancel while active (navigates to cancel-return page)
            const canRequestCancelReturn = b.status === "ACTIVE" && !isLent && !b.cancelReturnRequested;
            // Owner sees cancel-return confirmation prompt
            const hasPendingCancelReturn = b.status === "ACTIVE" && isLent && b.cancelReturnRequested;
            const alreadyReviewed = session?.user?.id
              ? b.reviews.some((r) => r.reviewerId === session.user!.id)
              : false;
            const canReview    = b.status === "COMPLETED" && !alreadyReviewed;
            const escrowStatus = (b.payment as any)?.escrowStatus as string | undefined;
            const thumb        = b.listing.images?.[0];
            const isConfirming = confirmId === b.id;

            return (
              <div
                key={b.id}
                className={`${styles.card}${isConfirming ? " " + styles.cardConfirm : ""}`}
              >
                <div className={styles.cardInner}>
                  {/* Thumbnail */}
                  <div className={styles.thumb}>
                    {thumb
                      ? <img src={thumb} alt="" className={styles.thumbImg} />
                      : <span className={styles.thumbIcon}>{icon}</span>}
                  </div>

                  {/* Main info */}
                  <div className={styles.info}>
                    <div className={styles.infoTop}>
                      <span className={`${styles.typeTag} ${isLent ? styles.typeOut : styles.typeIn}`}>
                        {isLent ? "Lent out" : "Borrowed"}
                      </span>
                      <StatusBadge status={b.status} />
                      <EscrowBadge escrowStatus={escrowStatus} />
                    </div>

                    <p className={styles.cardTitle}>{b.listing.title}</p>

                    <Link href={`/dashboard/lister/${party.id}`} className={styles.metaRow} style={{ textDecoration: "none" }}>
                      <Avatar name={party.name} surname={party.surname} />
                      <span className={`${styles.partyName} ${styles.partyNameLink}`}>{party.name} {party.surname}</span>
                    </Link>

                    <div className={styles.metaRow}>
                      <span className={styles.metaIcon}><Calendar size={13} /></span>
                      <span className={styles.metaText}>{formatDateRange(b.startDate, b.endDate)}</span>
                      <span className={styles.metaDot}>·</span>
                      <span className={styles.metaText}>{days} day{days !== 1 ? "s" : ""}</span>
                    </div>

                    {isPaid && b.payment?.paymentReference && (
                      <div className={styles.metaRow}>
                        <span className={styles.metaIcon}><Check size={13} /></span>
                        <span className={styles.paidRef}>{b.payment.paymentReference}</span>
                      </div>
                    )}
                  </div>

                  {/* Right column */}
                  <div className={styles.cardRight}>
                    <p className={styles.cardAmount}>{fmt(b.totalAmount)}</p>

                    {!isConfirming ? (
                      <div className={styles.actions}>
                        {needsPay && (
                          <button
                            className={styles.btnPay}
                            onClick={() => router.push(`/payment/${b.id}`)}
                          >
                            Pay now
                          </button>
                        )}
                        {isPaid && (
                          <button
                            className={styles.btnInvoice}
                            onClick={() => router.push(`/invoice/${b.id}`)}
                          >
                            Invoice
                          </button>
                        )}
                        {onOpenThread && (
                          <button
                            className={styles.btnMsg}
                            disabled={openingMsg === b.id}
                            onClick={() => openMessage(b)}
                          >
                            {openingMsg === b.id ? "…" : "Message"}
                          </button>
                        )}
                        {canReview && (
                          <button
                            className={styles.btnReview}
                            onClick={() => setReviewBooking(b)}
                          >
                            Review
                          </button>
                        )}
                        {canHandOver && (
                          <button
                            className={styles.btnMsg}
                            onClick={() => router.push(`/dashboard/bookings/${b.id}/handover-contract`)}
                          >
                            Hand Over Item
                          </button>
                        )}
                        {canConfirmReceipt && (
                          <button
                            className={styles.btnPay}
                            onClick={() => router.push(`/dashboard/bookings/${b.id}/receipt-contract`)}
                          >
                            Received Item
                          </button>
                        )}
                        {canConfirmReturn && (
                          <button
                            className={styles.btnMsg}
                            disabled={confirmingReturnId === b.id}
                            onClick={() => confirmReturn(b.id)}
                          >
                            {confirmingReturnId === b.id ? "…" : "Confirm Return"}
                          </button>
                        )}
                        {canRequestCancelReturn && (
                          <button
                            className={styles.btnCancel}
                            onClick={() => router.push(`/dashboard/bookings/${b.id}/cancel-return`)}
                          >
                            Cancel Booking
                          </button>
                        )}
                        {hasPendingCancelReturn && (
                          <button
                            className={styles.btnPay}
                            onClick={() => router.push(`/dashboard/bookings/${b.id}/cancel-return`)}
                          >
                            Confirm Return
                          </button>
                        )}
                        {canCancel && (
                          <button
                            className={styles.btnCancel}
                            onClick={() => setConfirmId(b.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.confirmBox}>
                        <p className={styles.confirmText}>Cancel this booking?</p>
                        {cancelRefundInfo ? (
                          <p style={{ fontSize: "0.78rem", color: "#666", margin: "0 0 6px" }}>
                            {cancelRefundInfo.tier === "FULL_REFUND" && `Full refund of ${fmt(cancelRefundInfo.refundAmount)} will be issued.`}
                            {cancelRefundInfo.tier === "HALF_REFUND" && `50% refund of ${fmt(cancelRefundInfo.refundAmount)} will be issued.`}
                            {cancelRefundInfo.tier === "NO_REFUND" && "No refund applies (less than 3 days before start)."}
                            {cancelRefundInfo.tier === "OWNER_CANCEL" && `Full refund of ${fmt(cancelRefundInfo.refundAmount)} will be issued.`}
                          </p>
                        ) : (
                          <p style={{ fontSize: "0.78rem", color: "#888", margin: "0 0 6px" }}>
                            Refund depends on how far in advance you cancel.
                          </p>
                        )}
                        <div className={styles.confirmBtns}>
                          <button
                            className={styles.btnConfirmYes}
                            disabled={cancellingId === b.id}
                            onClick={() => cancelBooking(b.id)}
                          >
                            {cancellingId === b.id ? "…" : "Yes, cancel"}
                          </button>
                          <button
                            className={styles.btnConfirmNo}
                            onClick={() => { setConfirmId(null); setCancelRefundInfo(null); }}
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {reviewBooking && session?.user?.id && (
        <ReviewModal
          booking={reviewBooking}
          currentUserId={session.user.id}
          onClose={() => setReviewBooking(null)}
          onSubmitted={(bookingId) => {
            const userId = session.user!.id!;
            setBookings((prev) =>
              prev.map((b) =>
                b.id === bookingId
                  ? { ...b, reviews: [...b.reviews, { reviewerId: userId }] }
                  : b,
              ),
            );
            setReviewBooking(null);
          }}
        />
      )}
    </div>
  );
}
