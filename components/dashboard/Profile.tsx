"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import styles from "./Profile.module.css";
import { useDashboard } from "@/app/dashboard/context";

interface BankAccount {
  bankAccountHolder: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountType: string;
  bankBranchCode: string;
}

const SA_BANKS: { name: string; code: string }[] = [
  { name: "ABSA",           code: "632005" },
  { name: "Capitec",        code: "470010" },
  { name: "FNB",            code: "250655" },
  { name: "Nedbank",        code: "198765" },
  { name: "Standard Bank",  code: "051001" },
  { name: "Investec",       code: "580105" },
  { name: "African Bank",   code: "430000" },
  { name: "TymeBank",       code: "678910" },
  { name: "Discovery Bank", code: "679000" },
];

interface Props {
  onImageUpdate?: (url: string) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { score, label: "Weak",   color: "#ef4444" };
  if (score <= 3) return { score, label: "Fair",   color: "#f5a800" };
  if (score <= 4) return { score, label: "Good",   color: "#3b82f6" };
  return             { score, label: "Strong", color: "#22c55e" };
}

type UploadSlot = { url: string; preview: string; uploading: boolean; error: string };
const emptySlot = (): UploadSlot => ({ url: "", preview: "", uploading: false, error: "" });

export default function Profile({ onImageUpdate, theme, onToggleTheme }: Props) {
  const { data: session, update: updateSession } = useSession();
  const { idVerificationStatus, setIdVerificationStatus } = useDashboard();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl,      setAvatarUrl]      = useState<string | null>(null);
  const [uploading,      setUploading]      = useState(false);

  const [name,           setName]           = useState(session?.user?.name?.split(" ")[0]  ?? "");
  const [surname,        setSurname]        = useState(session?.user?.name?.split(" ").slice(1).join(" ") ?? "");
  const [profileSaving,  setProfileSaving]  = useState(false);

  const [currentPw,      setCurrentPw]      = useState("");
  const [newPw,          setNewPw]          = useState("");
  const [confirmPw,      setConfirmPw]      = useState("");
  const [showCurrent,    setShowCurrent]    = useState(false);
  const [showNew,        setShowNew]        = useState(false);
  const [pwSaving,       setPwSaving]       = useState(false);

  const [bank, setBank] = useState<BankAccount>({
    bankAccountHolder: "", bankName: "", bankAccountNumber: "",
    bankAccountType: "cheque", bankBranchCode: "",
  });
  const [bankSaving,        setBankSaving]        = useState(false);
  const [bankLoaded,        setBankLoaded]        = useState(false);
  const [hasPayoutAccount,  setHasPayoutAccount]  = useState(false);

  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const [selfie,    setSelfie]    = useState<UploadSlot>(emptySlot());
  const [idPhoto,   setIdPhoto]   = useState<UploadSlot>(emptySlot());
  const [kycSaving, setKycSaving] = useState(false);
  const selfieRef  = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  const pwStrength = getPasswordStrength(newPw);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => { if (j.data?.image) setAvatarUrl(j.data.image); })
      .catch(() => {});

    loadBankAccount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBankAccount() {
    try {
      const res  = await fetch("/api/settings/bank-account");
      const json = await res.json();
      if (res.ok && json.data) {
        setBank({
          bankAccountHolder: json.data.bankAccountHolder ?? "",
          bankName:          json.data.bankName          ?? "",
          bankAccountNumber: json.data.bankAccountNumber ?? "",
          bankAccountType:   json.data.bankAccountType   ?? "cheque",
          bankBranchCode:    json.data.bankBranchCode    ?? "",
        });
        setHasPayoutAccount(!!json.data.hasPayoutAccount);
      }
    } catch {}
    setBankLoaded(true);
  }

  async function handleBankSave(e: React.FormEvent) {
    e.preventDefault();
    if (!bank.bankAccountHolder || !bank.bankName || !bank.bankAccountNumber || !bank.bankAccountType || !bank.bankBranchCode) {
      showToast("Please fill in all required bank account fields.", "err"); return;
    }
    setBankSaving(true);
    try {
      const res  = await fetch("/api/settings/bank-account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bank),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save bank account");
      setHasPayoutAccount(true);
      showToast("Bank account connected! You will receive daily EFT payouts.", "ok");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", "err");
    } finally {
      setBankSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const uploadRes  = await fetch("/api/upload", { method: "POST", body: form });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadJson.error ?? "Upload failed");
      const url: string = uploadJson.data.url;

      const saveRes  = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile_image", imageUrl: url }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveJson.error ?? "Failed to save image");

      setAvatarUrl(url);
      onImageUpdate?.(url);
      showToast("Profile photo updated!", "ok");
    } catch (err: any) {
      showToast(err.message ?? "Upload failed", "err");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !surname.trim()) return;
    setProfileSaving(true);
    try {
      const res  = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", name: name.trim(), surname: surname.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await updateSession({ name: `${name.trim()} ${surname.trim()}` });
      showToast("Profile updated!", "ok");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", "err");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) { showToast("New passwords do not match.", "err"); return; }
    if (newPw.length < 8)   { showToast("Password must be at least 8 characters.", "err"); return; }
    setPwSaving(true);
    try {
      const res  = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Password change failed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed!", "ok");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", "err");
    } finally {
      setPwSaving(false);
    }
  }

  async function uploadKycFile(file: File, kind: "selfie" | "id_photo", set: (s: UploadSlot) => void) {
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

  async function handleKycSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selfie.url || !idPhoto.url) return;
    setKycSaving(true);
    try {
      const res  = await fetch("/api/users/kyc-docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selfieUrl: selfie.url, idPhotoUrl: idPhoto.url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");
      setIdVerificationStatus("pending");
      showToast("Documents submitted — you'll be notified once verified.", "ok");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", "err");
    } finally {
      setKycSaving(false);
    }
  }

  function showToast(msg: string, kind: "ok" | "err") {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4000);
  }

  const fullName = session?.user?.name ?? "—";
  const initials = fullName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.pageTitle}>Profile &amp; Settings</h1>
      </div>

      {/* ── Identity hero ── */}
      <div className={styles.identityCard}>
        <div className={styles.identityGlow} />
        <div className={styles.avatarWrap}>
          <div className={styles.avatarRing}>
            {avatarUrl
              ? <img src={avatarUrl} alt="Profile" className={styles.avatarImg} />
              : <div className={styles.avatar}>{initials}</div>
            }
          </div>
          <button
            className={styles.avatarEditBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Change profile photo"
          >
            {uploading ? (
              <span className={styles.avatarSpinner} />
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className={styles.fileInput}
            onChange={handleAvatarChange}
          />
        </div>
        <div className={styles.identityInfo}>
          <p className={styles.identityName}>{fullName}</p>
          <p className={styles.identityEmail}>{session?.user?.email ?? "—"}</p>
          <button
            className={styles.changePhotoLink}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><span className={styles.inlineSpinner} /> Uploading…</>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Change profile photo
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Personal Information ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Personal Information</p>
              <p className={styles.sectionSub}>Update your name as it appears on your profile.</p>
            </div>
          </div>
        </div>
        <form className={styles.sectionBody} onSubmit={handleProfileSave}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>First Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Surname</label>
              <input
                className={styles.input}
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                placeholder="Surname"
                required
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWithBadge}>
              <input
                className={`${styles.input} ${styles.inputDisabled}`}
                value={session?.user?.email ?? ""}
                disabled
                title="Email cannot be changed"
              />
              <span className={styles.lockedBadge}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Locked
              </span>
            </div>
            <p className={styles.fieldHint}>Email address cannot be changed after registration.</p>
          </div>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.saveBtn} disabled={profileSaving}>
              {profileSaving ? <><span className={styles.inlineSpinner} /> Saving…</> : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Identity Verification ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Identity Verification</p>
              <p className={styles.sectionSub}>
                {idVerificationStatus === "verified"
                  ? "Your identity is verified. You can book and list equipment."
                  : idVerificationStatus === "pending"
                  ? "Documents received — under review, usually within 24 hours."
                  : "Verify your identity to book or list equipment on the platform."}
              </p>
            </div>
          </div>
          <span className={`${styles.chip} ${
            idVerificationStatus === "verified"  ? styles.chipGreen :
            idVerificationStatus === "pending"   ? styles.chipAmber :
            idVerificationStatus === "rejected"  ? styles.chipRed   : styles.chipGrey
          }`}>
            {idVerificationStatus === "verified"  ? "✓ Verified"  :
             idVerificationStatus === "pending"   ? "Pending"     :
             idVerificationStatus === "rejected"  ? "Rejected"    : "Not verified"}
          </span>
        </div>

        {(idVerificationStatus === "unverified" || idVerificationStatus === "rejected") && (
          <form className={styles.sectionBody} onSubmit={handleKycSubmit}>
            {idVerificationStatus === "rejected" && (
              <div className={styles.warningBox}>
                <span className={styles.warningIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                <div>
                  <p className={styles.warningTitle}>Submission rejected</p>
                  <p className={styles.warningDesc}>Please upload clearer photos and resubmit.</p>
                </div>
              </div>
            )}
            <div className={styles.kycUploadRow}>
              <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadKycFile(f, "selfie", setSelfie); }} />
              <div className={styles.kycSlot} onClick={() => selfieRef.current?.click()}>
                {selfie.preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={selfie.preview} alt="Selfie" className={styles.kycThumb} />
                  : <div className={styles.kycSlotEmpty}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>}
                <div className={styles.kycSlotLabel}>
                  {selfie.uploading ? "Uploading…" : selfie.url ? "✓ Selfie ready" : "Take / upload selfie"}
                </div>
                {selfie.error && <p className={styles.kycSlotErr}>{selfie.error}</p>}
              </div>

              <input ref={idPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadKycFile(f, "id_photo", setIdPhoto); }} />
              <div className={styles.kycSlot} onClick={() => idPhotoRef.current?.click()}>
                {idPhoto.preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={idPhoto.preview} alt="ID document" className={styles.kycThumb} />
                  : <div className={styles.kycSlotEmpty}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4M14 15h4"/></svg>
                    </div>}
                <div className={styles.kycSlotLabel}>
                  {idPhoto.uploading ? "Uploading…" : idPhoto.url ? "✓ ID ready" : "Upload SA ID document"}
                </div>
                {idPhoto.error && <p className={styles.kycSlotErr}>{idPhoto.error}</p>}
              </div>
            </div>
            <div className={styles.formFooter}>
              <button type="submit" className={styles.saveBtn}
                disabled={!selfie.url || !idPhoto.url || selfie.uploading || idPhoto.uploading || kycSaving}>
                {kycSaving ? <><span className={styles.inlineSpinner} /> Submitting…</> : "Submit for verification"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Security ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Security</p>
              <p className={styles.sectionSub}>Change your password. You'll need your current password to confirm.</p>
            </div>
          </div>
        </div>
        <form className={styles.sectionBody} onSubmit={handlePasswordSave}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Current Password</label>
            <div className={styles.passwordWrap}>
              <input
                type={showCurrent ? "text" : "password"}
                className={styles.input}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="Enter current password"
                autoComplete="current-password"
                required
              />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowCurrent(s => !s)} tabIndex={-1} aria-label={showCurrent ? "Hide" : "Show"}>
                {showCurrent ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <div className={styles.passwordWrap}>
                <input
                  type={showNew ? "text" : "password"}
                  className={styles.input}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowNew(s => !s)} tabIndex={-1} aria-label={showNew ? "Hide" : "Show"}>
                  {showNew ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
              {newPw && (
                <div className={styles.strengthWrap}>
                  <div className={styles.strengthBar}>
                    {[1,2,3,4,5].map(i => (
                      <div
                        key={i}
                        className={styles.strengthSegment}
                        style={{ background: i <= pwStrength.score ? pwStrength.color : undefined }}
                      />
                    ))}
                  </div>
                  <span className={styles.strengthLabel} style={{ color: pwStrength.color }}>{pwStrength.label}</span>
                </div>
              )}
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                className={`${styles.input} ${confirmPw && confirmPw !== newPw ? styles.inputError : ""}`}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
              {confirmPw && confirmPw !== newPw && (
                <p className={styles.fieldError}>Passwords don't match</p>
              )}
            </div>
          </div>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.saveBtn} disabled={pwSaving}>
              {pwSaving ? <><span className={styles.inlineSpinner} /> Changing…</> : "Change password"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Payout Account ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Payout Account</p>
              <p className={styles.sectionSub}>
                Your South African bank account for receiving daily EFT rental payments.
              </p>
            </div>
          </div>
          {bankLoaded && (
            <span className={`${styles.chip} ${hasPayoutAccount ? styles.chipGreen : styles.chipGrey}`}>
              {hasPayoutAccount ? "✓ Connected" : "Not connected"}
            </span>
          )}
        </div>
        <div className={styles.sectionBody}>
          {!bankLoaded ? (
            <div className={styles.loadingRow}>
              <span className={styles.loadingDot} /><span className={styles.loadingDot} /><span className={styles.loadingDot} />
              <span className={styles.loadingText}>Loading…</span>
            </div>
          ) : (
            <form onSubmit={handleBankSave}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Account holder name *</label>
                  <input className={styles.input} value={bank.bankAccountHolder}
                    onChange={e => setBank(b => ({ ...b, bankAccountHolder: e.target.value }))}
                    placeholder="Full name as on bank account" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Bank *</label>
                  <select
                    className={styles.input}
                    value={bank.bankName}
                    onChange={e => {
                      const selected = SA_BANKS.find(b => b.name === e.target.value);
                      setBank(b => ({
                        ...b,
                        bankName:      e.target.value,
                        bankBranchCode: selected?.code ?? b.bankBranchCode,
                      }));
                    }}
                  >
                    <option value="">Select bank…</option>
                    {SA_BANKS.map(b => (
                      <option key={b.code} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Account number *</label>
                  <input className={styles.input} value={bank.bankAccountNumber}
                    onChange={e => setBank(b => ({ ...b, bankAccountNumber: e.target.value }))}
                    placeholder="e.g. 1234567890" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Account type *</label>
                  <select className={styles.input} value={bank.bankAccountType}
                    onChange={e => setBank(b => ({ ...b, bankAccountType: e.target.value }))}>
                    <option value="cheque">Cheque / Current</option>
                    <option value="savings">Savings</option>
                    <option value="transmission">Transmission</option>
                  </select>
                </div>
              </div>
              <div className={styles.formFooter}>
                <button type="submit" className={styles.saveBtn} disabled={bankSaving}>
                  {bankSaving ? <><span className={styles.inlineSpinner} /> Connecting…</> : hasPayoutAccount ? "Update bank account" : "Connect bank account"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Appearance ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={styles.sectionIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Appearance</p>
              <p className={styles.sectionSub}>Choose your preferred colour scheme.</p>
            </div>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.themeRow}>
            <button
              className={`${styles.themeCard} ${theme === "dark" ? styles.themeCardActive : ""}`}
              onClick={() => theme !== "dark" && onToggleTheme()}
              type="button"
            >
              <div className={styles.themePreview} data-preview="dark">
                <div className={styles.previewBar} />
                <div className={styles.previewLines}>
                  <div className={styles.previewLine} style={{ width: "60%" }} />
                  <div className={styles.previewLine} style={{ width: "40%" }} />
                </div>
              </div>
              <div className={styles.themeCardFooter}>
                <span className={styles.themeCardLabel}>Dark</span>
                {theme === "dark" && (
                  <span className={styles.themeCardCheck}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </div>
            </button>
            <button
              className={`${styles.themeCard} ${theme === "light" ? styles.themeCardActive : ""}`}
              onClick={() => theme !== "light" && onToggleTheme()}
              type="button"
            >
              <div className={styles.themePreview} data-preview="light">
                <div className={styles.previewBar} />
                <div className={styles.previewLines}>
                  <div className={styles.previewLine} style={{ width: "60%" }} />
                  <div className={styles.previewLine} style={{ width: "40%" }} />
                </div>
              </div>
              <div className={styles.themeCardFooter}>
                <span className={styles.themeCardLabel}>Light</span>
                {theme === "light" && (
                  <span className={styles.themeCardCheck}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ── Sign out ── */}
      <div className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHead}>
          <div className={styles.sectionHeadLeft}>
            <div className={`${styles.sectionIcon} ${styles.sectionIconDanger}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </div>
            <div>
              <p className={styles.sectionTitle}>Sign out</p>
              <p className={styles.sectionSub}>Sign out of your account on this device.</p>
            </div>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <button
            className={styles.dangerBtn}
            onClick={() => signOut({ callbackUrl: "/login" })}
            type="button"
          >
            Sign out
          </button>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.kind === "ok" ? styles.toastOk : styles.toastErr}`}>
          {toast.kind === "ok" ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

