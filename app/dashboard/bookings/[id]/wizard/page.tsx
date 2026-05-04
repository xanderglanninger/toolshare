"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import {
  Check, Clock, ArrowLeft, Camera, X, Trash2, ChevronRight,
  AlertTriangle, FileText, Package, MessageSquare,
} from "lucide-react";
import styles from "./wizard.module.css";
import type { BookingWithDetails, BookingIssue, RentalUpdate } from "@/lib/types";

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.lightboxOverlay} onClick={onClose}>
      <button className={styles.lightboxClose} onClick={onClose}><X size={18} /></button>
      <img
        src={src}
        alt=""
        className={styles.lightboxImg}
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMoney(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEP_DEFS = [
  { id: 1, label: "Booking Confirmed",     role: "both"     },
  { id: 2, label: "Initiate Handover",     role: "lister"   },
  { id: 3, label: "Inspect & Log Issues",  role: "borrower" },
  { id: 4, label: "Review Issues",         role: "lister"   },
  { id: 5, label: "Owner Signs",           role: "lister"   },
  { id: 6, label: "Borrower Signs",        role: "borrower" },
  { id: 7, label: "Return Item",           role: "borrower" },
  { id: 8, label: "Confirm Receipt",       role: "lister"   },
  { id: 9, label: "Leave a Review",        role: "both"     },
] as const;

type StepId = (typeof STEP_DEFS)[number]["id"];

function getCompletions(b: BookingWithDetails) {
  // Each boolean indicates whether that step is done (backward-compat: later flags imply earlier)
  return [
    true,                                                                      // 1 - always confirmed
    b.listerInitiatedHandover || b.listerHandoverSigned,                       // 2
    b.borrowerIssuesSubmitted || b.listerHandoverSigned,                       // 3
    b.listerConfirmedIssues   || b.listerHandoverSigned,                       // 4
    b.listerHandoverSigned,                                                    // 5
    b.borrowerReceiptSigned,                                                   // 6
    b.borrowerConfirmed,                                                       // 7
    b.ownerConfirmed,                                                          // 8
    b.status === "COMPLETED" && false,                                         // 9 - always show review step as open
  ];
}

function getCurrentStep(completions: boolean[]): StepId {
  const idx = completions.findIndex((c) => !c);
  if (idx === -1) return 9;
  return (idx + 1) as StepId;
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  completions,
  currentStep,
  booking,
  isLister,
}: {
  completions: boolean[];
  currentStep: StepId;
  booking: BookingWithDetails;
  isLister: boolean;
}) {
  const ownerName   = `${booking.listing.owner.name} ${booking.listing.owner.surname}`;
  const borrowerName = `${booking.borrower.name} ${booking.borrower.surname}`;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarInner}>
        <p className={styles.sidebarTitle}>Handover Progress</p>

        <div className={styles.stepList}>
          {STEP_DEFS.map((def, i) => {
            const done    = completions[i];
            const active  = def.id === currentStep;
            const locked  = !done && !active;
            const myTurn  = active && (
              def.role === "both" ||
              (def.role === "lister"   && isLister) ||
              (def.role === "borrower" && !isLister)
            );
            const waiting = active && !myTurn;

            return (
              <div
                key={def.id}
                className={`${styles.stepItem}
                  ${done    ? styles.stepDone    : ""}
                  ${active  ? styles.stepActive  : ""}
                  ${locked  ? styles.stepLocked  : ""}
                `}
              >
                <div className={`${styles.stepBadge}
                  ${done   ? styles.badgeDone   : ""}
                  ${active ? styles.badgeActive : ""}
                  ${locked ? styles.badgeLocked : ""}
                `}>
                  {done ? <Check size={12} /> : active ? <ChevronRight size={12} /> : <span>{def.id}</span>}
                </div>

                <div className={styles.stepMeta}>
                  <span className={styles.stepLabel}>{def.label}</span>
                  {def.role !== "both" && (
                    <span className={styles.stepRole}>
                      {def.role === "lister" ? ownerName : borrowerName}
                    </span>
                  )}
                  {waiting && (
                    <span className={styles.stepWaiting}>
                      <Clock size={9} />
                      Waiting for {def.role === "lister" ? ownerName : borrowerName}
                    </span>
                  )}
                  {myTurn && !done && (
                    <span className={styles.stepYourTurn}>Your turn</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.sidebarBookingInfo}>
          <p className={styles.sidebarItemTitle}>{booking.listing.title}</p>
          <p className={styles.sidebarDates}>{fmtDate(booking.startDate)} – {fmtDate(booking.endDate)}</p>
          <p className={styles.sidebarAmount}>{fmtMoney(booking.totalAmount)}</p>
        </div>
      </div>
    </aside>
  );
}

// ─── Step content panels ──────────────────────────────────────────────────────

function WaitingPanel({ message }: { message: string }) {
  return (
    <div className={styles.waitingPanel}>
      <div className={styles.waitingIcon}><Clock size={28} /></div>
      <p className={styles.waitingTitle}>Waiting…</p>
      <p className={styles.waitingBody}>{message}</p>
    </div>
  );
}

function DonePanel({ message }: { message: string }) {
  return (
    <div className={styles.donePanel}>
      <div className={styles.donePanelIcon}><Check size={22} /></div>
      <p className={styles.donePanelText}>{message}</p>
    </div>
  );
}

// Step 1 — Booking Confirmed
function Step1({ booking, isLister }: { booking: BookingWithDetails; isLister: boolean }) {
  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 1 — Booking Confirmed</p>
      <h2 className={styles.stepContentTitle}>Booking is Confirmed</h2>
      <p className={styles.stepContentBody}>
        The booking for <strong>{booking.listing.title}</strong> has been confirmed and payment received.
        {isLister
          ? " When you're ready to meet the borrower and hand over the item, click below to begin the handover process."
          : " The owner will initiate the handover process when they're ready to meet you."}
      </p>
      <DonePanel message="Booking confirmed and payment received." />
    </div>
  );
}

// Step 2 — Initiate Handover (lister)
function Step2({
  booking, isLister, onAction,
}: { booking: BookingWithDetails; isLister: boolean; onAction: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/initiate-handover`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!isLister) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step 2 — Initiate Handover</p>
        <h2 className={styles.stepContentTitle}>Waiting for Owner</h2>
        <WaitingPanel message={`${booking.listing.owner.name} needs to confirm they are ready to hand over the item. You'll be notified once they do.`} />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 2 — Initiate Handover</p>
      <h2 className={styles.stepContentTitle}>Ready to Hand Over?</h2>
      <p className={styles.stepContentBody}>
        Click below to confirm that you are with the borrower and ready to hand over{" "}
        <strong>{booking.listing.title}</strong>. This will prompt the borrower to inspect the item
        and log any pre-existing issues.
      </p>
      {error && <p className={styles.errorText}>{error}</p>}
      <button className={styles.btnPrimary} disabled={busy} onClick={handle}>
        {busy ? "Processing…" : "Initiate Handover"}
      </button>
    </div>
  );
}

// Step 3 — Inspect & Log Issues (borrower)
function Step3({
  booking, isLister, issues, onAction,
}: {
  booking: BookingWithDetails;
  isLister: boolean;
  issues: BookingIssue[];
  onAction: (updated: BookingIssue[]) => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [localIssues, setLocalIssues] = useState<BookingIssue[]>(issues);
  const [noIssues, setNoIssues]       = useState(false);
  const [description, setDescription] = useState("");
  const [photos, setPhotos]           = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [addingIssue, setAddingIssue] = useState(false);
  const [submitting, setSubmitting]   = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true); setFormError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setPhotos(p => [...p, json.data.url]);
    } catch (e: any) { setFormError(e.message); }
    finally { setUploadingPhoto(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function addIssue() {
    if (!description.trim()) { setFormError("Please describe the issue."); return; }
    setAddingIssue(true); setFormError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), photos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setLocalIssues(p => [...p, json.data]);
      setDescription(""); setPhotos([]);
    } catch (e: any) { setFormError(e.message); }
    finally { setAddingIssue(false); }
  }

  async function removeIssue(issueId: string) {
    const res = await fetch(`/api/bookings/${booking.id}/issues/${issueId}`, { method: "DELETE" });
    if (res.ok) setLocalIssues(p => p.filter(i => i.id !== issueId));
  }

  async function submitInspection() {
    setSubmitting(true); setFormError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/submit-issues`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction(localIssues);
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  }

  if (isLister) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step 3 — Inspect & Log Issues</p>
        <h2 className={styles.stepContentTitle}>Borrower is Inspecting</h2>
        <WaitingPanel message={`${booking.borrower.name} is inspecting the item and logging any pre-existing issues. You'll be notified once they're done.`} />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 3 — Inspect & Log Issues</p>
      <h2 className={styles.stepContentTitle}>Inspect the Item</h2>
      <p className={styles.stepContentBody}>
        Carefully inspect <strong>{booking.listing.title}</strong> before accepting it.
        Log any pre-existing damage or issues below — this protects you from being held
        responsible for damage that was already present.
      </p>

      {/* Existing issues list */}
      {localIssues.length > 0 && (
        <div className={styles.issuesList}>
          {localIssues.map((issue, i) => (
            <div key={issue.id} className={styles.issueCard}>
              <div className={styles.issueCardHeader}>
                <span className={styles.issueNum}>Issue {i + 1}</span>
                <button className={styles.issueDeleteBtn} onClick={() => removeIssue(issue.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
              <p className={styles.issueDesc}>{issue.description}</p>
              {issue.photos.length > 0 && (
                <div className={styles.issuePhotos}>
                  {issue.photos.map((url, j) => (
                    <img key={j} src={url} alt="" className={styles.issuePhoto} onClick={() => setLightbox(url)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No issues checkbox */}
      <label className={styles.noIssuesRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={noIssues}
          onChange={e => { setNoIssues(e.target.checked); if (e.target.checked) { setDescription(""); setPhotos([]); } }}
        />
        <span>There are no pre-existing issues — I am satisfied with the item's condition.</span>
      </label>

      {/* Add issue form */}
      {!noIssues && (
        <div className={styles.addIssueForm}>
          <p className={styles.addIssueTitle}>Add an Issue</p>
          <textarea
            className={styles.textarea}
            placeholder="Describe the issue (e.g. scratch on left panel, missing bolt)…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
          <div className={styles.photoRow}>
            {photos.map((url, i) => (
              <div key={i} className={styles.photoThumbWrap}>
                <img src={url} alt="" className={styles.photoThumb} />
                <button className={styles.photoRemove} onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                  <X size={10} />
                </button>
              </div>
            ))}
            <button className={styles.photoAddBtn} disabled={uploadingPhoto} onClick={() => fileRef.current?.click()}>
              {uploadingPhoto ? "…" : <><Camera size={13} /> Photo</>}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={uploadPhoto} />
          </div>
          {formError && <p className={styles.errorText}>{formError}</p>}
          <button className={styles.btnSecondary} disabled={addingIssue || !description.trim()} onClick={addIssue}>
            {addingIssue ? "Adding…" : "Add Issue"}
          </button>
        </div>
      )}

      <div className={styles.actionRow}>
        {formError && <p className={styles.errorText}>{formError}</p>}
        <button
          className={styles.btnPrimary}
          disabled={submitting || addingIssue || uploadingPhoto || (!noIssues && localIssues.length === 0 && !description.trim())}
          onClick={submitInspection}
        >
          {submitting ? "Submitting…" : "Submit Inspection"}
        </button>
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// Step 4 — Review Issues (lister)
function Step4({
  booking, isLister, issues, onAction,
}: {
  booking: BookingWithDetails;
  isLister: boolean;
  issues: BookingIssue[];
  onAction: () => void;
}) {
  const [lightbox, setLightbox]   = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [busy, setBusy]           = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const allConfirmed = issues.length === 0 || issues.every(i => confirmed.has(i.id));

  function toggle(id: string) {
    setConfirmed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handle() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-issues`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!isLister) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step 4 — Review Issues</p>
        <h2 className={styles.stepContentTitle}>Owner is Reviewing Issues</h2>
        <WaitingPanel message={`${booking.listing.owner.name} is reviewing the issues you logged. You'll be notified once they've confirmed them.`} />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 4 — Review Issues</p>
      <h2 className={styles.stepContentTitle}>Review Logged Issues</h2>

      {issues.length === 0 ? (
        <>
          <p className={styles.stepContentBody}>
            The borrower confirmed there are no pre-existing issues with the item.
          </p>
          <DonePanel message="No issues logged — you can proceed to sign the agreement." />
          {error && <p className={styles.errorText}>{error}</p>}
          <button className={styles.btnPrimary} disabled={busy} onClick={handle}>
            {busy ? "Processing…" : "Acknowledge & Continue"}
          </button>
        </>
      ) : (
        <>
          <p className={styles.stepContentBody}>
            The borrower logged {issues.length} issue{issues.length !== 1 ? "s" : ""}.
            Check each one to confirm you have seen and acknowledged it.
          </p>

          <div className={styles.issuesList}>
            {issues.map((issue, i) => (
              <label
                key={issue.id}
                className={`${styles.issueCheckRow} ${confirmed.has(issue.id) ? styles.issueCheckRowDone : ""}`}
              >
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={confirmed.has(issue.id)}
                  onChange={() => toggle(issue.id)}
                />
                <div className={styles.issueCheckContent}>
                  <span className={styles.issueNum}>Issue {i + 1}</span>
                  <p className={styles.issueDesc}>{issue.description}</p>
                  {issue.photos.length > 0 && (
                    <div className={styles.issuePhotos}>
                      {issue.photos.map((url, j) => (
                        <img key={j} src={url} alt="" className={styles.issuePhoto} onClick={e => { e.preventDefault(); setLightbox(url); }} />
                      ))}
                    </div>
                  )}
                </div>
              </label>
            ))}
          </div>

          {!allConfirmed && (
            <p className={styles.warnText}>Please acknowledge all issues above before continuing.</p>
          )}
          {error && <p className={styles.errorText}>{error}</p>}
          <button className={styles.btnPrimary} disabled={!allConfirmed || busy} onClick={handle}>
            {busy ? "Processing…" : "Confirm All Issues"}
          </button>
        </>
      )}
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// Steps 5 & 6 — Sign Agreement
function StepSign({
  booking, isLister, stepNum, myTurn, onAction,
}: {
  booking: BookingWithDetails;
  isLister: boolean;
  stepNum: 5 | 6;
  myTurn: boolean;
  onAction: () => void;
}) {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const endpoint = stepNum === 5 ? "sign-handover" : "sign-receipt";
  const signerName = stepNum === 5
    ? `${booking.listing.owner.name} ${booking.listing.owner.surname}`
    : `${booking.borrower.name} ${booking.borrower.surname}`;
  const otherName = stepNum === 5
    ? `${booking.borrower.name} ${booking.borrower.surname}`
    : `${booking.listing.owner.name} ${booking.listing.owner.surname}`;

  async function handle() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/${endpoint}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!myTurn) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step {stepNum} — {stepNum === 5 ? "Owner Signs" : "Borrower Signs"}</p>
        <h2 className={styles.stepContentTitle}>Waiting for Signature</h2>
        <WaitingPanel message={`${stepNum === 5 ? booking.listing.owner.name : booking.borrower.name} needs to sign the handover agreement.`} />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step {stepNum} — {stepNum === 5 ? "Owner Signs" : "Borrower Signs"}</p>
      <h2 className={styles.stepContentTitle}>Sign the Handover Agreement</h2>

      <div className={styles.contractBox}>
        <div className={styles.contractBoxHeader}>
          <FileText size={14} />
          <span>Handover Agreement</span>
        </div>
        <div className={styles.contractBoxBody}>
          <p><strong>Item:</strong> {booking.listing.title}</p>
          <p><strong>Owner:</strong> {booking.listing.owner.name} {booking.listing.owner.surname}</p>
          <p><strong>Borrower:</strong> {booking.borrower.name} {booking.borrower.surname}</p>
          <p><strong>Period:</strong> {fmtDate(booking.startDate)} – {fmtDate(booking.endDate)}</p>
          <p><strong>Total:</strong> {fmtMoney(booking.totalAmount)}</p>
          {booking.depositAmount && <p><strong>Deposit:</strong> {fmtMoney(booking.depositAmount)}</p>}
          <hr className={styles.contractHr} />
          <p>
            By signing, <strong>{signerName}</strong> confirms that they have read and understood
            the terms of this rental, that the item is being physically handed over in the condition
            documented above, and that both parties agree to abide by the ToolShare Terms of Service.
          </p>
          <p>
            The borrower is responsible for any loss or damage beyond normal wear and tear.
            The deposit of <strong>{booking.depositAmount ? fmtMoney(booking.depositAmount) : "N/A"}</strong>{" "}
            will be returned within 48 hours of confirmed completion, subject to any dispute.
          </p>
          {(booking.issues ?? []).length > 0 && (
            <p>
              <strong>{booking.issues.length} pre-existing issue{booking.issues.length !== 1 ? "s" : ""}</strong> have
              been documented and acknowledged by both parties. The borrower shall not be held liable
              for these specific documented issues upon return.
            </p>
          )}
        </div>
      </div>

      <label className={styles.agreeRow}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
        />
        <span>
          I, <strong>{signerName}</strong>, confirm I have read and agree to the above terms
          and am {stepNum === 5 ? "physically handing over" : "physically receiving"} the item.
        </span>
      </label>

      {error && <p className={styles.errorText}>{error}</p>}
      <button className={styles.btnPrimary} disabled={!agreed || busy} onClick={handle}>
        {busy ? "Signing…" : `Sign Agreement`}
      </button>
    </div>
  );
}

// Step 7 — Return Item (borrower) + Rental Updates feed
function Step7({
  booking, isLister, rentalUpdates, onAction, onUpdatePosted,
}: {
  booking: BookingWithDetails;
  isLister: boolean;
  rentalUpdates: RentalUpdate[];
  onAction: () => void;
  onUpdatePosted: (u: RentalUpdate) => void;
}) {
  const [lightbox, setLightbox]     = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [message, setMessage]       = useState("");
  const [photos, setPhotos]         = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [posting, setPosting]       = useState(false);
  const [postError, setPostError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleReturn() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-completion`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true); setPostError(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setPhotos(p => [...p, json.data.url]);
    } catch (e: any) { setPostError(e.message); }
    finally { setUploadingPhoto(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function postUpdate() {
    if (!message.trim()) { setPostError("Please enter a message."); return; }
    setPosting(true); setPostError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/rental-updates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), photos }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onUpdatePosted(json.data);
      setMessage(""); setPhotos([]);
    } catch (e: any) { setPostError(e.message); }
    finally { setPosting(false); }
  }

  const feedPanel = (label: string, emptyHint: string) => (
    <div className={styles.s7Feed}>
      <div className={styles.s7FeedHeader}>
        <MessageSquare size={13} />
        <span>{label}</span>
        {rentalUpdates.length > 0 && <span className={styles.s7Badge}>{rentalUpdates.length}</span>}
      </div>
      {rentalUpdates.length === 0 ? (
        <div className={styles.s7Empty}>
          <MessageSquare size={20} />
          <span>{emptyHint}</span>
        </div>
      ) : (
        <div className={styles.s7List}>
          {rentalUpdates.map((u) => (
            <div key={u.id} className={styles.s7Card}>
              <div className={styles.s7CardMeta}>
                <span className={styles.s7CardBadge}>Update</span>
                <span className={styles.s7CardTime}>
                  {new Date(u.createdAt).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className={styles.s7CardMsg}>{u.message}</p>
              {u.photos.length > 0 && (
                <div className={styles.s7CardPhotos}>
                  {u.photos.map((url, i) => (
                    <img key={i} src={url} alt="" className={styles.s7CardPhoto} onClick={() => setLightbox(url)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isLister) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step 7 — Return Item</p>
        <h2 className={styles.stepContentTitle}>Rental in Progress</h2>
        <div className={styles.activeRentalBanner}>
          <Package size={20} />
          <div>
            <p className={styles.activeRentalTitle}>Item is currently on rental</p>
            <p className={styles.activeRentalBody}>
              {booking.borrower.name} has the item. You'll be notified when they return it.
            </p>
          </div>
        </div>
        <div className={styles.s7Grid}>
          {feedPanel("Borrower Updates", `No updates from ${booking.borrower.name} yet.`)}
          <div className={styles.s7Right}>
            <WaitingPanel message={`Waiting for ${booking.borrower.name} to return the item.`} />
          </div>
        </div>
        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 7 — Return Item</p>
      <h2 className={styles.stepContentTitle}>Return the Item</h2>
      <p className={styles.stepContentBody}>
        When you have physically returned <strong>{booking.listing.title}</strong> to the owner,
        click below to confirm. This will notify the owner to confirm receipt and release your deposit.
      </p>

      <div className={styles.s7Grid}>
        {feedPanel("Item Updates", "No updates yet — post one below to keep the owner informed.")}

        <div className={styles.s7Right}>
          {/* Post form */}
          <div className={styles.s7Panel}>
            <div className={styles.s7PanelHeader}>
              <Camera size={13} /> Post an Update
            </div>
            <div className={styles.s7PanelBody}>
              <textarea
                className={styles.s7Textarea}
                placeholder="Let the owner know how the item is doing…"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
              />
              <div className={styles.s7PhotoRow}>
                {photos.map((url, i) => (
                  <div key={i} className={styles.photoThumbWrap}>
                    <img src={url} alt="" className={styles.photoThumb} />
                    <button className={styles.photoRemove} onClick={() => setPhotos(p => p.filter((_, j) => j !== i))}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button className={styles.s7PhotoBtn} disabled={uploadingPhoto} onClick={() => fileRef.current?.click()}>
                  <Camera size={13} />{uploadingPhoto ? "Uploading…" : "Add Photo"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" style={{ display: "none" }} onChange={uploadPhoto} />
              </div>
              {postError && <p className={styles.errorText}>{postError}</p>}
              <button className={styles.s7PostBtn} disabled={posting || !message.trim()} onClick={postUpdate}>
                {posting ? "Posting…" : "Post Update"}
              </button>
            </div>
          </div>

          {/* Return action */}
          <div className={styles.s7ReturnPanel}>
            <div className={styles.s7ReturnPanelInner}>
              <div>
                <p className={styles.s7ReturnTitle}>Done with the rental?</p>
                <p className={styles.s7ReturnHint}>Confirm once you've physically handed <strong>{booking.listing.title}</strong> back to the owner.</p>
              </div>
              {error && <p className={styles.errorText}>{error}</p>}
              <button className={styles.btnPrimary} disabled={busy} onClick={handleReturn}>
                {busy ? "Processing…" : "Mark Item as Returned"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

// Step 8 — Confirm Receipt (lister)
function Step8({
  booking, isLister, onAction,
}: { booking: BookingWithDetails; isLister: boolean; onAction: () => void }) {
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bookings/${booking.id}/confirm-completion`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onAction();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!isLister) {
    return (
      <div className={styles.stepContent}>
        <p className={styles.stepContentEyebrow}>Step 8 — Confirm Receipt</p>
        <h2 className={styles.stepContentTitle}>Waiting for Owner</h2>
        <WaitingPanel message={`Waiting for ${booking.listing.owner.name} to confirm they've received the item back. Your deposit will be released once they confirm.`} />
      </div>
    );
  }

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 8 — Confirm Receipt</p>
      <h2 className={styles.stepContentTitle}>Confirm You've Received the Item</h2>
      <p className={styles.stepContentBody}>
        {booking.borrower.name} has marked the item as returned. Please confirm that you have
        physically received <strong>{booking.listing.title}</strong> back. This will complete
        the booking and release the funds.
      </p>
      {error && <p className={styles.errorText}>{error}</p>}
      <button className={styles.btnPrimary} disabled={busy} onClick={handle}>
        {busy ? "Processing…" : "Confirm Item Received"}
      </button>
    </div>
  );
}

// Step 9 — Review
function Step9({
  booking, isLister, userId, router,
}: { booking: BookingWithDetails; isLister: boolean; userId: string; router: ReturnType<typeof useRouter> }) {
  const alreadyReviewed = booking.reviews.some(r => r.reviewerId === userId);

  return (
    <div className={styles.stepContent}>
      <p className={styles.stepContentEyebrow}>Step 9 — Leave a Review</p>
      <h2 className={styles.stepContentTitle}>Booking Complete!</h2>
      <DonePanel message="The booking has been completed successfully. Funds will be released within 48 hours." />
      <p className={styles.stepContentBody}>
        {alreadyReviewed
          ? "You've already left a review for this booking. Thank you!"
          : "Share your experience to help the community."}
      </p>
      {!alreadyReviewed && (
        <button className={styles.btnPrimary} onClick={() => router.push("/dashboard/bookings")}>
          Leave a Review
        </button>
      )}
      <button className={styles.btnSecondary} onClick={() => router.push("/dashboard/bookings")}>
        Back to Bookings
      </button>
    </div>
  );
}

// ─── Main wizard component ────────────────────────────────────────────────────

export default function WizardPage() {
  const { data: session } = useSession();
  const router            = useRouter();
  const { id }            = useParams<{ id: string }>();

  const [booking, setBooking]         = useState<BookingWithDetails | null>(null);
  const [issues,  setIssues]          = useState<BookingIssue[]>([]);
  const [rentalUpdates, setRentalUpdates] = useState<RentalUpdate[]>([]);
  const [loading, setLoading]         = useState(true);

  async function load() {
    const [bRes, iRes, uRes] = await Promise.all([
      fetch(`/api/bookings/${id}`).then(r => r.json()),
      fetch(`/api/bookings/${id}/issues`).then(r => r.json()),
      fetch(`/api/bookings/${id}/rental-updates`).then(r => r.json()),
    ]);
    setBooking(bRes.data ?? null);
    setIssues(iRes.data ?? []);
    setRentalUpdates(uRes.data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (!booking) return <div className={styles.loading}>Booking not found.</div>;

  const userId   = session?.user?.id ?? "";
  const isLister = userId === booking.listing.owner.id;
  const isBorrower = userId === booking.borrowerId;

  if (!isLister && !isBorrower) return <div className={styles.loading}>Access denied.</div>;

  const completions  = getCompletions(booking);
  const currentStep  = getCurrentStep(completions);

  function refresh() { load(); }

  function renderStepContent() {
    if (currentStep > 1 && completions[currentStep - 2]) {
      // Already past this step — shouldn't reach here via UI, but handle gracefully
    }

    switch (currentStep) {
      case 1: return <Step1 booking={booking!} isLister={isLister} />;
      case 2: return <Step2 booking={booking!} isLister={isLister} onAction={refresh} />;
      case 3: return (
        <Step3
          booking={booking!}
          isLister={isLister}
          issues={issues}
          onAction={(updated) => { setIssues(updated); refresh(); }}
        />
      );
      case 4: return (
        <Step4
          booking={booking!}
          isLister={isLister}
          issues={issues}
          onAction={refresh}
        />
      );
      case 5: return (
        <StepSign
          booking={booking!}
          isLister={isLister}
          stepNum={5}
          myTurn={isLister}
          onAction={refresh}
        />
      );
      case 6: return (
        <StepSign
          booking={booking!}
          isLister={isLister}
          stepNum={6}
          myTurn={isBorrower}
          onAction={refresh}
        />
      );
      case 7: return (
        <Step7
          booking={booking!}
          isLister={isLister}
          rentalUpdates={rentalUpdates}
          onAction={refresh}
          onUpdatePosted={(u) => setRentalUpdates(prev => [...prev, u])}
        />
      );
      case 8: return <Step8 booking={booking!} isLister={isLister} onAction={refresh} />;
      case 9: return <Step9 booking={booking!} isLister={isLister} userId={userId} router={router} />;
      default: return null;
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <button className={styles.back} onClick={() => router.push("/dashboard/bookings")}>
          <ArrowLeft size={14} /> Back to bookings
        </button>
        <span className={styles.topBarTitle}>{booking.listing.title}</span>
      </div>

      <div className={styles.layout}>
        <Sidebar
          completions={completions}
          currentStep={currentStep}
          booking={booking}
          isLister={isLister}
        />

        <main className={styles.main}>
          {renderStepContent()}
        </main>
      </div>
    </div>
  );
}
