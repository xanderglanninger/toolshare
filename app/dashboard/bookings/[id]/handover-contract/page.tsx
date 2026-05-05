"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { FileText, ArrowLeft, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import styles from "../contract.module.css";
import issueStyles from "./handover.module.css";
import type { BookingWithDetails, BookingIssue } from "@/lib/types";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMoney(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function HandoverContractPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [issues, setIssues] = useState<BookingIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [confirmedIssues, setConfirmedIssues] = useState<Set<string>>(new Set());
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}`).then(r => r.json()),
      fetch(`/api/bookings/${id}/issues`).then(r => r.json()),
    ])
      .then(([bookingRes, issuesRes]) => {
        setBooking(bookingRes.data ?? null);
        if (bookingRes.data?.listerHandoverSigned) setSigned(true);
        setIssues(issuesRes.data ?? []);
      })
      .catch(() => setBooking(null))
      .finally(() => setLoading(false));
  }, [id]);

  function toggleIssue(issueId: string) {
    setConfirmedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  const allIssuesConfirmed = issues.length === 0 || issues.every(i => confirmedIssues.has(i.id));
  const canSign = agreed && allIssuesConfirmed;

  async function handleSign() {
    setSigning(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}/sign-handover`, { method: "POST" });
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

  const isOwner = session?.user?.id === booking.listing.owner.id;
  if (!isOwner) return <div className={styles.loading}>Access denied.</div>;

  const signedAt = booking.listerHandoverSignedAt
    ? new Date(booking.listerHandoverSignedAt).toLocaleString("en-ZA")
    : new Date().toLocaleString("en-ZA");

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back to bookings
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Step 1 of 2 — Owner Signature</p>
          <h1 className={styles.title}>Item Handover Agreement</h1>
          <div className={styles.bookingMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Item</span>
              <span className={styles.metaValue}>{booking.listing.title}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Borrower</span>
              <span className={styles.metaValue}>
                {booking.borrower.name} {booking.borrower.surname}
                {(booking.borrower as any).idVerificationStatus === "verified" && (
                  <span title="Identity verified" style={{ display: "inline-flex", alignItems: "center", gap: 3, marginLeft: 6, color: "#22c55e", fontSize: "0.75rem", fontWeight: 600 }}>
                    <ShieldCheck size={13} /> Verified
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

        {/* Pre-existing issues section */}
        {issues.length > 0 ? (
          <div className={issueStyles.issuesSection}>
            <div className={issueStyles.issuesSectionHeader}>
              <AlertTriangle size={16} className={issueStyles.issuesIcon} />
              <div>
                <p className={issueStyles.issuesSectionTitle}>
                  {issues.length} Pre-existing Issue{issues.length !== 1 ? "s" : ""} Logged by Borrower
                </p>
                <p className={issueStyles.issuesSectionSub}>
                  Review each issue and check the box to confirm you have seen it before handing over the item.
                </p>
              </div>
            </div>
            <div className={issueStyles.issuesList}>
              {issues.map((issue, i) => (
                <label key={issue.id} className={`${issueStyles.issueRow} ${confirmedIssues.has(issue.id) ? issueStyles.issueRowChecked : ""}`}>
                  <input
                    type="checkbox"
                    className={issueStyles.issueCheckbox}
                    checked={confirmedIssues.has(issue.id)}
                    onChange={() => !signed && toggleIssue(issue.id)}
                    disabled={signed}
                  />
                  <div className={issueStyles.issueContent}>
                    <span className={issueStyles.issueLabel}>Issue {i + 1}</span>
                    <p className={issueStyles.issueDescription}>{issue.description}</p>
                    {issue.photos.length > 0 && (
                      <div className={issueStyles.photoGrid}>
                        {issue.photos.map((url, j) => (
                          <img key={j} src={url} alt={`Issue ${i + 1} photo ${j + 1}`} className={issueStyles.photo} />
                        ))}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {!signed && !allIssuesConfirmed && (
              <p className={issueStyles.issuesWarning}>
                Please confirm all issues above before you can sign the handover agreement.
              </p>
            )}
          </div>
        ) : (
          <div className={issueStyles.noIssuesBanner}>
            <CheckCircle size={16} />
            The borrower has not logged any pre-existing issues.
          </div>
        )}

        <div className={styles.contractCard}>
          <div className={styles.contractHeader}>
            <FileText size={16} />
            <span className={styles.contractHeaderTitle}>Item Handover Agreement</span>
          </div>
          <div className={styles.contractBody}>
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>1. Parties</p>
              <p className={styles.contractText}>
                This agreement is between <strong>{booking.listing.owner.name} {booking.listing.owner.surname}</strong> ("Owner")
                and <strong>{booking.borrower.name} {booking.borrower.surname}</strong> ("Borrower")
                for the rental of the item described below via the ToolShare platform.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>2. Item Description</p>
              <p className={styles.contractText}>
                The item being handed over is: <strong>{booking.listing.title}</strong>, listed under the category{" "}
                <strong>{booking.listing.category.replace(/_/g, " ")}</strong>.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>3. Rental Period</p>
              <p className={styles.contractText}>
                The rental period runs from <strong>{fmt(booking.startDate)}</strong> to{" "}
                <strong>{fmt(booking.endDate)}</strong>. The Borrower agrees to return the item by the end date in
                the same condition it was received, subject to normal wear and tear.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>4. Pre-existing Condition</p>
              <p className={styles.contractText}>
                {issues.length > 0
                  ? `Both parties acknowledge that ${issues.length} pre-existing issue${issues.length !== 1 ? "s have" : " has"} been documented above prior to handover. The Borrower shall not be held responsible for these specific documented issues upon return.`
                  : "No pre-existing issues have been documented. The Borrower accepts the item in its current condition."}
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>5. Owner's Representations</p>
              <p className={styles.contractText}>
                By signing, the Owner confirms that:
              </p>
              <p className={styles.contractText}>
                (a) The item is in good working order and fit for its intended purpose at the time of handover.
              </p>
              <p className={styles.contractText}>
                (b) The Owner has the right to rent this item and it is free from any encumbrances that would
                prevent the Borrower from using it during the rental period.
              </p>
              <p className={styles.contractText}>
                (c) The Owner will physically hand the item over to the Borrower and allow the Borrower to sign
                the receipt confirmation within the ToolShare platform.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>6. Liability & Damage</p>
              <p className={styles.contractText}>
                The Borrower is responsible for any loss, theft, or damage to the item beyond normal wear and
                tear during the rental period. A security deposit of{" "}
                <strong>{booking.depositAmount ? fmtMoney(booking.depositAmount) : "N/A"}</strong> is held in
                escrow and will be returned within 48 hours of confirmed completion, subject to any dispute raised
                via the ToolShare platform.
              </p>
            </div>
            <hr className={styles.contractDivider} />
            <div className={styles.contractSection}>
              <p className={styles.contractSectionTitle}>7. Governing Terms</p>
              <p className={styles.contractText}>
                This agreement is subject to ToolShare's Terms of Service and Rental Policy. Any disputes will first
                be mediated through the ToolShare disputes process before any other forum.
              </p>
            </div>
          </div>
        </div>

        {signed ? (
          <div className={styles.successBanner}>
            <CheckCircle size={20} />
            You have signed the handover agreement. The borrower will now be prompted to confirm receipt.
          </div>
        ) : (
          <div className={styles.signatureCard}>
            <p className={styles.signatureTitle}>Sign the Handover Agreement</p>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              <span className={styles.checkLabel}>
                I, <strong>{booking.listing.owner.name} {booking.listing.owner.surname}</strong>, confirm
                that I have read and understood this agreement, that I am physically handing over the item
                to the borrower, and that all the information above is accurate.
              </span>
            </label>

            <div className={styles.signRow}>
              <span className={styles.signLabel}>Owner signature</span>
              <span className={styles.signTimestamp}>{signedAt}</span>
            </div>

            {error && <p style={{ color: "#f87171", fontSize: "13px" }}>{error}</p>}

            <div className={styles.btnRow}>
              <button
                className={styles.btnSign}
                disabled={!canSign || signing}
                onClick={handleSign}
              >
                {signing ? "Signing…" : "Sign & Hand Over"}
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
