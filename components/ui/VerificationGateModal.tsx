"use client";

import { useRef, useState } from "react";
import styles from "./VerificationGateModal.module.css";

type Props = {
  status: string; // "unverified" | "pending" | "rejected"
  onClose: () => void;
  onSubmitted: () => void;
};

type UploadSlot = { url: string; preview: string; uploading: boolean; error: string };
const empty = (): UploadSlot => ({ url: "", preview: "", uploading: false, error: "" });

export default function VerificationGateModal({ status, onClose, onSubmitted }: Props) {
  const [selfie,  setSelfie]  = useState<UploadSlot>(empty());
  const [idPhoto, setIdPhoto] = useState<UploadSlot>(empty());
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const selfieRef  = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  async function uploadFile(
    file: File,
    kind: "selfie" | "id_photo",
    set: (s: UploadSlot) => void
  ) {
    const preview = URL.createObjectURL(file);
    set({ url: "", preview, uploading: true, error: "" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    try {
      const res  = await fetch("/api/register/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) set({ url: "", preview, uploading: false, error: data.error || "Upload failed." });
      else         set({ url: data.url, preview, uploading: false, error: "" });
    } catch {
      set({ url: "", preview, uploading: false, error: "Upload failed. Please try again." });
    }
  }

  const onFile = (kind: "selfie" | "id_photo", set: (s: UploadSlot) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) uploadFile(f, kind, set);
    };

  async function handleSubmit() {
    if (!selfie.url || !idPhoto.url) return;
    setSaving(true);
    setSaveErr("");
    try {
      const res  = await fetch("/api/users/kyc-docs", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ selfieUrl: selfie.url, idPhotoUrl: idPhoto.url }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveErr(data.error || "Failed to submit. Please try again."); setSaving(false); return; }
      onSubmitted();
    } catch {
      setSaveErr("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const isPending  = status === "pending";
  const isRejected = status === "rejected";
  const bothReady  = selfie.url && idPhoto.url;
  const anyUploading = selfie.uploading || idPhoto.uploading;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>

        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        <div className={styles.iconWrap}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        {isPending ? (
          <>
            <h2 className={styles.title}>Verification in progress</h2>
            <p className={styles.body}>
              Your documents are under review. We'll notify you once your account is verified — usually within 24 hours.
            </p>
            <button className={styles.btnPrimary} onClick={onClose}>Got it</button>
          </>
        ) : (
          <>
            <h2 className={styles.title}>
              {isRejected ? "Re-submit your documents" : "Verify your identity"}
            </h2>
            <p className={styles.body}>
              {isRejected
                ? "Your previous submission was rejected. Please upload clear, legible photos and try again."
                : "To book or list equipment you need to verify your identity. Upload a selfie and a photo of your SA ID document."}
            </p>

            {/* Selfie slot */}
            <input
              ref={selfieRef} type="file" accept="image/*" capture="user"
              style={{ display: "none" }} onChange={onFile("selfie", setSelfie)}
            />
            <div className={styles.uploadRow}>
              <div className={styles.uploadSlot} onClick={() => selfieRef.current?.click()}>
                {selfie.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selfie.preview} alt="Selfie" className={styles.thumb} />
                ) : (
                  <div className={styles.slotEmpty}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                )}
                <div className={styles.slotLabel}>
                  {selfie.uploading ? "Uploading…" : selfie.url ? "✓ Selfie" : "Take selfie"}
                </div>
                {selfie.error && <div className={styles.slotErr}>{selfie.error}</div>}
                {selfie.url && <div className={styles.slotDone} />}
              </div>

              {/* ID photo slot */}
              <input
                ref={idPhotoRef} type="file" accept="image/*" capture="environment"
                style={{ display: "none" }} onChange={onFile("id_photo", setIdPhoto)}
              />
              <div className={styles.uploadSlot} onClick={() => idPhotoRef.current?.click()}>
                {idPhoto.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={idPhoto.preview} alt="ID document" className={styles.thumb} />
                ) : (
                  <div className={styles.slotEmpty}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <path d="M2 10h20M6 15h4M14 15h4"/>
                    </svg>
                  </div>
                )}
                <div className={styles.slotLabel}>
                  {idPhoto.uploading ? "Uploading…" : idPhoto.url ? "✓ ID photo" : "Upload SA ID"}
                </div>
                {idPhoto.error && <div className={styles.slotErr}>{idPhoto.error}</div>}
                {idPhoto.url && <div className={styles.slotDone} />}
              </div>
            </div>

            {saveErr && <p className={styles.saveErr}>{saveErr}</p>}

            <button
              className={styles.btnPrimary}
              disabled={!bothReady || anyUploading || saving}
              onClick={handleSubmit}
            >
              {saving ? "Submitting…" : "Submit for verification"}
            </button>
            <p className={styles.fine}>Your documents are stored securely and only used for identity verification.</p>
          </>
        )}
      </div>
    </div>
  );
}
