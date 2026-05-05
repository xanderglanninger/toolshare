"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "./page.module.css";
import type { BookingWithDetails } from "@/lib/types";

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d: Date | string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("en-ZA", opts ?? {
    day: "numeric", month: "long", year: "numeric",
  });
}

function daysBetween(start: Date | string, end: Date | string) {
  return Math.max(1, Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000,
  ));
}

function invoiceNumber(bookingId: string) {
  return `INV-${bookingId.slice(-8).toUpperCase()}`;
}

function getRateLabel(days: number, listing: BookingWithDetails["listing"]) {
  if (days >= 28 && listing.pricePerMonth) return { rate: listing.pricePerMonth, label: "month", unit: Math.ceil(days / 30) };
  if (days >= 7  && listing.pricePerWeek)  return { rate: listing.pricePerWeek,  label: "week",  unit: Math.ceil(days / 7)  };
  return { rate: listing.pricePerDay, label: "day", unit: days };
}

export default function InvoicePage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") { router.push("/login"); return; }
    if (authStatus !== "authenticated") return;

    fetch(`/api/bookings/${bookingId}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) setBooking(json.data);
        else setError(json.error ?? "Invoice not found.");
      })
      .catch(() => setError("Failed to load invoice."))
      .finally(() => setLoading(false));
  }, [bookingId, authStatus, router]);

  if (authStatus === "loading" || loading) {
    return (
      <div className={styles.shell}>
        <div className={styles.stateWrap}>
          <div className={styles.spinner} />
          <p className={styles.stateText}>Loading invoice…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className={styles.shell}>
        <div className={styles.stateWrap}>
          <p className={styles.stateIcon}>📄</p>
          <p className={styles.stateText}>{error || "Invoice not found"}</p>
          <button className={styles.stateBtn} onClick={() => router.back()}>← Go back</button>
        </div>
      </div>
    );
  }

  const { listing, borrower, payment } = booking;
  const owner         = listing.owner;
  const days          = daysBetween(booking.startDate, booking.endDate);
  const rateInfo      = getRateLabel(days, listing);
  const isPaid        = payment?.status === "SUCCEEDED";
  const invNum        = invoiceNumber(booking.id);
  const issuedDate    = payment?.paidAt ?? booking.createdAt;
  const hasDeposit    = (booking.depositAmount ?? 0) > 0;
  const rentalAmount  = booking.totalAmount - (booking.depositAmount ?? 0);

  return (
    <div className={styles.shell}>

      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <button className={styles.backBtn} onClick={() => router.push("/dashboard?tab=bookings")}>
          ← Bookings
        </button>
        <div className={styles.toolbarRight}>
          <span className={styles.toolbarNum}>{invNum}</span>
          <button className={styles.printBtn} onClick={() => window.print()}>
            ↓ Save / Print
          </button>
        </div>
      </div>

      {/* ── Document ─────────────────────────────────────────── */}
      <article className={styles.doc}>

        {isPaid && <div className={styles.stamp}>PAID</div>}

        {/* Header */}
        <header className={styles.docHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.invoiceWord}>INVOICE</h1>
            <p className={styles.invoiceNum}>{invNum}</p>
            <div className={styles.headerMeta}>
              <span className={styles.headerMetaItem}>
                <span className={styles.headerMetaLabel}>Issued</span>
                <span className={styles.headerMetaVal}>{fmtDate(issuedDate)}</span>
              </span>
              <span className={styles.headerMetaDot} />
              <span className={isPaid ? styles.statusPaid : styles.statusUnpaid}>
                {isPaid ? "Paid" : "Awaiting payment"}
              </span>
            </div>
          </div>

          <div className={styles.brand}>
            <div className={styles.brandMark}>
              <span className={styles.brandBox}>lend</span><span className={styles.brandSuffix}>me</span>
            </div>
            <p className={styles.brandTagline}>Peer-to-peer item lending</p>
            <p className={styles.brandId}>{booking.id}</p>
          </div>
        </header>

        {/* Parties */}
        <div className={styles.parties}>
          <div className={styles.party}>
            <p className={styles.partyLabel}>Bill To</p>
            <p className={styles.partyName}>{borrower.name} {borrower.surname}</p>
            <p className={styles.partySub}>Borrower</p>
          </div>

          <div className={styles.partySeparator} />

          <div className={styles.party}>
            <p className={styles.partyLabel}>Service By</p>
            <p className={styles.partyName}>{owner.name} {owner.surname}</p>
            <p className={styles.partySub}>{listing.city}, {listing.province}</p>
          </div>

          <div className={styles.partySeparator} />

          <div className={styles.party}>
            <p className={styles.partyLabel}>Rental Period</p>
            <p className={styles.partyName}>
              {fmtDate(booking.startDate, { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <p className={styles.partySub}>
              to {fmtDate(booking.endDate, { day: "numeric", month: "short", year: "numeric" })} · {days} day{days !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={`${styles.th} ${styles.thDesc}`}>Description</th>
                <th className={`${styles.th} ${styles.thQty}`}>Qty</th>
                <th className={`${styles.th} ${styles.thRate}`}>Rate</th>
                <th className={`${styles.th} ${styles.thAmt}`}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={`${styles.td} ${styles.tdDesc}`}>
                  <p className={styles.itemTitle}>{listing.title}</p>
                  <p className={styles.itemSub}>{listing.city}, {listing.province} · {listing.category.replace(/_/g, " ")}</p>
                  <p className={styles.itemSub}>
                    {fmtDate(booking.startDate, { day: "numeric", month: "short" })} – {fmtDate(booking.endDate, { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </td>
                <td className={`${styles.td} ${styles.tdQty}`}>{rateInfo.unit}</td>
                <td className={`${styles.td} ${styles.tdRate}`}>{fmt(rateInfo.rate)}&thinsp;/&thinsp;{rateInfo.label}</td>
                <td className={`${styles.td} ${styles.tdAmt}`}>{fmt(rentalAmount)}</td>
              </tr>

              {hasDeposit && (
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.tdDesc}`}>
                    <p className={styles.itemTitle}>Refundable Deposit</p>
                    <p className={styles.itemSub}>Returned upon safe return of item in original condition</p>
                  </td>
                  <td className={`${styles.td} ${styles.tdQty}`}>1</td>
                  <td className={`${styles.td} ${styles.tdRate}`}>—</td>
                  <td className={`${styles.td} ${styles.tdAmt}`}>{fmt(booking.depositAmount!)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Subtotals + grand total */}
        <div className={styles.totalsWrap}>
          {hasDeposit && (
            <div className={styles.subtotals}>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>Rental</span>
                <span className={styles.subtotalVal}>{fmt(rentalAmount)}</span>
              </div>
              <div className={styles.subtotalRow}>
                <span className={styles.subtotalLabel}>Deposit</span>
                <span className={styles.subtotalVal}>{fmt(booking.depositAmount!)}</span>
              </div>
            </div>
          )}

          <div className={styles.grandBand}>
            <span className={styles.grandLabel}>Total Due</span>
            <span className={styles.grandValue}>{fmt(booking.totalAmount)}</span>
          </div>
        </div>

        {/* Payment confirmation */}
        <div className={`${styles.payBlock} ${isPaid ? styles.payBlockPaid : styles.payBlockUnpaid}`}>
          {isPaid && payment ? (
            <div className={styles.payRow}>
              <div className={styles.payCheck}>
                <span className={styles.payTick}>✓</span>
                <span className={styles.payConfirmedLabel}>Payment Received</span>
              </div>
              <div className={styles.payFields}>
                <div className={styles.payField}>
                  <span className={styles.payFieldKey}>Reference</span>
                  <span className={styles.payFieldVal}>{payment.paymentReference}</span>
                </div>
                {payment.paidAt && (
                  <div className={styles.payField}>
                    <span className={styles.payFieldKey}>Date</span>
                    <span className={styles.payFieldVal}>{fmtDate(payment.paidAt)}</span>
                  </div>
                )}
                <div className={styles.payField}>
                  <span className={styles.payFieldKey}>Amount</span>
                  <span className={styles.payFieldVal}>{fmt(payment.amount)}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className={styles.payPending}>
              ⏳ Payment of {fmt(booking.totalAmount)} is outstanding.
            </p>
          )}
        </div>

        {/* Footer */}
        <footer className={styles.docFooter}>
          <p className={styles.footerThanks}>
            Thank you for using ToolShare. The deposit will be refunded once the item is returned in its original condition.
          </p>
          <div className={styles.footerRule} />
          <div className={styles.footerBottom}>
            <span className={styles.footerBrand}>toolshare.co.za</span>
            <span className={styles.footerNote}>This document was generated automatically and serves as proof of transaction.</span>
          </div>
        </footer>

      </article>
    </div>
  );
}
