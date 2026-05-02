"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import styles from "./Profile.module.css";

type AccountStatus =
  | { state: "loading" }
  | { state: "not_connected" }
  | { state: "pending"; detailsSubmitted: boolean }
  | { state: "active"; payoutsEnabled: boolean };

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

export default function Profile({ onImageUpdate, theme, onToggleTheme }: Props) {
  const { data: session, update: updateSession } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
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

  const [status,         setStatus]         = useState<AccountStatus>({ state: "loading" });
  const [connecting,     setConnecting]     = useState(false);

  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);

  const pwStrength = getPasswordStrength(newPw);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((j) => { if (j.data?.image) setAvatarUrl(j.data.image); })
      .catch(() => {});

    if (searchParams.get("connected") === "true") {
      router.replace("/dashboard?tab=settings");
    }
    loadPayoutStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadPayoutStatus() {
    try {
      const res  = await fetch("/api/connect/status");
      const json = await res.json();
      if (!res.ok || !json.data) { setStatus({ state: "not_connected" }); return; }
      const d = json.data;
      if (!d.connected) {
        setStatus({ state: "not_connected" });
      } else if (d.chargesEnabled) {
        setStatus({ state: "active", payoutsEnabled: d.payoutsEnabled });
      } else {
        setStatus({ state: "pending", detailsSubmitted: d.detailsSubmitted });
      }
    } catch {
      setStatus({ state: "not_connected" });
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res  = await fetch("/api/connect/onboard", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to start onboarding");
      window.location.href = json.data.url;
    } catch (err: any) {
      showToast(err.message ?? "Something went wrong", "err");
      setConnecting(false);
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
                Link your bank account to receive earnings when someone rents your items.
              </p>
            </div>
          </div>
          <StatusChip status={status} />
        </div>
        <div className={styles.sectionBody}>
          {status.state === "loading" && (
            <div className={styles.loadingRow}>
              <span className={styles.loadingDot} /><span className={styles.loadingDot} /><span className={styles.loadingDot} />
              <span className={styles.loadingText}>Checking account status…</span>
            </div>
          )}
          {status.state === "not_connected" && (
            <>
              <div className={styles.infoBox}>
                <p className={styles.infoTitle}>How payouts work</p>
                <ol className={styles.infoList}>
                  <li>Connect your bank account via Stripe's secure onboarding</li>
                  <li>When a borrower pays for your listing, the money is transferred directly to your account</li>
                  <li>Stripe deposits funds on a rolling 2-day basis</li>
                </ol>
              </div>
              <button className={styles.connectBtn} onClick={handleConnect} disabled={connecting}>
                {connecting ? <><span className={styles.inlineSpinner} /> Redirecting to Stripe…</> : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                    </svg>
                    Connect bank account
                  </>
                )}
              </button>
            </>
          )}
          {status.state === "pending" && (
            <>
              <div className={styles.warningBox}>
                <span className={styles.warningIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </span>
                <div>
                  <p className={styles.warningTitle}>Setup incomplete</p>
                  <p className={styles.warningDesc}>
                    {status.detailsSubmitted
                      ? "Your details have been submitted and are under review by Stripe."
                      : "You haven't finished setting up your payout account. Complete the steps to start receiving payments."}
                  </p>
                </div>
              </div>
              {!status.detailsSubmitted && (
                <button className={styles.connectBtn} onClick={handleConnect} disabled={connecting}>
                  {connecting ? <><span className={styles.inlineSpinner} /> Redirecting…</> : "Continue setup →"}
                </button>
              )}
            </>
          )}
          {status.state === "active" && (
            <div className={styles.successBox}>
              <span className={styles.successIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </span>
              <div>
                <p className={styles.successTitle}>Bank account connected</p>
                <p className={styles.successDesc}>
                  Your account is active. Earnings from your listings will be automatically
                  transferred to your bank account after each completed booking. Payouts are
                  processed by Stripe and typically arrive within 2 business days.
                </p>
              </div>
            </div>
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

      <p className={styles.stripeNote}>
        Payments and payouts are powered by{" "}
        <span className={styles.stripeWordmark}>Stripe</span>. Your financial
        information is handled securely and never stored on our servers.
      </p>

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

function StatusChip({ status }: { status: AccountStatus }) {
  if (status.state === "loading")       return null;
  if (status.state === "not_connected") return <span className={`${styles.chip} ${styles.chipGrey}`}>Not connected</span>;
  if (status.state === "pending")       return <span className={`${styles.chip} ${styles.chipAmber}`}>Setup incomplete</span>;
  return <span className={`${styles.chip} ${styles.chipGreen}`}>Active</span>;
}
