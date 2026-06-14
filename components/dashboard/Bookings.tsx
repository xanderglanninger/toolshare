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

function fmtDateShort(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
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

export default function Bookings({ onOpenThread }: { onOpenThread?: (threadId: string) => void }) {
  const { data: session } = useSession();
  const router = useRouter();

  const [roleTab, setRoleTab]           = useState<RoleTab>("borrowed");
  const [statusTab, setStatusTab]       = useState<TabId>("all");
  const [bookings, setBookings]         = useState<BookingWithDetails[]>([]);
  const [loading, setLoading]           = useState(true);
  const [cancellingId, setCancellingId]         = useState<string | null>(null);
  const [confirmId, setConfirmId]               = useState<string | null>(null);
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

  const totalAmount = useMemo(
    () => bookings.reduce((sum, b) => sum + b.totalAmount, 0),
    [bookings],
  );

  return (
    <div className={styles.page}>

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
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

      {/* ── Status filter ─────────────────────────────────────────── */}
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

      {/* ── List ──────────────────────────────────────────────────── */}
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
            const canOpenWizard = (b.status === "CONFIRMED" && isPaid) || b.status === "ACTIVE";
            const canRequestCancelReturn = b.status === "ACTIVE" && !isLent && !b.cancelReturnRequested;
            const hasPendingCancelReturn = b.status === "ACTIVE" && isLent && b.cancelReturnRequested;
            const alreadyReviewed = session?.user?.id
              ? b.reviews.some((r) => r.reviewerId === session.user!.id)
              : false;
            const canReview    = b.status === "COMPLETED" && !alreadyReviewed;
            const escrowStatus = (b.payment as any)?.escrowStatus as string | undefined;
            const thumb        = b.listing.images?.[0];
            const isConfirming = confirmId === b.id;

            const needsAction: string | null = (() => {
              if (isLent) {
                if (b.status === "CONFIRMED" && isPaid && !b.listerInitiatedHandover) return "Start handover";
                if (b.status === "CONFIRMED" && b.borrowerIssuesSubmitted && !b.listerConfirmedIssues) return "Review issues";
                if (b.status === "CONFIRMED" && b.listerConfirmedIssues && !b.listerHandoverSigned) return "Sign handover";
                if (b.status === "ACTIVE" && b.cancelReturnRequested && !b.ownerConfirmed) return "Confirm return";
                if (b.status === "ACTIVE" && b.borrowerConfirmed && !b.ownerConfirmed) return "Confirm return";
              } else {
                if (b.status === "PENDING" && !isPaid) return "Pay now";
                if (b.status === "CONFIRMED" && b.listerInitiatedHandover && !b.borrowerIssuesSubmitted) return "Inspect item";
                if (b.status === "CONFIRMED" && b.listerConfirmedIssues && !b.borrowerReceiptSigned) return "Sign receipt";
                if (b.status === "ACTIVE" && b.ownerConfirmed && !b.borrowerConfirmed) return "Confirm return";
              }
              return null;
            })();

            const primaryAction = (() => {
              if (needsPay) return (
                <button className={styles.btnPrimary} onClick={() => router.push(`/payment/${b.id}`)}>Pay now</button>
              );
              if (canOpenWizard) return (
                <button className={styles.btnPrimary} onClick={() => router.push(`/dashboard/bookings/${b.id}/wizard`)}>
                  {b.status === "ACTIVE"
                    ? (isLent ? "Confirm Return" : "Return Item")
                    : (isLent ? "Start Handover" : "View Handover")}
                </button>
              );
              if (hasPendingCancelReturn) return (
                <button className={styles.btnPrimary} onClick={() => router.push(`/dashboard/bookings/${b.id}/cancel-return`)}>Confirm Return</button>
              );
              if (canRequestCancelReturn) return (
                <button className={styles.btnDanger} onClick={() => router.push(`/dashboard/bookings/${b.id}/cancel-return`)}>Cancel</button>
              );
              if (canReview) return (
                <button className={styles.btnReview} onClick={() => setReviewBooking(b)}>Leave Review</button>
              );
              if (isPaid) return (
                <button className={styles.btnSecondary} onClick={() => router.push(`/invoice/${b.id}`)}>Invoice</button>
              );
              if (canCancel) return (
                <button className={styles.btnDanger} onClick={() => setConfirmId(b.id)}>Cancel</button>
              );
              return null;
            })();

            return (
              <div
                key={b.id}
                className={`${styles.card}${isConfirming ? " " + styles.cardConfirm : ""}${needsAction ? " " + styles.cardUrgent : ""}`}
              >
                {/* Urgent action banner */}
                {needsAction && !isConfirming && (
                  <div className={styles.actionBanner}>
                    <span className={styles.actionBannerDot} />
                    {needsAction}
                  </div>
                )}

                {/* Card body */}
                <div className={styles.cardBody}>
                  {/* Thumbnail */}
                  <div className={styles.thumb}>
                    {thumb
                      ? <img src={thumb} alt="" className={styles.thumbImg} />
                      : <span className={styles.thumbIcon}>{icon}</span>}
                  </div>

                  {/* Info */}
                  <div className={styles.info}>
                    <div className={styles.infoTop}>
                      <StatusBadge status={b.status} />
                      <span className={`${styles.typeTag} ${isLent ? styles.typeOut : styles.typeIn}`}>
                        {isLent ? "Lent out" : "Borrowed"}
                      </span>
                    </div>

                    <p className={styles.cardTitle}>{b.listing.title}</p>

                    <Link href={`/dashboard/lister/${party.id}`} className={styles.metaRow} style={{ textDecoration: "none" }}>
                      <Avatar name={party.name} surname={party.surname} />
                      <span className={styles.partyName}>{party.name} {party.surname}</span>
                    </Link>

                    <div className={styles.metaRow}>
                      <Calendar size={12} className={styles.metaIcon} />
                      <span className={styles.metaText}>
                        {fmtDateShort(b.startDate)} – {fmtDateShort(b.endDate)}
                        <span className={styles.metaDot}> · </span>
                        {days}d
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card footer: amount + actions */}
                {!isConfirming ? (
                  <div className={styles.cardFoot}>
                    <p className={styles.cardAmount}>{fmt(b.totalAmount)}</p>
                    <div className={styles.footActions}>
                      {onOpenThread && (
                        <button
                          className={styles.btnSecondary}
                          disabled={openingMsg === b.id}
                          onClick={() => openMessage(b)}
                        >
                          {openingMsg === b.id ? "…" : "Message"}
                        </button>
                      )}
                      {primaryAction}
                    </div>
                  </div>
                ) : (
                  <div className={styles.confirmBox}>
                    <p className={styles.confirmText}>Cancel this booking?</p>
                    {cancelRefundInfo ? (
                      <p className={styles.confirmSub}>
                        {cancelRefundInfo.tier === "FULL_REFUND" && `Full refund of ${fmt(cancelRefundInfo.refundAmount)}.`}
                        {cancelRefundInfo.tier === "HALF_REFUND" && `50% refund of ${fmt(cancelRefundInfo.refundAmount)}.`}
                        {cancelRefundInfo.tier === "NO_REFUND" && "No refund (less than 3 days notice)."}
                        {cancelRefundInfo.tier === "OWNER_CANCEL" && `Full refund of ${fmt(cancelRefundInfo.refundAmount)}.`}
                      </p>
                    ) : (
                      <p className={styles.confirmSub}>Refund depends on how far in advance you cancel.</p>
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
