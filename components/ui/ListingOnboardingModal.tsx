"use client";

import { useRef, useState } from "react";
import styles from "./ListingOnboardingModal.module.css";

const SA_BANKS = [
  "ABSA",
  "African Bank",
  "Bidvest Bank",
  "Capitec Bank",
  "Discovery Bank",
  "FNB (First National Bank)",
  "Investec",
  "Nedbank",
  "Standard Bank",
  "TymeBank",
  "Other",
];

type UploadSlot = { url: string; preview: string; uploading: boolean; error: string };
const empty = (): UploadSlot => ({ url: "", preview: "", uploading: false, error: "" });

type Props = {
  idVerificationStatus: string;
  hasBankAccount: boolean | null;
  onClose: () => void;
  onIdSubmitted: () => void;
  onBankSaved: () => void;
};

export default function ListingOnboardingModal({
  idVerificationStatus,
  hasBankAccount,
  onClose,
  onIdSubmitted,
  onBankSaved,
}: Props) {
  const idDone = idVerificationStatus === "verified" || idVerificationStatus === "pending";
  const bankDone = hasBankAccount === true;

  const [activeStep, setActiveStep] = useState<1 | 2>(idDone ? 2 : 1);

  // Step 1 state
  const [selfie, setSelfie] = useState<UploadSlot>(empty());
  const [idPhoto, setIdPhoto] = useState<UploadSlot>(empty());
  const [idSaving, setIdSaving] = useState(false);
  const [idErr, setIdErr] = useState("");
  const selfieRef = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  // Step 2 state
  const [bankHolder, setBankHolder] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankNumber, setBankNumber] = useState("");
  const [bankType, setBankType] = useState("cheque");
  const [branchCode, setBranchCode] = useState("");
  const [bankSaving, setBankSaving] = useState(false);
  const [bankErr, setBankErr] = useState("");

  async function uploadFile(file: File, kind: "selfie" | "id_photo", set: (s: UploadSlot) => void) {
    const preview = URL.createObjectURL(file);
    set({ url: "", preview, uploading: true, error: "" });
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    try {
      const res = await fetch("/api/register/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) set({ url: "", preview, uploading: false, error: data.error || "Upload failed." });
      else set({ url: data.url, preview, uploading: false, error: "" });
    } catch {
      set({ url: "", preview, uploading: false, error: "Upload failed. Please try again." });
    }
  }

  const onFile = (kind: "selfie" | "id_photo", set: (s: UploadSlot) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) uploadFile(f, kind, set);
    };

  async function handleIdSubmit() {
    if (!selfie.url || !idPhoto.url) return;
    setIdSaving(true);
    setIdErr("");
    try {
      const res = await fetch("/api/users/kyc-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieUrl: selfie.url, idPhotoUrl: idPhoto.url }),
      });
      const data = await res.json();
      if (!res.ok) { setIdErr(data.error || "Failed to submit."); setIdSaving(false); return; }
      onIdSubmitted();
      setActiveStep(2);
    } catch {
      setIdErr("Something went wrong. Please try again.");
      setIdSaving(false);
    }
  }

  async function handleBankSubmit() {
    if (!bankHolder || !bankName || !bankNumber || !bankType) return;
    setBankSaving(true);
    setBankErr("");
    try {
      const res = await fetch("/api/settings/bank-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountHolder: bankHolder,
          bankName,
          bankAccountNumber: bankNumber,
          bankAccountType: bankType,
          bankBranchCode: branchCode || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setBankErr(data.error || "Failed to save."); setBankSaving(false); return; }
      onBankSaved();
    } catch {
      setBankErr("Something went wrong. Please try again.");
      setBankSaving(false);
    }
  }

  const step1BothReady = selfie.url && idPhoto.url;
  const step1Uploading = selfie.uploading || idPhoto.uploading;
  const step2Ready = bankHolder && bankName && bankNumber && bankType;

  const isPending = idVerificationStatus === "pending";

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>

        <div className={styles.iconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>

        <h2 className={styles.title}>Complete your profile to list</h2>
        <p className={styles.subtitle}>Two quick steps before you can create listings.</p>

        {/* Step indicators */}
        <div className={styles.steps}>
          <button
            className={`${styles.step} ${activeStep === 1 ? styles.stepActive : ""} ${idDone ? styles.stepDone : ""}`}
            onClick={() => !idDone && setActiveStep(1)}
          >
            <span className={styles.stepNum}>{idDone ? "✓" : "1"}</span>
            <span className={styles.stepLabel}>Verify Identity</span>
          </button>
          <div className={styles.stepLine} />
          <button
            className={`${styles.step} ${activeStep === 2 ? styles.stepActive : ""} ${bankDone ? styles.stepDone : ""}`}
            onClick={() => idDone && setActiveStep(2)}
          >
            <span className={styles.stepNum}>{bankDone ? "✓" : "2"}</span>
            <span className={styles.stepLabel}>Bank Account</span>
          </button>
        </div>

        {/* Step 1 content */}
        {activeStep === 1 && (
          <>
            {isPending ? (
              <div className={styles.pendingBox}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5a800" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <p>Your documents are under review. We'll notify you once verified — usually within 24 hours.</p>
              </div>
            ) : (
              <>
                <p className={styles.stepBody}>
                  Upload a selfie and a photo of your SA ID document. Your documents are stored securely.
                </p>

                <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: "none" }} onChange={onFile("selfie", setSelfie)} />
                <input ref={idPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={onFile("id_photo", setIdPhoto)} />

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

                {idErr && <p className={styles.errMsg}>{idErr}</p>}

                <button
                  className={styles.btnPrimary}
                  disabled={!step1BothReady || step1Uploading || idSaving}
                  onClick={handleIdSubmit}
                >
                  {idSaving ? "Submitting…" : "Submit for verification"}
                </button>
              </>
            )}

            {isPending && (
              <button className={styles.btnSecondary} onClick={() => setActiveStep(2)}>
                Continue to bank account →
              </button>
            )}
          </>
        )}

        {/* Step 2 content */}
        {activeStep === 2 && (
          <>
            {bankDone ? (
              <div className={styles.pendingBox} style={{ borderColor: "#22c55e", background: "#f0fdf4" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <p style={{ color: "#15803d" }}>Bank account connected. You&apos;re all set!</p>
              </div>
            ) : (
              <>
                <p className={styles.stepBody}>
                  Add your South African bank account so you can receive payouts when your gear is rented.
                </p>

                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Account holder name</label>
                    <input
                      className={styles.input}
                      placeholder="Full name on account"
                      value={bankHolder}
                      onChange={(e) => setBankHolder(e.target.value)}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Bank</label>
                    <select className={styles.input} value={bankName} onChange={(e) => setBankName(e.target.value)}>
                      <option value="">Select your bank</option>
                      {SA_BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>

                  <div className={styles.row2}>
                    <div className={styles.field}>
                      <label className={styles.label}>Account number</label>
                      <input
                        className={styles.input}
                        placeholder="Account number"
                        value={bankNumber}
                        onChange={(e) => setBankNumber(e.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Account type</label>
                      <select className={styles.input} value={bankType} onChange={(e) => setBankType(e.target.value)}>
                        <option value="cheque">Cheque</option>
                        <option value="savings">Savings</option>
                        <option value="transmission">Transmission</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Branch code <span className={styles.optional}>(optional)</span></label>
                    <input
                      className={styles.input}
                      placeholder="e.g. 632005"
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                {bankErr && <p className={styles.errMsg}>{bankErr}</p>}

                <button
                  className={styles.btnPrimary}
                  disabled={!step2Ready || bankSaving}
                  onClick={handleBankSubmit}
                >
                  {bankSaving ? "Saving…" : "Save bank account"}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
