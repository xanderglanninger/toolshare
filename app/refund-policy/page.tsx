import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LegalFooter from "@/components/ui/LegalFooter";
import styles from "../legal.module.css";

export const metadata = { title: "Refund Policy — ToolShare" };

export default function RefundPolicyPage() {
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
        <h1 className={styles.title}>Refund Policy</h1>
        <p className={styles.updated}>Last updated: 12 May 2026</p>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>1. Overview</h2>
          <div className={styles.body}>
            <p>
              ToolShare facilitates peer-to-peer equipment rentals. Payments are held in escrow and
              released to the lender once the rental period begins. This policy describes when and how
              refunds are issued to renters.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>2. Cancellation by the renter</h2>
          <div className={styles.body}>
            <ul>
              <li><strong>More than 48 hours before the rental start date:</strong> Full refund of the rental amount.</li>
              <li><strong>24–48 hours before the rental start date:</strong> 50% refund of the rental amount.</li>
              <li><strong>Less than 24 hours before the rental start date:</strong> No refund.</li>
            </ul>
            <p>Service fees are non-refundable once a booking is confirmed.</p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>3. Cancellation by the lender</h2>
          <div className={styles.body}>
            <p>
              If a lender cancels a confirmed booking, the renter will receive a full refund of all
              amounts paid, including any service fees. Lenders who repeatedly cancel confirmed bookings
              may have their listings suspended.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>4. Item not as described</h2>
          <div className={styles.body}>
            <p>
              If the item you receive is materially different from what was advertised (e.g. wrong model,
              significant undisclosed damage, or non-functional), please report this to us within
              <strong> 2 hours of pick-up</strong>. We will investigate and, if the claim is upheld,
              issue a full refund and arrange return.
            </p>
            <p>
              Contact us at <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a> with
              photos and your rental reference number.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>5. Damage deposits</h2>
          <div className={styles.body}>
            <p>
              Some listings require a damage deposit. Deposits are held by ToolShare and released within
              <strong> 3 business days</strong> after the item is returned in its agreed condition. If
              damage is disputed, we will mediate and may withhold part or all of the deposit pending
              resolution.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>6. How refunds are processed</h2>
          <div className={styles.body}>
            <p>
              Refunds are returned to the original payment method via Paystack. Processing times depend
              on your bank but are typically <strong>3–7 business days</strong> after ToolShare initiates
              the refund.
            </p>
          </div>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>7. Contact</h2>
          <div className={styles.body}>
            <p>
              For refund requests or disputes, email <a href="mailto:support@toolshare.co.za">support@toolshare.co.za</a>{" "}
              with your booking reference and a brief description of the issue.
            </p>
          </div>
        </div>
      </div>
      <LegalFooter />
    </div>
  );
}
