"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { FileText, ArrowLeft, CheckCircle, Clock } from "lucide-react";
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
    setSubmitting(true);
    setError(null);
    try {
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
              If you confirm receipt, the booking will be cancelled. If you have not received the item,
              select "Item Not Returned" — the borrower will be notified and the booking will remain active.
            </p>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <div className={styles.btnRow}>
              <button
                className={styles.btnSign}
                disabled={confirmingReturn}
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
                will be processed according to LendMe's cancellation policy.
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
                account suspension and legal consequences under LendMe's Terms of Service.
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
                disabled={!agreed || submitting}
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
