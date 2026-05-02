"use client";

import { useState, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import styles from "./dashboard.module.css";
import Logo from "@/components/ui/Logo";
import NotificationBell from "@/components/dashboard/NotificationBell";
import { DashboardProvider, useDashboard } from "./context";
import Spinner from "@/components/ui/Spinner";

const NAV = [
  { id: "picks",         path: "/dashboard",               label: "Today's Picks",  icon: "✦" },
  { id: "listings",      path: "/dashboard/listings",      label: "My Listings",    icon: "◈" },
  { id: "bookings",      path: "/dashboard/bookings",      label: "Bookings",       icon: "◷" },
  { id: "messages",      path: "/dashboard/messages",      label: "Messages",       icon: "◻" },
  { id: "statistics",    path: "/dashboard/statistics",    label: "Statistics",     icon: "▦" },
];

function DashboardShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { userImage, setUserImage, notifUnread, setNotifUnread } = useDashboard();

  const [sideOpen, setSideOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const initials = firstName[0]?.toUpperCase() ?? "?";

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
    } else {
      router.push(`/dashboard/${tab}`);
    }
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
        </div>

      </aside>

      {sideOpen && <div className={styles.overlay} onClick={() => setSideOpen(false)} />}

      {/* ── Main ── */}
      <main className={styles.main}>
        <header className={styles.topbar}>
          <button className={styles.menuBtn} onClick={() => setSideOpen(true)}>☰</button>
          <div className={styles.topbarRight}>
            <span className={styles.topbarGreeting}>Hey, <strong>{firstName}</strong></span>

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
                      <span className={styles.dropdownName}>{session?.user?.name ?? "User"}</span>
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
          onClick={() => navigate("/dashboard/create")}
          aria-label="Create listing"
        >
          ＋
        </button>
      </main>

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
