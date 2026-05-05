"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { FileText, ArrowLeft, CheckCircle, Clock, Camera, X } from "lucide-react";
import styles from "../contract.module.css";
import type { BookingWithDetails } from "@/lib/types";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export default function CancelReturnPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmingReturn, setConfirmingReturn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rec #2: Return photos — borrower uploads before submitting; owner sees them before confirming
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [ownerConditionOk, setOwnerConditionOk] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setReturnPhotos(prev => [...prev, json.data.url]);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  useEffect(() => {
    fetch(`/api/bookings/${id}`)
      .then(r => r.json())
      .then(j => {
        setBooking(j.data ?? null);
        if (j.data?.cancelReturnRequested) setSubmitted(true);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmitReturn() {
    if (returnPhotos.length === 0) {
      setError("Please upload at least one photo of the returned item before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Save return photos as a rental update before requesting cancellation
      await fetch(`/api/bookings/${id}/rental-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Item condition at return — documented by borrower.",
          photos: returnPhotos,
        }),
      });
      const res = await fetch(`/api/bookings/${id}/request-cancel-return`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to submit");
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmReturn(confirmed: boolean) {
    setConfirmingReturn(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/confirm-return-cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      router.push("/dashboard/bookings");
    } catch (e: any) {
      setError(e.message);
      setConfirmingReturn(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!booking) return <div className={styles.loading}>Booking not found.</div>;

  const isBorrower = session?.user?.id === booking.borrowerId;
  const isOwner = session?.user?.id === booking.listing.owner.id;

  if (!isBorrower && !isOwner) return <div className={styles.loading}>Access denied.</div>;

  // Owner view: confirm or deny the return
  if (isOwner) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <button className={styles.back} onClick={() => router.back()}>
            <ArrowLeft size={15} /> Back to bookings
          </button>

          <div className={styles.header}>
            <p className={styles.eyebrow}>Action Required — Owner</p>
            <h1 className={styles.title}>Confirm Item Return</h1>
            <div className={styles.bookingMeta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Item</span>
                <span className={styles.metaValue}>{booking.listing.title}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Borrower</span>
                <span className={styles.metaValue}>{booking.borrower.name} {booking.borrower.surname}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Period</span>
                <span className={styles.metaValue}>{fmt(booking.startDate)} – {fmt(booking.endDate)}</span>
              </div>
            </div>
          </div>

          <div className={styles.warningBanner}>
            <Clock size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>{booking.borrower.name} {booking.borrower.surname}</strong> has indicated that
              they have returned "<strong>{booking.listing.title}</strong>" and is requesting to cancel
              the booking. Please confirm whether you have received the item.
            </span>
          </div>

          <div className={styles.signatureCard}>
            <p className={styles.signatureTitle}>Have you received the item back?</p>
            <p className={styles.contractText} style={{ fontSize: "13px", color: "var(--text-3)" }}>
              The borrower has submitted return photos. Review them and confirm whether the item has been
              returned in acceptable condition.
            </p>

            {/* Rec #2: Show borrower's return photos to owner */}
            {booking.rentalUpdates && booking.rentalUpdates.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: 8 }}>📷 Return photos submitted by borrower</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {booking.rentalUpdates
                    .filter(u => (u as any).message?.includes("condition at return"))
                    .flatMap((u: any) => u.photos)
                    .map((url: string, i: number) => (
                      <img key={i} src={url} alt="" style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border, #ddd)" }} />
                    ))
                  }
                </div>
              </div>
            )}

            {/* Rec #2: Owner must acknowledge condition before confirming */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: "0.82rem", marginBottom: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                style={{ marginTop: 2 }}
                checked={ownerConditionOk}
                onChange={e => setOwnerConditionOk(e.target.checked)}
              />
              <span>I confirm I have inspected the returned item. If there is damage beyond normal wear and tear, I will open a dispute within 48 hours.</span>
            </label>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <div className={styles.btnRow}>
              <button
                className={styles.btnSign}
                disabled={confirmingReturn || !ownerConditionOk}
                onClick={() => handleConfirmReturn(true)}
              >
                {confirmingReturn ? "Processing…" : "Yes, I Received the Item"}
              </button>
              <button
                className={styles.btnDanger}
                disabled={confirmingReturn}
                onClick={() => handleConfirmReturn(false)}
              >
                Item Not Returned
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Borrower view: sign the return declaration
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back to bookings
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Cancellation Request</p>
          <h1 className={styles.title}>Return Declaration</h1>
          <div className={styles.bookingMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Item</span>
              <span className={styles.metaValue}>{booking.listing.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Owner</span>
              <span className={styles.metaValue}>{booking.listing.owner.name} {booking.listing.owner.surname}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Period</span>
              <span className={styles.metaValue}>{fmt(booking.startDate)} – {fmt(booking.endDate)}</span>
            </div>
          </div>
        </div>

        <div className={styles.contractCard}>
          <div className={styles.contractHeader}>
            <FileText size={16} />
            <span className={styles.contractHeaderTitle}>Return Declaration & Cancellation Request</span>
          </div>
          <div className={styles.contractBody}>
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>Important</p>
              <p className={styles.contractText}>
                Since this booking is currently active, cancellation requires confirmation from the Owner
                that the item has been returned. Once you sign this declaration, the Owner will be notified
                and must confirm receipt before the booking is cancelled.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>1. Declaration of Return</p>
              <p className={styles.contractText}>
                By signing below, I, <strong>{booking.borrower.name} {booking.borrower.surname}</strong>,
                declare that I have physically returned the item "<strong>{booking.listing.title}</strong>" to
                the Owner, <strong>{booking.listing.owner.name} {booking.listing.owner.surname}</strong>, in
                the same condition as it was received (subject to normal wear and tear).
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>2. What Happens Next</p>
              <p className={styles.contractText}>
                (a) The Owner will receive a notification and must sign off that they have received the item.
              </p>
              <p className={styles.contractText}>
                (b) Once the Owner confirms receipt, the booking will be cancelled and any applicable refund
                will be processed according to ToolShare's cancellation policy.
              </p>
              <p className={styles.contractText}>
                (c) If the Owner does not confirm receipt, you will be notified and the booking will remain
                active. You may contact the Owner directly via the messaging system.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>3. Acknowledgement</p>
              <p className={styles.contractText}>
                I understand that making a false declaration regarding the return of the item may result in
                account suspension and legal consequences under ToolShare's Terms of Service.
              </p>
            </div>
          </div>
        </div>

        {submitted ? (
          <div className={styles.successBanner}>
            <CheckCircle size={20} />
            Your return declaration has been submitted. The Owner has been notified and must confirm receipt
            before the booking is cancelled.
          </div>
        ) : (
          <div className={styles.signatureCard}>
            <p className={styles.signatureTitle}>Sign Return Declaration</p>

            {/* Rec #2: Return photo upload */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}>
                📷 Photo evidence of return *
              </p>
              <p style={{ fontSize: "0.76rem", color: "var(--text-3, #888)", marginBottom: 10 }}>
                Upload at least one photo showing the item returned to the owner. These photos will be
                visible to the owner and stored as part of the rental record.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {returnPhotos.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border, #ddd)" }} />
                    <button
                      onClick={() => setReturnPhotos(p => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPhoto}
                  style={{ width: 72, height: 72, borderRadius: 8, border: "2px dashed var(--border, #ccc)", background: "transparent", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem", color: "var(--text-3, #aaa)" }}
                >
                  {uploadingPhoto ? "…" : <><Camera size={18} /><span>Add photo</span></>}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </div>
              {returnPhotos.length === 0 && (
                <p style={{ fontSize: "0.74rem", color: "#f87171", marginTop: 6 }}>At least 1 photo required.</p>
              )}
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span className={styles.checkLabel}>
                I confirm that I have returned "<strong>{booking.listing.title}</strong>" to the Owner in
                acceptable condition, and I request that this booking be cancelled.
              </span>
            </label>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <div className={styles.btnRow}>
              <button
                className={styles.btnSign}
                disabled={!agreed || submitting || returnPhotos.length === 0}
                onClick={handleSubmitReturn}
              >
                {submitting ? "Submitting…" : "Sign & Request Cancellation"}
              </button>
              <button className={styles.btnSecondary} onClick={() => router.back()}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} onClick={() => router.push("/dashboard/bookings")}>
              Back to bookings
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
