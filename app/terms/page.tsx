import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LegalFooter from "@/components/ui/LegalFooter";
import styles from "../legal.module.css";

export const metadata = { title: "Terms & Conditions — ToolShare" };

export default function TermsPage() {
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
        <h1 className={styles.title}>Terms &amp; Conditions</h1>
        <p className={styles.updated}>Last updated: 12 May 2026</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. About ToolShare</h2>
          <div className={styles.body}>
            <p>
              ToolShare (Pty) Ltd ("ToolShare", "we", "us") operates an online peer-to-peer equipment
              rental marketplace that connects individuals who wish to rent out their equipment ("Lenders")
              with individuals who wish to rent equipment ("Renters"). By creating an account or using our
              platform, you agree to these Terms &amp; Conditions.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Eligibility</h2>
          <div className={styles.body}>
            <ul>
              <li>You must be at least 18 years old to use ToolShare.</li>
              <li>You must provide accurate, complete, and current information when registering.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. The ToolShare marketplace</h2>
          <div className={styles.body}>
            <p>
              ToolShare is a marketplace platform only. We do not own, inspect, or guarantee any items
              listed on the platform. Rental agreements are between Lenders and Renters. ToolShare
              facilitates payments and provides dispute resolution services.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Lender responsibilities</h2>
          <div className={styles.body}>
            <ul>
              <li>List only items you own or have the right to rent out.</li>
              <li>Ensure listings are accurate, including photos, descriptions, and pricing.</li>
              <li>Disclose any damage, defects, or limitations of the item.</li>
              <li>Make the item available at the agreed time and in the described condition.</li>
              <li>Not list items that are illegal, hazardous, or otherwise prohibited.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Renter responsibilities</h2>
          <div className={styles.body}>
            <ul>
              <li>Use rented items only for their intended purpose and in accordance with the lender's instructions.</li>
              <li>Return items on time and in the same condition as received, subject to normal wear and tear.</li>
              <li>Report any damage or loss immediately to ToolShare and the Lender.</li>
              <li>Pay any applicable damage deposit before taking possession of the item.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. Payments and fees</h2>
          <div className={styles.body}>
            <p>
              All payments are processed via Paystack. ToolShare charges a service fee on each
              transaction, displayed at checkout. Lender payouts are subject to a 10% daily escrow
              release schedule to allow time for dispute resolution. Fees are non-refundable once a
              booking is confirmed, except as stated in our Refund Policy.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Damage and liability</h2>
          <div className={styles.body}>
            <p>
              Renters are liable for damage caused beyond normal wear and tear. In the event of damage,
              ToolShare will mediate between Lender and Renter. ToolShare is not liable for any indirect,
              incidental, or consequential loss arising from the use of rented equipment.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>8. Prohibited conduct</h2>
          <div className={styles.body}>
            <ul>
              <li>Circumventing the ToolShare platform to conduct off-platform transactions.</li>
              <li>Submitting false or misleading listings or reviews.</li>
              <li>Harassing, threatening, or defrauding other users.</li>
              <li>Using the platform for any unlawful purpose.</li>
            </ul>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>9. Account suspension and termination</h2>
          <div className={styles.body}>
            <p>
              ToolShare reserves the right to suspend or terminate accounts that violate these Terms,
              generate repeated complaints, or pose a risk to other users or the platform. Where possible,
              we will provide notice and an opportunity to respond.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>10. Dispute resolution</h2>
          <div className={styles.body}>
            <p>
              In the event of a dispute between a Lender and Renter, ToolShare will attempt to mediate
              a resolution in good faith. ToolShare's decision is final for disputes involving amounts
              under the applicable small claims limit. These Terms are governed by the laws of South Africa.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>11. Changes to these Terms</h2>
          <div className={styles.body}>
            <p>
              We may update these Terms from time to time. We will notify registered users of material
              changes via email. Continued use of the platform after changes take effect constitutes
              acceptance of the revised Terms.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>12. Contact</h2>
          <div className={styles.body}>
            <p>
              Questions about these Terms? Email us at{" "}
              <a href="mailto:hello@toolshare.co.za">hello@toolshare.co.za</a>.
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
