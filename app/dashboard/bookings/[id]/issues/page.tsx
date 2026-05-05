"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Camera, X, Plus, CheckCircle, AlertTriangle, Trash2 } from "lucide-react";
import styles from "./issues.module.css";
import type { BookingWithDetails, BookingIssue } from "@/lib/types";

function fmt(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export default function IssuesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [issues, setIssues] = useState<BookingIssue[]>([]);
  const [loading, setLoading] = useState(true);

  // form state
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<"Minor" | "Moderate" | "Severe">("Minor");
  const [location, setLocation] = useState("");
  const [functionalImpact, setFunctionalImpact] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [noIssues, setNoIssues] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bookings/${id}`).then(r => r.json()),
      fetch(`/api/bookings/${id}/issues`).then(r => r.json()),
    ])
      .then(([bookingRes, issuesRes]) => {
        setBooking(bookingRes.data ?? null);
        setIssues(issuesRes.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setFormError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setPhotos(prev => [...prev, json.data.url]);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setUploadingPhoto(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleAddIssue() {
    if (!description.trim()) {
      setFormError("Please describe the issue.");
      return;
    }
    if (photos.length === 0) {
      setFormError("At least one photo is required to document the issue.");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    // Encode structured fields into the description prefix so no schema change is needed
    const structuredDescription =
      `[Severity: ${severity}] [Location: ${location.trim() || "Not specified"}] [Affects use: ${functionalImpact ? "Yes" : "No"}]\n${description.trim()}`;
    try {
      const res = await fetch(`/api/bookings/${id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: structuredDescription, photos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to log issue");
      setIssues(prev => [...prev, json.data]);
      setDescription("");
      setLocation("");
      setSeverity("Minor");
      setFunctionalImpact(false);
      setPhotos([]);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteIssue(issueId: string) {
    const res = await fetch(`/api/bookings/${id}/issues/${issueId}`, { method: "DELETE" });
    if (res.ok) {
      setIssues(prev => prev.filter(i => i.id !== issueId));
    }
  }

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!booking) return <div className={styles.loading}>Booking not found.</div>;

  const isBorrower = session?.user?.id === booking.borrowerId;
  if (!isBorrower) return <div className={styles.loading}>Access denied.</div>;

  const isLocked = booking.listerHandoverSigned;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => router.back()}>
          <ArrowLeft size={15} /> Back to bookings
        </button>

        <div className={styles.header}>
          <p className={styles.eyebrow}>Pre-handover inspection</p>
          <h1 className={styles.title}>Log Item Issues</h1>
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

        <div className={styles.infoBox}>
          <AlertTriangle size={16} className={styles.infoIcon} />
          <p className={styles.infoText}>
            Before the owner hands over the item, document any <strong>pre-existing damage or issues</strong> here.
            This protects you from being held responsible for damage that was already present.
            The owner will review and confirm each issue before completing the handover.
          </p>
        </div>

        {isLocked && (
          <div className={styles.lockedBanner}>
            <CheckCircle size={16} />
            The handover has been signed. No further issues can be logged.
          </div>
        )}

        {/* Logged issues list */}
        {issues.length > 0 && (
          <div className={styles.issuesList}>
            <p className={styles.issuesListTitle}>Logged Issues ({issues.length})</p>
            {issues.map((issue, i) => (
              <div key={issue.id} className={styles.issueCard}>
                <div className={styles.issueCardTop}>
                  <span className={styles.issueNumber}>Issue {i + 1}</span>
                  {!isLocked && (
                    <button className={styles.deleteBtn} onClick={() => handleDeleteIssue(issue.id)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className={styles.issueDescription}>{issue.description}</p>
                {issue.photos.length > 0 && (
                  <div className={styles.photoGrid}>
                    {issue.photos.map((url, j) => (
                      <img key={j} src={url} alt={`Issue ${i + 1} photo ${j + 1}`} className={styles.photo} />
                    ))}
                  </div>
                )}
                <p className={styles.issueDate}>{new Date(issue.createdAt).toLocaleString("en-ZA")}</p>
              </div>
            ))}
          </div>
        )}

        {/* No issues checkbox */}
        {!isLocked && (
          <label className={styles.noIssuesRow}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={noIssues}
              onChange={e => setNoIssues(e.target.checked)}
            />
            <span className={styles.noIssuesLabel}>
              There are no pre-existing issues with this item — I am satisfied with its condition.
            </span>
          </label>
        )}

        {/* Add issue form */}
        {!isLocked && !noIssues && (
          <div className={styles.formCard}>
            <p className={styles.formTitle}>
              <Plus size={15} /> Add an Issue
            </p>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Severity *</label>
              <div style={{ display: "flex", gap: 8 }}>
                {(["Minor", "Moderate", "Severe"] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s)}
                    style={{
                      flex: 1, padding: "6px 0", borderRadius: 8, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                      border: "1.5px solid",
                      borderColor: severity === s ? (s === "Severe" ? "#ef4444" : s === "Moderate" ? "#f59e0b" : "#22c55e") : "var(--border, #ddd)",
                      background: severity === s ? (s === "Severe" ? "#fef2f2" : s === "Moderate" ? "#fffbeb" : "#f0fdf4") : "transparent",
                      color: severity === s ? (s === "Severe" ? "#ef4444" : s === "Moderate" ? "#d97706" : "#16a34a") : "var(--text-2, #666)",
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Location on item</label>
              <input
                className={styles.textarea}
                style={{ padding: "8px 10px" }}
                placeholder="e.g. Front left corner, top panel, handle…"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", marginBottom: 12, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={functionalImpact}
                onChange={e => setFunctionalImpact(e.target.checked)}
              />
              This issue affects the item's usability
            </label>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Description *</label>
              <textarea
                className={styles.textarea}
                placeholder="Describe the damage or issue (e.g. 'Scratch on left side panel', 'Missing bolt on handle')…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.label}>Photos * <span style={{ fontWeight: 400, color: "var(--text-3,#aaa)" }}>(at least 1 required)</span></label>
              <div className={styles.photoRow}>
                {photos.map((url, i) => (
                  <div key={i} className={styles.photoThumbWrap}>
                    <img src={url} alt="" className={styles.photoThumb} />
                    <button
                      className={styles.photoRemove}
                      onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  className={styles.photoAdd}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? "…" : <><Camera size={16} /><span>Add photo</span></>}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  style={{ display: "none" }}
                  onChange={handlePhotoUpload}
                />
              </div>
            </div>

            {formError && <p className={styles.error}>{formError}</p>}

            <button
              className={styles.btnAdd}
              disabled={submitting || !description.trim() || photos.length === 0}
              onClick={handleAddIssue}
            >
              {submitting ? "Logging…" : "Log Issue"}
            </button>
          </div>
        )}

        {/* Done button */}
        <div className={styles.footer}>
          {issues.length > 0 || noIssues ? (
            <div className={styles.successNote}>
              <CheckCircle size={16} />
              {noIssues
                ? "You've confirmed there are no pre-existing issues."
                : `${issues.length} issue${issues.length !== 1 ? "s" : ""} logged. The owner will review these before handing over.`}
            </div>
          ) : null}
          <button className={styles.btnDone} onClick={() => router.push("/dashboard/bookings")}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
