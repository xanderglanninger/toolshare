"use client";

import { useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./dashboard.module.css";
import Logo from "@/components/ui/Logo";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { DashboardProvider, useDashboard } from "./context";
import Spinner from "@/components/ui/Spinner";
import ListingOnboardingModal from "@/components/ui/ListingOnboardingModal";

const ADMIN_NAV = [
  { id: "stats",   path: "/dashboard/admin/stats",   label: "Statistics",        icon: "▦" },
  { id: "kyc",     path: "/dashboard/admin/kyc",     label: "KYC Verifications", icon: "◈" },
  { id: "users",   path: "/dashboard/admin/users",   label: "User Management",   icon: "◉" },
  { id: "disputes",path: "/dashboard/admin/disputes",label: "Disputes",          icon: "⚑" },
  { id: "ads",     path: "/dashboard/admin/ads",     label: "Sponsored Ads",     icon: "◎" },
];

const NAV = [
  { id: "picks",         path: "/dashboard",               label: "Today's Picks",  icon: "✦" },
  { id: "listings",      path: "/dashboard/listings",      label: "My Listings",    icon: "◈" },
  { id: "bookings",      path: "/dashboard/bookings",      label: "Bookings",       icon: "◷" },
  { id: "messages",      path: "/dashboard/messages",      label: "Messages",       icon: "◻" },
  { id: "statistics",    path: "/dashboard/statistics",    label: "Statistics",     icon: "▦" },
];

function VerifiedBadge() {
  return (
    <svg
      className={styles.verifiedBadge}
      width="24" height="20" viewBox="0 1 24 17"
      fill="none" aria-label="Verified"
    >
      <path
        d="M12 2l2.4 4.8 5.3.8-3.85 3.75.9 5.3L12 14.1l-4.75 2.55.9-5.3L4.3 7.6l5.3-.8L12 2z"
        fill="#f5a800" stroke="#f5a800" strokeWidth="1" strokeLinejoin="round"
      />
      <path d="M9.5 10l2 2 3.5-3.5" stroke="#1c1a17" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { userImage, notifUnread, setNotifUnread, idVerificationStatus, setIdVerificationStatus, hasBankAccount, setHasBankAccount, showListingGate, setShowListingGate, isAdmin } = useDashboard();

  const [sideOpen, setSideOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const firstName  = session?.user?.name?.split(" ")[0] ?? "there";
  const initials   = firstName[0]?.toUpperCase() ?? "?";
  const isVerified = idVerificationStatus === "verified";

  function isActive(path: string) {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  }

  function navigate(path: string) {
    router.push(path);
    setSideOpen(false);
    setDropdownOpen(false);
  }

  function handleNotifNavigate(tab: string, linkData?: string) {
    setNotifUnread(0);
    if (tab === "messages" && linkData) {
      router.push(`/dashboard/messages?thread=${linkData}`);
    } else if (tab === "bookings" && linkData) {
      try {
        const parsed = JSON.parse(linkData);
        if (parsed.bookingId) { router.push(`/dashboard/bookings/${parsed.bookingId}/wizard`); return; }
      } catch { /* plain bookingId */ }
      router.push(`/dashboard/bookings/${linkData}/wizard`);
    } else {
      router.push(`/dashboard/${tab}`);
    }
  }

  function handleFab() {
    const idDone = idVerificationStatus === "verified" || idVerificationStatus === "pending";
    if (!idDone || !hasBankAccount) { setShowListingGate(true); return; }
    navigate("/dashboard/create");
  }

  return (
    <div className={styles.shell}>

      {/* ── Sidebar ── */}
      <aside className={`${styles.sidebar}${sideOpen ? " " + styles.sideOpen : ""}`}>
        <div className={styles.sideTop}>
          <Logo size="md" variant="dark" />
          <nav className={styles.nav}>
            {NAV.map((item) => (
              <button
                key={item.id}
                className={`${styles.navItem}${isActive(item.path) ? " " + styles.navActive : ""}`}
                onClick={() => navigate(item.path)}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.id === "notifications" && notifUnread > 0 && (
                  <span className={styles.navBadge}>{notifUnread > 99 ? "99+" : notifUnread}</span>
                )}
              </button>
            ))}
          </nav>

          {isAdmin && (
            <div className={styles.adminNav}>
              <p className={styles.adminNavLabel}>Admin</p>
              {ADMIN_NAV.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${styles.adminNavItem}${isActive(item.path) ? " " + styles.navActive : ""}`}
                  onClick={() => navigate(item.path)}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {sideOpen && <div className={styles.overlay} onClick={() => setSideOpen(false)} />}

      {/* ── Main ── */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSideOpen(true)}>☰</button>
          <div className={styles.topbarRight}>
            <span className={styles.topbarGreeting}>
              Hey, <strong>{firstName}</strong>
              {isVerified && <VerifiedBadge />}
            </span>

            <NotificationBell onNavigate={handleNotifNavigate} />

            <div className={styles.avatarWrap} ref={dropdownRef}>
              <button
                className={styles.topbarAvatarBtn}
                onClick={() => setDropdownOpen((o) => !o)}
                aria-label="Account menu"
              >
                {userImage
                  ? <img src={userImage} alt="" className={styles.topbarAvatarImg} />
                  : initials}
              </button>

              {dropdownOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>
                      {userImage
                        ? <img src={userImage} alt="" className={styles.dropdownAvatarImg} />
                        : initials}
                    </div>
                    <div className={styles.dropdownMeta}>
                      <span className={styles.dropdownName}>
                        {session?.user?.name ?? "User"}
                        {isVerified && <VerifiedBadge />}
                      </span>
                      <span className={styles.dropdownEmail}>{session?.user?.email ?? ""}</span>
                    </div>
                  </div>
                  <div className={styles.dropdownDivider} />
                  <button className={styles.dropdownItem} onClick={() => navigate("/dashboard/settings")}>
                    <span>◉</span> Profile
                  </button>
                  <button className={styles.dropdownItem} onClick={() => navigate("/dashboard/settings")}>
                    <span>⚙</span> Settings
                  </button>
                  <div className={styles.dropdownDivider} />
                  <button
                    className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                    disabled={signingOut}
                    onClick={() => { setSigningOut(true); signOut({ callbackUrl: "/login" }); }}
                  >
                    {signingOut ? <Spinner /> : <span>→</span>} {signingOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className={styles.content}>{children}</div>

        <button
          className={styles.createFab}
          onClick={handleFab}
          aria-label="Create listing"
        >
          ＋
        </button>
      </main>

      {showListingGate && (
        <ListingOnboardingModal
          idVerificationStatus={idVerificationStatus}
          hasBankAccount={hasBankAccount}
          onClose={() => setShowListingGate(false)}
          onIdSubmitted={() => setIdVerificationStatus("pending")}
          onBankSaved={() => { setHasBankAccount(true); setShowListingGate(false); navigate("/dashboard/create"); }}
        />
      )}

    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardProvider>
  );
}
