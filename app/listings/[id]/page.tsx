"use client";

import { useState, useEffect, useMemo, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";
import ReviewsSection from "@/components/features/ReviewsSection";
import type { Listing } from "@/lib/types/listing";
import dynamic from "next/dynamic";
import DashboardLayout from "@/app/dashboard/layout";
import Spinner from "@/components/ui/Spinner";

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

  const totalAmount = useMemo(() => rentalTotal, [rentalTotal]);

  useEffect(() => {
    fetch(`/api/listings/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setListing(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

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
                <label className={styles.label} htmlFor="notes">Message to owner (optional)</label>
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
                  {listing.depositAmount && (
                    <>
                      <div className={styles.summaryDivider} />
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Rental cost</span>
                        <span className={styles.summaryValue}>{fmt(rentalTotal)}</span>
                      </div>
                      <div className={styles.summaryRow}>
                        <span className={styles.summaryLabel}>Refundable deposit</span>
                        <span className={styles.summaryValue}>{fmt(listing.depositAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryTotal}>
                    <span>Total due</span>
                    <span className={styles.summaryTotalValue}>{fmt(totalAmount)}</span>
                  </div>
                </div>
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
                  ? `Book · ${fmt(totalAmount)}`
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
    </DashboardLayout>
  );
}
