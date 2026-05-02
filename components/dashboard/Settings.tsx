"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import styles from "./Settings.module.css";

interface SettingsProps {
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function Settings({ theme, onToggleTheme }: SettingsProps) {
  const { data: session, update: updateSession } = useSession();

  const [name,    setName]    = useState(session?.user?.name?.split(" ")[0]  ?? "");
  const [surname, setSurname] = useState(session?.user?.name?.split(" ").slice(1).join(" ") ?? "");

  const [currentPw, setCurrentPw] = useState("");
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [profileSaving, setProfileSaving] = useState(false);
  const [pwSaving,      setPwSaving]      = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

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
