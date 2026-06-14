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
  const { userImage, notifUnread, setNotifUnread, idVerificationStatus, setIdVerificationStatus, hasBankAccount, setHasBankAccount, showListingGate, setShowListingGate, isAdmin, theme } = useDashboard();

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

  const MOBILE_NAV = [
    { id: "picks",         path: "/dashboard",                  label: "Home" },
    { id: "listings",      path: "/dashboard/listings",         label: "Listings" },
    { id: "bookings",      path: "/dashboard/bookings",         label: "Bookings" },
    { id: "messages",      path: "/dashboard/messages",         label: "Messages" },
    { id: "notifications", path: "/dashboard/notifications",    label: "Alerts" },
  ];

  // SVG icons for mobile bottom nav
  const mobileNavIcons: Record<string, React.ReactNode> = {
    picks: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    listings: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    bookings: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
    messages: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    notifications: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
    ),
    profile: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  };

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
          <Logo size="md" variant={theme === "dark" ? "dark" : "light"} />
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

        {/* ── Mobile top nav ── */}
        <nav className={styles.mobileBottomNav}>
          {/* Row 1: logo + avatar */}
          <div className={styles.mobileNavTop}>
            <Logo size="sm" variant={theme === "dark" ? "dark" : "light"} />
            <div className={styles.mobileNavRight}>
              <button
                className={styles.mobileNavIconBtn}
                onClick={() => navigate("/dashboard/search")}
                aria-label="Search"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <button
                className={styles.mobileNavAvatarBtn}
                onClick={() => navigate("/dashboard/settings")}
                aria-label="Profile"
              >
                {userImage ? <img src={userImage} alt="" /> : initials}
              </button>
            </div>
          </div>

          {/* Row 2: nav icons */}
          <div className={styles.mobileNavCenter}>
            {MOBILE_NAV.map((item) => (
              <button
                key={item.id}
                className={`${styles.mobileNavItem}${isActive(item.path) ? " " + styles.mobileNavActive : ""}`}
                onClick={() => navigate(item.path)}
                aria-label={item.label}
              >
                <span className={styles.mobileNavIcon}>
                  {item.id === "notifications" && notifUnread > 0
                    ? <span style={{ position: "relative", display: "inline-flex" }}>
                        {mobileNavIcons[item.id]}
                        <span style={{ position: "absolute", top: -4, right: -6, background: "#f5a800", color: "#1c1a17", borderRadius: "50%", fontSize: 9, fontWeight: 700, minWidth: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>
                          {notifUnread > 99 ? "99+" : notifUnread}
                        </span>
                      </span>
                    : mobileNavIcons[item.id]}
                </span>
                <span className={styles.mobileNavLabel}>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
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
