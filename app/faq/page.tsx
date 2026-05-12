"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import Logo from "@/components/ui/Logo";
import LegalFooter from "@/components/ui/LegalFooter";
import styles from "../legal.module.css";

const FAQS = [
  {
    q: "How does ToolShare work?",
    a: "ToolShare is a peer-to-peer equipment rental marketplace. Browse listings from people in your area, book the item for the dates you need, pay securely online, and arrange pick-up with the owner. Return the item at the end of your rental period.",
  },
  {
    q: "Who can list items on ToolShare?",
    a: "Any registered user aged 18 or over can list items they own. You'll need a verified account and a linked bank account to receive payouts.",
  },
  {
    q: "How do I get paid as a lender?",
    a: "Payments are collected from renters upfront and held in escrow. Once your rental begins, payouts are released in daily increments (10% of the total per day) over the rental period. Payouts are sent to your linked bank account via Paystack.",
  },
  {
    q: "What if the item is damaged?",
    a: "Renters are liable for damage beyond normal wear and tear. Some listings require a damage deposit that is held during the rental. If damage occurs, report it immediately to ToolShare at support@toolshare.co.za — we will mediate between both parties.",
  },
  {
    q: "Can I cancel a booking?",
    a: "Yes. Cancellations made more than 48 hours before the rental start receive a full refund. Cancellations 24–48 hours before receive a 50% refund. Cancellations within 24 hours are non-refundable. See our full Refund Policy for details.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All payments are processed by Paystack, a PCI-DSS compliant payment provider. ToolShare never stores your card details.",
  },
  {
    q: "What items can I not list?",
    a: "You may not list illegal items, weapons, hazardous materials, consumables, or items you do not own or have the right to rent out. ToolShare reserves the right to remove any listing at its discretion.",
  },
  {
    q: "How do I verify my identity?",
    a: "For most listings, a verified email address is sufficient. High-value listings may require ID verification. You'll be prompted if verification is needed during the booking process.",
  },
  {
    q: "What areas does ToolShare serve?",
    a: "ToolShare is currently available across South Africa, with the highest density of listings in Cape Town, Johannesburg, and Durban. You can search by city or location on the dashboard.",
  },
  {
    q: "How do I contact support?",
    a: "Email support@toolshare.co.za — we respond within 1–2 business days. For urgent issues, use URGENT in your subject line and include your rental reference number.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button className={styles.faqQ} onClick={() => setOpen(!open)} aria-expanded={open}>
        {q}
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.2s", flexShrink: 0 }} />
      </button>
      {open && <p className={styles.faqA}>{a}</p>}
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className={styles.page} data-theme="dark">
      <nav className={styles.nav}>
        <Logo size="sm" />
        <Link href="/" className={styles.backLink}>
          <ArrowLeft size={14} /> Back to home
        </Link>
      </nav>

      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Help</span>
        <h1 className={styles.title}>Frequently Asked Questions</h1>
        <p className={styles.subtitle}>Everything you need to know about renting and listing on ToolShare.</p>
        <p className={styles.updated}>Can't find your answer? <a href="/contact" style={{ color: "var(--accent)" }}>Contact us</a>.</p>

        <hr className={styles.divider} />

        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
      <LegalFooter />
    </div>
  );
}
