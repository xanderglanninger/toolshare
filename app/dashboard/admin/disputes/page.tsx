"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./disputes.module.css";

type EvidenceItem = {
  id: string;
  fileUrl: string;
  fileType: string;
  description: string | null;
  uploader: { id: string; name: string };
  createdAt: string;
};

type Dispute = {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  disputeType: string | null;
  adminDecision: string | null;
  adminNotes: string | null;
  refundPercent: number | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; name: string; surname: string; email: string; image: string | null };
  reported: { id: string; name: string; surname: string; email: string; image: string | null };
  booking: {
    id: string;
    totalAmount: number;
    depositAmount: number | null;
    startDate: string;
    endDate: string;
    status: string;
    listing: { title: string; images: string[] };
    payment: { amount: number; escrowStatus: string; depositStatus: string } | null;
  } | null;
  evidence: EvidenceItem[];
};

const REASON_LABELS: Record<string, string> = {
  NO_SHOW: "No Show",
  DAMAGED_EQUIPMENT: "Damaged Equipment",
  FRAUDULENT_LISTING: "Fraudulent Listing",
  INAPPROPRIATE_BEHAVIOR: "Inappropriate Behavior",
  PAYMENT_DISPUTE: "Payment Dispute",
  OTHER: "Other",
};

const ESCROW_COLORS: Record<string, string> = {
  HELD: "#c8a84b",
  DISPUTED: "#e55",
  RELEASED: "#4caf50",
  REFUNDED: "#2196f3",
  PARTIAL: "#ff9800",
};

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminDisputesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [decision, setDecision] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState("");
  const [refundPercent, setRefundPercent] = useState<number>(100);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/disputes");
      if (res.status === 403) { router.replace("/dashboard"); return; }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load disputes");
      setDisputes(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { if (status === "authenticated") load(); }, [status, load]);

  async function markReviewing(id: string) {
    await fetch(`/api/admin/disputes/${id}`, { method: "PATCH" });
    setDisputes((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: "REVIEWED" } : d))
    );
  }

  async function submitResolution(reportId: string) {
    if (!decision) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/disputes/${reportId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          adminNotes: adminNotes || undefined,
          refundPercent: decision === "PARTIAL_REFUND_BORROWER" ? refundPercent : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to resolve");
      setResolving(null);
      setDecision("");
      setAdminNotes("");
      setRefundPercent(100);
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className={styles.center}>Loading disputes…</div>;
  if (error) return <div className={styles.center} style={{ color: "#e55" }}>{error}</div>;

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Admin</p>
        <div className={styles.header}>
          <h1 className={styles.title}>Dispute Resolution</h1>
          <span className={styles.count}>{disputes.length} open</span>
        </div>
        <p className={styles.sub}>Review and resolve open disputes between renters and lenders.</p>
      </div>

      {disputes.length === 0 && (
        <div className={styles.empty}>No open disputes. All clear.</div>
      )}

      {disputes.map((d) => {
        const isExpanded = expanded === d.id;
        const isResolving = resolving === d.id;
        const escrowStatus = d.booking?.payment?.escrowStatus ?? "—";

        return (
          <div key={d.id} className={styles.card}>
            <div className={styles.cardHeader} onClick={() => setExpanded(isExpanded ? null : d.id)}>
              <div className={styles.cardLeft}>
                <span className={styles.reason}>{REASON_LABELS[d.reason] ?? d.reason}</span>
                <span className={styles.listing}>{d.booking?.listing.title ?? "—"}</span>
              </div>
              <div className={styles.cardMeta}>
                <span
                  className={styles.escrowBadge}
                  style={{ background: ESCROW_COLORS[escrowStatus] ?? "#666" }}
                >
                  {escrowStatus}
                </span>
                <span className={styles.statusBadge} data-status={d.status.toLowerCase()}>
                  {d.status}
                </span>
                <span className={styles.amount}>
                  {d.booking ? fmt(d.booking.totalAmount) : "—"}
                </span>
                <span className={styles.date}>{fmtDate(d.createdAt)}</span>
                <span className={styles.chevron}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {isExpanded && (
              <div className={styles.cardBody}>
                {/* Parties */}
                <div className={styles.parties}>
                  <div className={styles.party}>
                    <span className={styles.partyLabel}>Reporter (complainant)</span>
                    <span className={styles.partyName}>{d.reporter.name} {d.reporter.surname}</span>
                    <span className={styles.partyEmail}>{d.reporter.email}</span>
                  </div>
                  <div className={styles.partySep}>vs</div>
                  <div className={styles.party}>
                    <span className={styles.partyLabel}>Reported (respondent)</span>
                    <span className={styles.partyName}>{d.reported.name} {d.reported.surname}</span>
                    <span className={styles.partyEmail}>{d.reported.email}</span>
                  </div>
                </div>

                {/* Booking details */}
                {d.booking && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Booking Details</h3>
                    <div className={styles.grid2}>
                      <div>
                        <span className={styles.label}>Dates</span>
                        <span>{fmtDate(d.booking.startDate)} – {fmtDate(d.booking.endDate)}</span>
                      </div>
                      <div>
                        <span className={styles.label}>Rental amount</span>
                        <span>{fmt(d.booking.totalAmount)}</span>
                      </div>
                      {d.booking.depositAmount && (
                        <div>
                          <span className={styles.label}>Deposit</span>
                          <span>{fmt(d.booking.depositAmount)}</span>
                        </div>
                      )}
                      <div>
                        <span className={styles.label}>Escrow status</span>
                        <span>{escrowStatus}</span>
                      </div>
                      <div>
                        <span className={styles.label}>Deposit status</span>
                        <span>{d.booking.payment?.depositStatus ?? "—"}</span>
                      </div>
                      <div>
                        <span className={styles.label}>Dispute type</span>
                        <span>{d.disputeType ?? "—"}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reporter's details */}
                {d.details && (
                  <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Complaint Details</h3>
                    <p className={styles.detailsText}>{d.details}</p>
                  </div>
                )}

                {/* Evidence */}
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>Evidence ({d.evidence.length})</h3>
                  {d.evidence.length === 0 ? (
                    <p className={styles.noEvidence}>No evidence submitted yet.</p>
                  ) : (
                    <div className={styles.evidenceGrid}>
                      {d.evidence.map((ev) => (
                        <a
                          key={ev.id}
                          href={ev.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.evidenceItem}
                        >
                          {ev.fileType.startsWith("image/") ? (
                            <img src={ev.fileUrl} alt={ev.description ?? "evidence"} className={styles.evidenceImg} />
                          ) : (
                            <div className={styles.evidenceFile}>
                              <span>📄</span>
                              <span>{ev.fileType}</span>
                            </div>
                          )}
                          <span className={styles.evidenceUploader}>by {ev.uploader.name}</span>
                          {ev.description && <span className={styles.evidenceDesc}>{ev.description}</span>}
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                {d.status !== "RESOLVED" && d.status !== "DISMISSED" && (
                  <div className={styles.actions}>
                    {d.status === "PENDING" && (
                      <button className={styles.btnSecondary} onClick={() => markReviewing(d.id)}>
                        Mark as Reviewing
                      </button>
                    )}

                    {!isResolving ? (
                      <button className={styles.btnPrimary} onClick={() => setResolving(d.id)}>
                        Resolve Dispute
                      </button>
                    ) : (
                      <div className={styles.resolveForm}>
                        <h3 className={styles.sectionTitle}>Resolution Decision</h3>

                        <div className={styles.decisionOptions}>
                          {[
                            { value: "FULL_REFUND_BORROWER", label: "Full refund to borrower (100%)" },
                            { value: "PARTIAL_REFUND_BORROWER", label: "Partial refund to borrower" },
                            { value: "NO_REFUND_KEEP_WITH_OWNER", label: "No refund — release to owner" },
                          ].map((opt) => (
                            <label key={opt.value} className={styles.radioLabel}>
                              <input
                                type="radio"
                                name={`decision-${d.id}`}
                                value={opt.value}
                                checked={decision === opt.value}
                                onChange={() => setDecision(opt.value)}
                              />
                              {opt.label}
                            </label>
                          ))}
                        </div>

                        {decision === "PARTIAL_REFUND_BORROWER" && (
                          <div className={styles.field}>
                            <label className={styles.label}>Refund % to borrower</label>
                            <select
                              className={styles.select}
                              value={refundPercent}
                              onChange={(e) => setRefundPercent(Number(e.target.value))}
                            >
                              <option value={50}>50%</option>
                            </select>
                          </div>
                        )}

                        <div className={styles.field}>
                          <label className={styles.label}>Admin notes (shown to both parties)</label>
                          <textarea
                            className={styles.textarea}
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            placeholder="Explain your decision…"
                            rows={3}
                          />
                        </div>

                        <div className={styles.formActions}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => { setResolving(null); setDecision(""); setAdminNotes(""); }}
                          >
                            Cancel
                          </button>
                          <button
                            className={styles.btnDanger}
                            disabled={!decision || submitting}
                            onClick={() => submitResolution(d.id)}
                          >
                            {submitting ? "Resolving…" : "Confirm Resolution"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {d.status === "RESOLVED" && (
                  <div className={styles.resolved}>
                    <strong>Resolved:</strong> {d.adminDecision?.replace(/_/g, " ")}
                    {d.adminNotes && <p>{d.adminNotes}</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
