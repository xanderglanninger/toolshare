import Link from "next/link";
import { Heart } from "lucide-react";
import Logo from "./Logo";
import styles from "./LegalFooter.module.css";

export default function LegalFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <Link href="/">
          <Logo size="sm" />
        </Link>
        <nav className={styles.nav} aria-label="Footer navigation">
          <Link href="/dashboard" className={styles.link}>Browse</Link>
          <Link href="/registration" className={styles.link}>List gear</Link>
          <Link href="/contact" className={styles.link}>Contact</Link>
          <Link href="/faq" className={styles.link}>FAQ</Link>
          <Link href="/terms" className={styles.link}>Terms</Link>
          <Link href="/privacy" className={styles.link}>Privacy</Link>
          <Link href="/refund-policy" className={styles.link}>Refund policy</Link>
        </nav>
      </div>
      <div className={styles.bottom}>
        <span>© 2026 ToolShare. All rights reserved.</span>
        <span className={styles.made}>
          Made with <Heart size={12} fill="currentColor" style={{ color: "#ef4444" }} /> for makers everywhere.
        </span>
      </div>
    </footer>
  );
}
