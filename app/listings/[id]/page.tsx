"use client";

import { useState, useEffect, useMemo, useCallback, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import ReviewsSection from "@/components/features/ReviewsSection";
import type { Listing } from "@/lib/types/listing";
import dynamic from "next/dynamic";
import DashboardLayout from "@/app/dashboard/layout";
import Spinner from "@/components/ui/Spinner";
import VerificationGateModal from "@/components/ui/VerificationGateModal";
import { calculatePlatformFee } from "@/lib/utils/platform-fee";

// ─── Availability types ────────────────────────────────────────────────────

type BookedRange = { startDate: string; endDate: string; cooldownEnd: string };
type Availability = { quantity: number; bookings: BookedRange[] };

const COOLDOWN_DAYS = 2;

function addDays(date: Date, n: number) {
  return new Date(date.getTime() + n * 86400000);
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

/** Count how many units are occupied on a given calendar day (including cooldown). */
function countOccupied(day: Date, bookings: BookedRange[]): number {
  return bookings.filter((b) => {
    const start = new Date(b.startDate);
    const coolEnd = new Date(b.cooldownEnd);
    return day >= start && day < coolEnd;
  }).length;
}

// ─── Calendar component ────────────────────────────────────────────────────

function AvailabilityCalendar({
  availability,
  onClose,
}: {
  availability: Availability;
  onClose: () => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay  = new Date(year, month, 1);
  const lastDay   = new Date(year, month + 1, 0);
  const startPad  = firstDay.getDay(); // 0=Sun

  const days: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(year, month, i + 1)),
  ];

  const monthLabel = new Intl.DateTimeFormat("en-ZA", { month: "long", year: "numeric" }).format(firstDay);

  return (
    <div className={styles.calOverlay} onClick={onClose}>
      <div className={styles.calModal} onClick={e => e.stopPropagation()}>
        <div className={styles.calHeader}>
          <button className={styles.calNav} onClick={prevMonth}>‹</button>
          <span className={styles.calMonth}>{monthLabel}</span>
          <button className={styles.calNav} onClick={nextMonth}>›</button>
          <button className={styles.calClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.calGrid}>
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} className={styles.calDow}>{d}</div>
          ))}
          {days.map((day, i) => {
            if (!day) return <div key={`pad-${i}`} />;
            const occupied = countOccupied(day, availability.bookings);
            const qty = availability.quantity;
            const isPast = day < today;

            // Determine if any booking is in its "active" window vs cooldown window
            const inActiveBooking = availability.bookings.some(b => {
              const start = new Date(b.startDate);
              const end   = new Date(b.endDate);
              return day >= start && day < end;
            });
            const inCooldown = !inActiveBooking && occupied > 0;

            let cls = styles.calDay;
            if (isPast) cls += " " + styles.calDayPast;
            else if (occupied >= qty) cls += " " + (inCooldown ? styles.calDayCooldown : styles.calDayFull);
            else if (occupied > 0)   cls += " " + styles.calDayPartial;
            else                     cls += " " + styles.calDayFree;

            return (
              <div key={dateKey(day)} className={cls}>
                <span className={styles.calDayNum}>{day.getDate()}</span>
                {!isPast && occupied > 0 && (
                  <span className={styles.calDayCount}>
                    {qty - occupied}/{qty}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className={styles.calLegend}>
          <span className={styles.calLegendItem}>
            <span className={`${styles.calLegendDot} ${styles.calDotFree}`} /> Available
          </span>
          <span className={styles.calLegendItem}>
            <span className={`${styles.calLegendDot} ${styles.calDotPartial}`} /> Partially booked
          </span>
          <span className={styles.calLegendItem}>
            <span className={`${styles.calLegendDot} ${styles.calDotFull}`} /> Fully booked
          </span>
          <span className={styles.calLegendItem}>
            <span className={`${styles.calLegendDot} ${styles.calDotCooldown}`} /> Handover cooldown
          </span>
        </div>
      </div>
    </div>
  );
}

const ApproxMap = dynamic(() => import("@/components/ui/ApproxMap"), { ssr: false });

const CATEGORY_ICONS: Record<string, string> = {
  ELECTRONICS: "💻", TOOLS_EQUIPMENT: "🔧", SPORTS_OUTDOORS: "⛺",
  VEHICLES: "🚗", CLOTHING_ACCESSORIES: "👗", FURNITURE_HOME: "🛋️",
  MUSICAL_INSTRUMENTS: "🎸", BOOKS_MEDIA: "📚", GAMES_TOYS: "🎮",
  CAMERAS_PHOTOGRAPHY: "📷", PARTY_EVENTS: "🎉", OTHER: "📦",
};

const CATEGORY_LABELS: Record<string, string> = {
  ELECTRONICS: "Electronics", TOOLS_EQUIPMENT: "Tools & Equipment",
  SPORTS_OUTDOORS: "Sports & Outdoors", VEHICLES: "Vehicles",
  CLOTHING_ACCESSORIES: "Clothing & Accessories", FURNITURE_HOME: "Furniture & Home",
  MUSICAL_INSTRUMENTS: "Musical Instruments", BOOKS_MEDIA: "Books & Media",
  GAMES_TOYS: "Games & Toys", CAMERAS_PHOTOGRAPHY: "Cameras & Photography",
  PARTY_EVENTS: "Party & Events", OTHER: "Other",
};

function fmt(amount: number) {
  return `R ${amount.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toDateInputValue(d: Date) {
  return d.toISOString().split("T")[0];
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export default function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const { data: session } = useSession();
  const router = useRouter();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [imgIdx, setImgIdx] = useState(0);

  // Booking form state
  const today = toDateInputValue(new Date());
  const tomorrow = toDateInputValue(new Date(Date.now() + 86400000));

  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate]     = useState(tomorrow);
  const [notes, setNotes]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [messaging, setMessaging] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Price calculation
  const days = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return daysBetween(new Date(startDate), new Date(endDate));
  }, [startDate, endDate]);

  const rentalTotal = useMemo(() => {
    if (!listing || days <= 0) return 0;
    if (days >= 28 && listing.pricePerMonth) return listing.pricePerMonth * Math.ceil(days / 30);
    if (days >= 7  && listing.pricePerWeek)  return listing.pricePerWeek  * Math.ceil(days / 7);
    return listing.pricePerDay * days;
  }, [listing, days]);

  const { feePercent, feeAmount } = useMemo(() => {
    if (!listing || days <= 0) return { feePercent: 5, feeAmount: 0 };
    return calculatePlatformFee(listing.pricePerDay, days, rentalTotal);
  }, [listing, days, rentalTotal]);

  const totalAmount = useMemo(() => rentalTotal + feeAmount, [rentalTotal, feeAmount]);

  const unitsAvailable = useMemo(() => {
    if (!availability || !startDate || !endDate) return null;
    const selStart = new Date(startDate);
    const selEnd   = new Date(endDate);
    if (selStart >= selEnd) return null;
    const occupied = availability.bookings.filter((b) => {
      const bStart     = new Date(b.startDate);
      const bCoolEnd   = new Date(b.cooldownEnd);
      const newCoolEnd = addDays(selEnd, COOLDOWN_DAYS);
      return selStart < bCoolEnd && newCoolEnd > bStart;
    }).length;
    return Math.max(0, availability.quantity - occupied);
  }, [availability, startDate, endDate]);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setListing(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    fetch(`/api/listings/${id}/availability`)
      .then((r) => r.json())
      .then((json) => { if (json.data) setAvailability(json.data); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/settings")
        .then((r) => r.json())
        .then((j) => setVerifyStatus(j.data?.idVerificationStatus ?? "unverified"))
        .catch(() => setVerifyStatus("unverified"));
    }
  }, [session]);

  async function handleMessage() {
    if (!session?.user) { router.push("/login"); return; }
    if (!listing) return;
    setMessaging(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start conversation");
      router.push(`/dashboard?tab=messages&threadId=${json.data.threadId}`);
    } catch {
      setMessaging(false);
    }
  }

  async function handleBook() {
    if (!session?.user) { router.push("/login"); return; }
    if (verifyStatus !== "verified") { setShowGate(true); return; }
    if (!listing || days <= 0) return;
    setSubmitting(true);
    setBookingError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId:    listing.id,
          startDate:    new Date(startDate).toISOString(),
          endDate:      new Date(endDate).toISOString(),
          totalAmount,
          depositAmount: listing.depositAmount,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Booking failed");
      router.push(`/payment/${json.data.id}`);
    } catch (err: any) {
      setBookingError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className={styles.loading}>Loading listing…</div>
      </DashboardLayout>
    );
  }

  if (notFound || !listing) {
    return (
      <DashboardLayout>
        <div className={styles.notFound}>
          <span style={{ fontSize: 40 }}>🔍</span>
          <p className={styles.notFoundTitle}>Listing not found</p>
          <button className={styles.backBtn} onClick={() => router.push("/dashboard")}>
            Browse other items
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const icon         = CATEGORY_ICONS[listing.category] ?? "📦";
  const catLabel     = CATEGORY_LABELS[listing.category] ?? listing.category;
  const ownerInitials = `${listing.owner.name?.[0] ?? ""}${listing.owner.surname?.[0] ?? ""}`.toUpperCase();
  const isOwn        = session?.user?.id === listing.ownerId;
  const canBook      = listing.isAvailable && !isOwn;

  return (
    <DashboardLayout>
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => router.back()}>← Back</button>

      <div className={styles.body}>
        {/* ── Left: listing info ── */}
        <div className={styles.left}>

          {/* Gallery */}
          <div className={styles.gallery}>
            {listing.images.length > 0 ? (
              <>
                <img
                  src={listing.images[imgIdx]}
                  alt={listing.title}
                  className={styles.mainImg}
                />
                {listing.images.length > 1 && (
                  <div className={styles.imgThumbs}>
                    {listing.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt=""
                        className={`${styles.thumb}${i === imgIdx ? " " + styles.thumbActive : ""}`}
                        onClick={() => setImgIdx(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={styles.imgPlaceholder}>{icon}</div>
            )}
          </div>

          {/* Header */}
          <p className={styles.categoryTag}>{catLabel}</p>
          <h1 className={styles.title}>{listing.title}</h1>

          {/* Owner */}
          <Link href={`/dashboard/lister/${listing.owner.id}`} className={styles.ownerRow}>
            {listing.owner.image ? (
              <img src={listing.owner.image} alt="" className={styles.ownerAvatarImg} />
            ) : (
              <div className={styles.ownerAvatar}>{ownerInitials}</div>
            )}
            <div className={styles.ownerInfo}>
              <p className={styles.ownerName}>{listing.owner.name} {listing.owner.surname}</p>
              <p className={styles.ownerLabel}>View all listings →</p>
            </div>
          </Link>

          {/* Pricing */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Pricing</p>
            <div className={styles.priceGrid}>
              <div className={styles.priceCell}>
                <span className={styles.priceAmt}>{fmt(listing.pricePerDay)}</span>
                <span className={styles.priceUnit}>per day</span>
              </div>
              {listing.pricePerWeek && (
                <div className={styles.priceCell}>
                  <span className={styles.priceAmt}>{fmt(listing.pricePerWeek)}</span>
                  <span className={styles.priceUnit}>per week</span>
                </div>
              )}
              {listing.pricePerMonth && (
                <div className={styles.priceCell}>
                  <span className={styles.priceAmt}>{fmt(listing.pricePerMonth)}</span>
                  <span className={styles.priceUnit}>per month</span>
                </div>
              )}
            </div>
            {listing.depositAmount && (
              <p className={styles.depositNote}>
                Refundable deposit of {fmt(listing.depositAmount)} required
              </p>
            )}
          </div>

          {/* Description */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Description</p>
            <p className={styles.description}>{listing.description}</p>
          </div>

          {/* Reviews */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Reviews</p>
            <ReviewsSection listingId={id} />
          </div>

          {/* Location */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Location</p>
            <ApproxMap
              lat={listing.latitude}
              lng={listing.longitude}
              city={listing.city}
              province={listing.province}
            />
          </div>

          {/* Details */}
          <div className={styles.section}>
            <p className={styles.sectionTitle}>Details</p>
            <div className={styles.detailsList}>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>📍</span>
                <span>{listing.city}, {listing.province}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailIcon}>🏠</span>
                <span>{listing.address}{listing.postalCode ? `, ${listing.postalCode}` : ""}</span>
              </div>
              {listing.deliveryAvailable && (
                <div className={styles.detailRow}>
                  <span className={styles.detailIcon}>🚚</span>
                  <span>
                    Delivery available
                    {listing.deliveryRadius && ` within ${listing.deliveryRadius} km`}
                    {listing.deliveryFee ? ` · ${fmt(listing.deliveryFee)} fee` : " · free"}
                  </span>
                </div>
              )}
              {(listing.availableFrom || listing.availableTo) && (
                <div className={styles.detailRow}>
                  <span className={styles.detailIcon}>📅</span>
                  <span>
                    {listing.availableFrom
                      ? `From ${new Date(listing.availableFrom).toLocaleDateString()}`
                      : ""}
                    {listing.availableTo
                      ? ` until ${new Date(listing.availableTo).toLocaleDateString()}`
                      : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right: booking panel ── */}
        <aside className={styles.panel}>
          <p className={styles.panelTitle}>
            {listing.isAvailable ? "Book this item" : "Currently unavailable"}
          </p>

          {!isOwn && (
            <button
              className={styles.msgBtn}
              disabled={messaging}
              onClick={handleMessage}
            >
              {messaging && <Spinner />} {messaging ? "Opening chat…" : "✉ Message owner"}
            </button>
          )}

          {/* Availability summary + calendar button */}
          {availability && (
            <div className={styles.availRow}>
              <div className={styles.availBadge}>
                <span className={styles.availDot} />
                {availability.quantity === 1
                  ? unitsAvailable === 0
                    ? "Unavailable for selected dates"
                    : "1 unit available"
                  : unitsAvailable === null
                  ? `${availability.quantity} units total`
                  : unitsAvailable === 0
                  ? `All ${availability.quantity} units booked for those dates`
                  : `${unitsAvailable} of ${availability.quantity} available`}
              </div>
              <button className={styles.calBtn} onClick={() => setShowCalendar(true)}>
                📅 Check availability
              </button>
            </div>
          )}

          {!canBook ? (
            <div className={styles.unavailableBanner}>
              {isOwn
                ? "This is your own listing."
                : "This item is not available for booking right now."}
            </div>
          ) : (
            <>
              {/* Date range */}
              <div className={styles.fieldGroup}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="start">From</label>
                  <input
                    id="start"
                    type="date"
                    className={styles.input}
                    value={startDate}
                    min={today}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (e.target.value >= endDate) {
                        const next = new Date(e.target.value);
                        next.setDate(next.getDate() + 1);
                        setEndDate(toDateInputValue(next));
                      }
                    }}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="end">Until</label>
                  <input
                    id="end"
                    type="date"
                    className={styles.input}
                    value={endDate}
                    min={startDate || today}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div className={styles.fieldFull}>
                <label className={styles.label} htmlFor="notes" style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Message to owner (optional)</span>
                  <span style={{ fontWeight: 400, color: notes.length > 360 ? "#f87171" : "var(--text-3, #aaa)", fontSize: "0.75rem" }}>
                    {notes.length}/400
                  </span>
                </label>
                <textarea
                  id="notes"
                  className={styles.textarea}
                  placeholder="Any questions or special requests…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={400}
                />
              </div>

              {/* Price summary */}
              {days > 0 && (
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Duration</span>
                    <span className={styles.summaryValue}>{days} day{days !== 1 ? "s" : ""}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Rate</span>
                    <span className={styles.summaryValue}>
                      {days >= 28 && listing.pricePerMonth
                        ? `${fmt(listing.pricePerMonth)} / month`
                        : days >= 7 && listing.pricePerWeek
                        ? `${fmt(listing.pricePerWeek)} / week`
                        : `${fmt(listing.pricePerDay)} / day`}
                    </span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Rental cost</span>
                    <span className={styles.summaryValue}>{fmt(rentalTotal)}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      Service fee ({feePercent.toFixed(1)}%)
                    </span>
                    <span className={styles.summaryValue}>{fmt(feeAmount)}</span>
                  </div>
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryTotal}>
                    <span>Rental total</span>
                    <span className={styles.summaryTotalValue}>{fmt(rentalTotal + feeAmount)}</span>
                  </div>
                </div>
              )}

              {/* Rec #9: Deposit displayed separately so borrowers understand it's refundable */}
              {days > 0 && listing.depositAmount && (
                <div style={{
                  marginTop: 8,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "var(--surface-2, #f0f4ff)",
                  border: "1px solid var(--border, #dde3f0)",
                  fontSize: "0.82rem",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600 }}>
                    <span>🔒 Refundable deposit</span>
                    <span>{fmt(listing.depositAmount)}</span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "var(--text-3, #888)", fontSize: "0.76rem" }}>
                    Held in escrow. Returned within 48 hours of confirmed return — provided no damage is reported.
                  </p>
                </div>
              )}

              {/* Rec #5: Cancellation policy with exact tier dates */}
              {days > 0 && startDate && (
                <details style={{ marginTop: 10, fontSize: "0.8rem", color: "var(--text-3, #888)" }}>
                  <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text-2, #555)", listStyle: "none" }}>
                    📋 Cancellation policy
                  </summary>
                  <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                    {(() => {
                      const start = new Date(startDate);
                      const fullRefundBefore = new Date(start.getTime() - 7 * 86400000);
                      const halfRefundBefore = new Date(start.getTime() - 3 * 86400000);
                      const fmtDate = (d: Date) => d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
                      return (
                        <>
                          <div>✅ <strong>Full refund</strong> — cancel before {fmtDate(fullRefundBefore)}</div>
                          <div>⚠️ <strong>50% refund</strong> — cancel {fmtDate(fullRefundBefore)} to {fmtDate(halfRefundBefore)}</div>
                          <div>❌ <strong>No refund</strong> — cancel within 3 days of start</div>
                          <div style={{ marginTop: 4 }}>If the owner cancels, you always receive a full refund.</div>
                        </>
                      );
                    })()}
                  </div>
                </details>
              )}

              {bookingError && (
                <div className={styles.errorBox}>{bookingError}</div>
              )}

              <button
                className={styles.bookBtn}
                disabled={submitting || days <= 0}
                onClick={handleBook}
              >
                {submitting && <Spinner />}
                {submitting
                  ? "Creating booking…"
                  : days > 0
                  ? `Book · ${fmt(rentalTotal + feeAmount)}${listing.depositAmount ? ` + ${fmt(listing.depositAmount)} deposit` : ""}`
                  : "Select dates to book"}
              </button>

              <p className={styles.bookBtnNote}>
                You&apos;ll be taken to payment after booking.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>

    {showGate && verifyStatus && (
      <VerificationGateModal
        status={verifyStatus}
        onClose={() => setShowGate(false)}
        onSubmitted={() => { setVerifyStatus("pending"); setShowGate(false); }}
      />
    )}

    {showCalendar && availability && (
      <AvailabilityCalendar
        availability={availability}
        onClose={() => setShowCalendar(false)}
      />
    )}

    </DashboardLayout>
  );
}
