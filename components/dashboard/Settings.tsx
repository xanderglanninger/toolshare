"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import styles from "./Settings.module.css";
import { useDashboard } from "@/app/dashboard/context";

interface SettingsProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

type UploadSlot = { url: string; preview: string; uploading: boolean; error: string };
const emptySlot = (): UploadSlot => ({ url: "", preview: "", uploading: false, error: "" });

export default function Settings({ theme, onToggleTheme }: SettingsProps) {
  const { data: session, update: updateSession } = useSession();
  const { idVerificationStatus, setIdVerificationStatus } = useDashboard();

  const [name,    setName]    = useState(session?.user?.name?.split(" ")[0]  ?? "");
  const [surname, setSurname] = useState(session?.user?.name?.split(" ").slice(1).join(" ") ?? "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving,      setPwSaving]      = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  // KYC
  const [selfie,     setSelfie]     = useState<UploadSlot>(emptySlot());
  const [idPhoto,    setIdPhoto]    = useState<UploadSlot>(emptySlot());
  const [kycSaving,  setKycSaving]  = useState(false);
  const selfieRef  = useRef<HTMLInputElement>(null);
  const idPhotoRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, kind: "selfie" | "id_photo", set: (s: UploadSlot) => void) {
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
      showToast("Documents submitted for verification.");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", false);
    } finally {
      setKycSaving(false);
    }
  }

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !surname.trim()) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_profile", name: name.trim(), surname: surname.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Update failed");
      await updateSession({ name: `${name.trim()} ${surname.trim()}` });
      showToast("Profile updated successfully.");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", false);
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) return;
    if (newPw !== confirmPw) { showToast("New passwords do not match.", false); return; }
    if (newPw.length < 8)   { showToast("Password must be at least 8 characters.", false); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "change_password", currentPassword: currentPw, newPassword: newPw }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Password change failed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      showToast("Password changed successfully.");
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong.", false);
    } finally {
      setPwSaving(false);
    }
  }

  const initials = `${session?.user?.name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <p className={styles.eyebrow}>Account</p>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>

      {/* ── Personal Information ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionTitle}>Personal Information</p>
            <p className={styles.sectionSub}>Update your name as it appears on your profile.</p>
          </div>
          <div className={styles.avatarRing}>
            <div className={styles.avatar}>{initials}</div>
          </div>
        </div>
        <form className={styles.sectionBody} onSubmit={handleProfileSave}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>First Name</label>
              <input
                className={styles.input}
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="First name"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Surname</label>
              <input
                className={styles.input}
                value={surname}
                onChange={e => setSurname(e.target.value)}
                placeholder="Surname"
                required
              />
            </div>
          </div>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Email</label>
            <input
              className={`${styles.input} ${styles.inputDisabled}`}
              value={session?.user?.email ?? ""}
              disabled
              title="Email cannot be changed"
            />
            <p className={styles.fieldHint}>Email address cannot be changed after registration.</p>
          </div>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.saveBtn} disabled={profileSaving}>
              {profileSaving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Identity Verification ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionTitle}>Identity Verification</p>
            <p className={styles.sectionSub}>
              {idVerificationStatus === "verified"
                ? "Your identity has been verified."
                : idVerificationStatus === "pending"
                ? "Your documents are under review — usually within 24 hours."
                : "Upload a selfie and your SA ID document to unlock bookings and listings."}
            </p>
          </div>
          <div className={`${styles.kycBadge} ${styles[`kycBadge_${idVerificationStatus}`]}`}>
            {idVerificationStatus === "verified" && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
            )}
            {idVerificationStatus === "pending"  && <span className={styles.kycSpinner} />}
            {(idVerificationStatus === "unverified" || idVerificationStatus === "rejected") && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
            )}
            <span>
              {idVerificationStatus === "verified"   ? "Verified"
              : idVerificationStatus === "pending"   ? "Pending"
              : idVerificationStatus === "rejected"  ? "Rejected"
              : "Unverified"}
            </span>
          </div>
        </div>

        {(idVerificationStatus === "unverified" || idVerificationStatus === "rejected") && (
          <form className={styles.sectionBody} onSubmit={handleKycSubmit}>
            {idVerificationStatus === "rejected" && (
              <p className={styles.kycRejectedNote}>Your previous submission was rejected. Please upload clear, legible photos and resubmit.</p>
            )}
            <div className={styles.kycUploadRow}>
              {/* Selfie */}
              <input ref={selfieRef} type="file" accept="image/*" capture="user" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "selfie", setSelfie); }} />
              <div className={styles.kycSlot} onClick={() => selfieRef.current?.click()}>
                {selfie.preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={selfie.preview} alt="Selfie" className={styles.kycThumb} />
                  : <div className={styles.kycSlotEmpty}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                    </div>}
                <div className={styles.kycSlotLabel}>
                  {selfie.uploading ? "Uploading…" : selfie.url ? "✓ Selfie" : "Take / upload selfie"}
                </div>
                {selfie.error && <p className={styles.kycSlotErr}>{selfie.error}</p>}
              </div>

              {/* ID photo */}
              <input ref={idPhotoRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f, "id_photo", setIdPhoto); }} />
              <div className={styles.kycSlot} onClick={() => idPhotoRef.current?.click()}>
                {idPhoto.preview
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={idPhoto.preview} alt="ID document" className={styles.kycThumb} />
                  : <div className={styles.kycSlotEmpty}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <path d="M2 10h20M6 15h4M14 15h4"/>
                      </svg>
                    </div>}
                <div className={styles.kycSlotLabel}>
                  {idPhoto.uploading ? "Uploading…" : idPhoto.url ? "✓ ID photo" : "Upload SA ID document"}
                </div>
                {idPhoto.error && <p className={styles.kycSlotErr}>{idPhoto.error}</p>}
              </div>
            </div>

            <div className={styles.formFooter}>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={!selfie.url || !idPhoto.url || selfie.uploading || idPhoto.uploading || kycSaving}
              >
                {kycSaving ? "Submitting…" : "Submit for verification"}
              </button>
              <p className={styles.kycFine}>Documents are stored securely and only used for identity verification.</p>
            </div>
          </form>
        )}
      </div>

      {/* ── Security / Password ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionTitle}>Security</p>
            <p className={styles.sectionSub}>Change your password. You'll need your current password to confirm.</p>
          </div>
        </div>
        <form className={styles.sectionBody} onSubmit={handlePasswordSave}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Current Password</label>
            <input
              type="password"
              className={styles.input}
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              placeholder="Enter current password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>New Password</label>
              <input
                type="password"
                className={styles.input}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Confirm New Password</label>
              <input
                type="password"
                className={styles.input}
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                autoComplete="new-password"
                required
              />
            </div>
          </div>
          <div className={styles.formFooter}>
            <button type="submit" className={styles.saveBtn} disabled={pwSaving}>
              {pwSaving ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </div>

      {/* ── Appearance ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionTitle}>Appearance</p>
            <p className={styles.sectionSub}>Choose between dark and light mode.</p>
          </div>
        </div>
        <div className={styles.sectionBody}>
          <div className={styles.themeRow}>
            <button
              className={`${styles.themeCard} ${theme === "dark" ? styles.themeCardActive : ""}`}
              onClick={() => theme !== "dark" && onToggleTheme()}
              type="button"
            >
              <span className={styles.themeCardIcon}>◑</span>
              <span className={styles.themeCardLabel}>Dark</span>
              {theme === "dark" && <span className={styles.themeCardCheck}>✓</span>}
            </button>
            <button
              className={`${styles.themeCard} ${theme === "light" ? styles.themeCardActive : ""}`}
              onClick={() => theme !== "light" && onToggleTheme()}
              type="button"
            >
              <span className={styles.themeCardIcon}>☀</span>
              <span className={styles.themeCardLabel}>Light</span>
              {theme === "light" && <span className={styles.themeCardCheck}>✓</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHead}>
          <div>
            <p className={styles.sectionTitle}>Sign out</p>
            <p className={styles.sectionSub}>Sign out of your account on this device.</p>
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
        <div className={`${styles.toast} ${toast.ok ? styles.toastOk : styles.toastErr}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
