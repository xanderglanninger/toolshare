import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LegalFooter from "@/components/ui/LegalFooter";
import styles from "../legal.module.css";

export const metadata = { title: "Privacy Policy — ToolShare" };

export default function PrivacyPage() {
  return (
    <div className={styles.page} data-theme="dark">
      <nav className={styles.nav}>
        <Logo size="sm" />
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to home
        </Link>
      </nav>

      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Legal</span>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: 12 May 2026</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Who we are</h2>
          <div className={styles.body}>
            <p>
              ToolShare (Pty) Ltd ("ToolShare", "we", "us") is responsible for the personal information
              you provide when using our platform. We are committed to protecting your privacy in
              accordance with the Protection of Personal Information Act (POPIA) and applicable South
              African law.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Information we collect</h2>
          <div className={styles.body}>
            <ul>
              <li><strong>Account information:</strong> name, email address, profile photo.</li>
              <li><strong>Identity verification:</strong> government-issued ID (where required for high-value listings).</li>
              <li><strong>Transaction data:</strong> rental history, payment amounts, booking details.</li>
              <li><strong>Communications:</strong> messages exchanged on the platform, support emails.</li>
              <li><strong>Device &amp; usage data:</strong> IP address, browser type, pages visited, and interaction logs collected automatically.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. How we use your information</h2>
          <div className={styles.body}>
            <ul>
              <li>To operate the ToolShare platform and process rentals.</li>
              <li>To verify your identity and prevent fraud.</li>
              <li>To process payments via Paystack.</li>
              <li>To communicate with you about your account, bookings, and support queries.</li>
              <li>To improve our platform and user experience.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Sharing your information</h2>
          <div className={styles.body}>
            <p>We do not sell your personal information. We share it only:</p>
            <ul>
              <li>With the other party in a rental transaction (e.g. your name and contact details).</li>
              <li>With Paystack to process payments.</li>
              <li>With service providers who help us operate the platform (e.g. hosting, email).</li>
              <li>When required by law or to protect the rights and safety of our users.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Data retention</h2>
          <div className={styles.body}>
            <p>
              We retain your personal information for as long as your account is active or as needed to
              provide services, comply with legal obligations, resolve disputes, and enforce agreements.
              You may request deletion of your account and associated data by emailing us.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Cookies</h2>
          <div className={styles.body}>
            <p>
              We use session cookies to keep you logged in and functional cookies for platform features.
              We do not use third-party advertising cookies. You can disable cookies in your browser
              settings, though some features may not work correctly.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Your rights</h2>
          <div className={styles.body}>
            <p>Under POPIA, you have the right to:</p>
            <ul>
              <li>Access the personal information we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your personal information (subject to legal requirements).</li>
              <li>Object to the processing of your information.</li>
            </ul>
            <p>
              To exercise these rights, email us at{" "}
              <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a>.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Security</h2>
          <div className={styles.body}>
            <p>
              We implement industry-standard security measures including HTTPS encryption, secure
              password hashing, and access controls. No system is completely secure, and we cannot
              guarantee absolute security. We will notify you promptly in the event of a data breach
              that affects your information.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Contact</h2>
          <div className={styles.body}>
            <p>
              For privacy-related enquiries, contact our Information Officer at{" "}
              <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a>.
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
