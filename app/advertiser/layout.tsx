import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "@/components/ui/Logo";
import styles from "./advertiser.module.css";

export default function AdvertiserLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.logoLink}><Logo /></Link>
        <nav className={styles.nav}>
          <Link href="/advertiser" className={styles.navLink}>Advertise</Link>
          <Link href="/advertiser/dashboard" className={styles.navLink}>My Campaigns</Link>
          <Link href="/dashboard" className={styles.navLink}>Dashboard</Link>
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
