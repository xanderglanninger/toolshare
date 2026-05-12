import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LegalFooter from "@/components/ui/LegalFooter";
import styles from "../legal.module.css";

export const metadata = { title: "Contact Us — ToolShare" };

export default function ContactPage() {
  return (
    <div className={styles.page} data-theme="dark">
      <nav className={styles.nav}>
        <Logo size="sm" />
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to home
        </Link>
      </nav>

      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Get in touch</span>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.subtitle}>We're here to help. Reach out through any of the channels below.</p>
        <p className={styles.updated}>Response time: within 1–2 business days</p>

        <div className={styles.contactGrid}>
          <div className={styles.contactCard}>
            <div className={styles.contactCardLabel}>Email</div>
            <div className={styles.contactCardValue}>
              <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a>
            </div>
          </div>
          <div className={styles.contactCard}>
            <div className={styles.contactCardLabel}>Business enquiries</div>
            <div className={styles.contactCardValue}>
              <a href="mailto:hello@toolshare.co.za">hello@toolshare.co.za</a>
            </div>
          </div>
          <div className={styles.contactCard}>
            <div className={styles.contactCardLabel}>Location</div>
            <div className={styles.contactCardValue}>Cape Town, South Africa</div>
          </div>
        </div>

        <hr className={styles.divider} />

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Support hours</h2>
          <div className={styles.body}>
            <p>Monday – Friday: 09:00 – 17:00 SAST</p>
            <p>Saturday: 09:00 – 13:00 SAST</p>
            <p>Sunday & public holidays: Closed</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Disputes & urgent matters</h2>
          <div className={styles.body}>
            <p>
              If you have an active rental dispute or an urgent issue (e.g. damage, missing item,
              safety concern), please email <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a> with
              the subject line <strong>URGENT</strong> and your rental reference number. We aim to respond
              within 4 business hours.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Registered business details</h2>
          <div className={styles.body}>
            <p>ToolShare (Pty) Ltd</p>
            <p>Cape Town, Western Cape, South Africa</p>
            <p>Email: <a href="mailto:hello@toolshare.co.za">hello@toolshare.co.za</a></p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
