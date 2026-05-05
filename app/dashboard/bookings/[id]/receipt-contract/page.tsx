"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { FileText, ArrowLeft, CheckCircle, AlertCircle, ShieldCheck, Camera, X } from "lucide-react";
import styles from "../contract.module.css";
import type { BookingWithDetails } from "@/lib/types";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMoney(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReceiptContractPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rec #1: Receipt photos — borrower must upload ≥1 photo before signing
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
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
      setReceiptPhotos(prev => [...prev, json.data.url]);
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
        if (j.data?.borrowerReceiptSigned) setSigned(true);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSign() {
    if (receiptPhotos.length === 0) {
      setError("Please upload at least one photo of the item before signing.");
      return;
    }
    setSigning(true);
    setError(null);
    try {
      // Save receipt photos as a timestamped rental update (condition record at handover)
      await fetch(`/api/bookings/${id}/rental-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Item condition at handover — documented by borrower on receipt.",
          photos: receiptPhotos,
        }),
      });
      const res = await fetch(`/api/bookings/${id}/sign-receipt`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to sign");
      setSigned(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSigning(false);
    }
  }

  if (loading) return <div className={styles.loading}>Loading contract…</div>;
  if (!booking) return <div className={styles.loading}>Booking not found.</div>;

  const isBorrower = session?.user?.id === booking.borrowerId;
  if (!isBorrower) return <div className={styles.loading}>Access denied.</div>;

  const ownerNotSignedYet = !booking.listerHandoverSigned;
  const signedAt = booking.borrowerReceiptSignedAt
    ? new Date(booking.borrowerReceiptSignedAt).toLocaleString("en-ZA")
    : new Date().toLocaleString("en-ZA");

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back to bookings
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Step 2 of 2 — Borrower Signature</p>
          <h1 className={styles.title}>Item Receipt Acknowledgement</h1>
          <div className={styles.bookingMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Item</span>
              <span className={styles.metaValue}>{booking.listing.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Owner</span>
              <span className={styles.metaValue}>
                {booking.listing.owner.name} {booking.listing.owner.surname}
                {(booking.listing.owner as any).idVerificationStatus === "verified" && (
                  <span title="Identity verified by ToolShare" style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, color: "#22c55e", fontSize: "0.75rem", fontWeight: 600 }}>
                    <ShieldCheck size={13} /> ID Verified
                  </span>
                )}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Period</span>
              <span className={styles.metaValue}>{fmt(booking.startDate)} – {fmt(booking.endDate)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Total</span>
              <span className={styles.metaValue}>{fmtMoney(booking.totalAmount)}</span>
            </div>
          </div>
        </div>

        {ownerNotSignedYet && !signed && (
          <div className={styles.warningBanner}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              The owner has not yet signed the handover agreement. You will be able to confirm receipt
              once the owner has signed on their end.
            </span>
          </div>
        )}

        <div className={styles.contractCard}>
          <div className={styles.contractHeader}>
            <FileText size={16} />
            <span className={styles.contractHeaderTitle}>Item Receipt Acknowledgement</span>
          </div>
          <div className={styles.contractBody}>
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>1. Parties</p>
              <p className={styles.contractText}>
                This acknowledgement is made by <strong>{booking.borrower.name} {booking.borrower.surname}</strong> ("Borrower")
                confirming receipt of an item from <strong>{booking.listing.owner.name} {booking.listing.owner.surname}</strong> ("Owner")
                via the ToolShare platform.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>2. Item Received</p>
              <p className={styles.contractText}>
                The Borrower acknowledges receiving the following item in satisfactory condition:{" "}
                <strong>{booking.listing.title}</strong> (category: {booking.listing.category.replace(/_/g, " ")}).
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>3. Borrower's Obligations</p>
              <p className={styles.contractText}>
                By signing, the Borrower agrees to:
              </p>
              <p className={styles.contractText}>
                (a) Use the item solely for its intended purpose and within the rental period ending{" "}
                <strong>{fmt(booking.endDate)}</strong>.
              </p>
              <p className={styles.contractText}>
                (b) Return the item to the Owner in the same condition as received, subject to normal
                wear and tear, by the end of the rental period.
              </p>
              <p className={styles.contractText}>
                (c) Accept full liability for any loss, theft, or damage to the item beyond normal
                wear and tear occurring during the rental period.
              </p>
              <p className={styles.contractText}>
                (d) Not sublet, lend, or transfer the item to any third party without prior written
                consent from the Owner.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>4. Security Deposit</p>
              <p className={styles.contractText}>
                A security deposit of{" "}
                <strong>{booking.depositAmount ? fmtMoney(booking.depositAmount) : "N/A"}</strong> is held
                in escrow. It will be released to the Borrower within 48 hours of confirmed completion,
                provided no damage or dispute is reported by the Owner.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>5. Condition at Handover</p>
              <p className={styles.contractText}>
                The Borrower confirms that the item was inspected at the time of collection and is in
                acceptable condition unless a concern is raised via the ToolShare platform within 2 hours
                of signing this acknowledgement.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>6. Governing Terms</p>
              <p className={styles.contractText}>
                This acknowledgement is subject to ToolShare's Terms of Service and Rental Policy. Signing
                this document confirms that the rental period has commenced and funds will be released to
                the Owner upon completion of the rental.
              </p>
            </div>
          </div>
        </div>

        {signed ? (
          <div className={styles.successBanner}>
            <CheckCircle size={20} />
            You have confirmed receipt. The booking is now active. Enjoy your rental!
          </div>
        ) : (
          <div className={styles.signatureCard}>
            <p className={styles.signatureTitle}>Confirm Receipt & Sign</p>

            {/* Rec #1: Photo requirement before signing */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: 6 }}>
                📷 Document the item's condition at handover *
              </p>
              <p style={{ fontSize: "0.76rem", color: "var(--text-3, #888)", marginBottom: 10 }}>
                Upload at least one photo of the item as you received it. This protects you if a damage
                dispute arises later. Photos are timestamped and stored securely.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {receiptPhotos.map((url, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={url} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid var(--border, #ddd)" }} />
                    <button
                      onClick={() => setReceiptPhotos(p => p.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: -6, right: -6, background: "#ef4444", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={ownerNotSignedYet || uploadingPhoto}
                  style={{ width: 72, height: 72, borderRadius: 8, border: "2px dashed var(--border, #ccc)", background: "transparent", cursor: ownerNotSignedYet ? "not-allowed" : "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.7rem", color: "var(--text-3, #aaa)" }}
                >
                  {uploadingPhoto ? "…" : <><Camera size={18} /><span>Add photo</span></>}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={handlePhotoUpload} />
              </div>
              {receiptPhotos.length === 0 && (
                <p style={{ fontSize: "0.74rem", color: "#f87171", marginTop: 6 }}>At least 1 photo required before signing.</p>
              )}
            </div>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                disabled={ownerNotSignedYet}
              />
              <span className={styles.checkLabel}>
                I, <strong>{booking.borrower.name} {booking.borrower.surname}</strong>, confirm that
                I have physically received the item listed above, that it is in acceptable condition
                (or as documented in the pre-existing issues list), and that I agree to all the terms
                set out in this acknowledgement.
              </span>
            </label>

            <div className={styles.signRow}>
              <span className={styles.signLabel}>Borrower signature</span>
              <span className={styles.signTimestamp}>{signedAt}</span>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <div className={styles.btnRow}>
              <button
                className={styles.btnSign}
                disabled={!agreed || signing || ownerNotSignedYet || receiptPhotos.length === 0}
                onClick={handleSign}
              >
                {signing ? "Signing…" : "Sign & Confirm Receipt"}
              </button>
              <button className={styles.btnSecondary} onClick={() => router.back()}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {signed && (
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
