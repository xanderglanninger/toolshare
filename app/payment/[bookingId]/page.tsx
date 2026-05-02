"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import type { Appearance } from "@stripe/stripe-js";
import styles from "./page.module.css";
import type { BookingWithDetails } from "@/lib/types";
import Logo from "@/components/ui/Logo";

const TEST_MODE = process.env.NEXT_PUBLIC_PAYMENT_TEST_MODE === "true";

// Only initialise Stripe when a real-looking key is present
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise =
  stripeKey && stripeKey !== "pk_test_..." ? loadStripe(stripeKey) : null;

const stripeAppearance: Appearance = {
  theme: "night",
  variables: {
    colorPrimary: "#f5a800",
    colorBackground: "#1c1a17",
    colorText: "#f5f0e8",
    colorDanger: "#f87171",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "6px",
    colorTextSecondary: "#7a7060",
    colorTextPlaceholder: "#3a3830",
  },
  rules: {
    ".Input": { border: "1px solid #2e2b24" },
    ".Input:focus": { borderColor: "#f5a800", boxShadow: "none" },
    ".Label": {
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
    },
  },
};

const CATEGORY_ICONS: Record<string, string> = {
  ELECTRONICS: "💻", TOOLS_EQUIPMENT: "🔧", SPORTS_OUTDOORS: "⛺",
  VEHICLES: "🚗", CLOTHING_ACCESSORIES: "👗", FURNITURE_HOME: "🛋️",
  MUSICAL_INSTRUMENTS: "🎸", BOOKS_MEDIA: "📚", GAMES_TOYS: "🎮",
  CAMERAS_PHOTOGRAPHY: "📷", PARTY_EVENTS: "🎉", OTHER: "📦",
};

function fmt(n: number) {
  return `R ${n.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(start: Date | string, end: Date | string) {
  return Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
}

// ── Stripe checkout form (must be inside <Elements>) ──────────────────────────

function CheckoutForm({
  booking,
  onSuccess,
}: {
  booking: BookingWithDetails;
  onSuccess: (ref: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState("");

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/${booking.id}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await fetch("/api/payments", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ bookingId: booking.id, paymentIntentId: paymentIntent.id }),
        });
      } catch {}
      onSuccess(paymentIntent.id);
    }

    setPaying(false);
  }

  return (
    <>
      <div className={styles.formCard}>
        <p className={styles.formTitle}>Card details</p>
        <PaymentElement />
      </div>

      {payError && <div className={styles.errorBox}>{payError}</div>}

      <div className={styles.secureNote}>
        🔒 Payments are processed securely by Stripe
      </div>

      <button
        className={styles.payBtn}
        disabled={paying || !stripe || !elements}
        onClick={handlePay}
      >
        {paying ? "Processing…" : `Pay ${fmt(booking.totalAmount)}`}
      </button>
    </>
  );
}

// ── Deposit checkout form ─────────────────────────────────────────────────────

function DepositCheckoutForm({
  booking,
  onSuccess,
}: {
  booking: BookingWithDetails;
  onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying]     = useState(false);
  const [payError, setPayError] = useState("");

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    setPayError("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/payment/${booking.id}` },
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message ?? "Deposit payment failed.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      try {
        await fetch("/api/payments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId: booking.id, paymentIntentId: paymentIntent.id }),
        });
      } catch {}
      onSuccess();
    }

    setPaying(false);
  }

  return (
    <>
      <div className={styles.formCard}>
        <p className={styles.formTitle}>Deposit card details</p>
        <PaymentElement />
      </div>
      {payError && <div className={styles.errorBox}>{payError}</div>}
      <div className={styles.secureNote}>🔒 Deposit held in escrow — returned after safe return</div>
      <button
        className={styles.payBtn}
        disabled={paying || !stripe || !elements}
        onClick={handlePay}
      >
        {paying ? "Processing…" : `Pay deposit ${fmt(booking.depositAmount ?? 0)}`}
      </button>
    </>
  );
}

// ── Test-mode simulated payment panel ────────────────────────────────────────

function TestPaymentPanel({
  booking,
  onSuccess,
}: {
  booking: BookingWithDetails;
  onSuccess: (ref: string) => void;
}) {
  const [simulating, setSimulating] = useState(false);
  const [simError, setSimError]     = useState("");

  const TEST_CARDS = [
    { label: "Visa (succeeds)",              number: "4242 4242 4242 4242" },
    { label: "Mastercard (succeeds)",        number: "5555 5555 5555 4444" },
    { label: "3D Secure required",           number: "4000 0025 0000 3155" },
    { label: "Card declined",               number: "4000 0000 0000 0002" },
    { label: "Insufficient funds (decline)", number: "4000 0000 0000 9995" },
  ];

  async function handleSimulate() {
    setSimulating(true);
    setSimError("");
    try {
      const res = await fetch("/api/payments/simulate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId: booking.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Simulation failed");
      onSuccess(json.data.paymentReference);
    } catch (e: any) {
      setSimError(e.message ?? "Simulation failed");
      setSimulating(false);
    }
  }

  return (
    <div className={styles.testPanel}>
      <div className={styles.testPanelHeader}>
        <span className={styles.testBadge}>TEST MODE</span>
        <p className={styles.testPanelTitle}>Stripe Test Environment</p>
      </div>

      <p className={styles.testPanelSub}>
        Use these test card numbers with any future expiry, any 3-digit CVC, and any postal code.
      </p>

      <div className={styles.testCards}>
        {TEST_CARDS.map((c) => (
          <div key={c.number} className={styles.testCard}>
            <span className={styles.testCardNum}>{c.number}</span>
            <span className={styles.testCardLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      <div className={styles.testDivider}>
        <span>or</span>
      </div>

      <p className={styles.testSimNote}>
        Skip card entry entirely — instantly mark this booking as paid:
      </p>

      {simError && <div className={styles.errorBox}>{simError}</div>}

      <button
        className={styles.simBtn}
        disabled={simulating}
        onClick={handleSimulate}
      >
        {simulating ? "Simulating…" : `⚡ Simulate payment of ${fmt(booking.totalAmount)}`}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PaymentPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const { data: session } = useSession();
  const router = useRouter();

  const [booking, setBooking]                         = useState<BookingWithDetails | null>(null);
  const [loading, setLoading]                         = useState(true);
  const [notFound, setNotFound]                       = useState(false);
  const [clientSecret, setClientSecret]               = useState<string | null>(null);
  const [depositClientSecret, setDepositClientSecret] = useState<string | null>(null);
  const [depositPaid, setDepositPaid]                 = useState(false);
  const [intentError, setIntentError]                 = useState("");
  const [success, setSuccess]                         = useState<{ paymentReference: string } | null>(null);

  // Fetch booking
  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setBooking(json.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [bookingId]);

  // Create (or reuse) PaymentIntents — only when Stripe is configured
  useEffect(() => {
    if (!booking || booking.status !== "PENDING" || !stripePromise) return;
    fetch("/api/payments/create-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ bookingId }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.clientSecret) {
          setClientSecret(json.data.clientSecret);
          if (json.data.depositClientSecret) setDepositClientSecret(json.data.depositClientSecret);
        } else {
          setIntentError(json.error ?? "Failed to initialise payment.");
        }
      })
      .catch(() => setIntentError("Failed to initialise payment."));
  }, [booking, bookingId]);

  // Handle Stripe redirect returns (3-D Secure flows)
  useEffect(() => {
    const p       = new URLSearchParams(window.location.search);
    const status  = p.get("redirect_status");
    const intentId = p.get("payment_intent");
    if (status === "succeeded" && intentId) {
      fetch("/api/payments", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ bookingId, paymentIntentId: intentId }),
      })
        .then((r) => r.json())
        .then((json) => {
          if (json.data?.paymentReference)
            setSuccess({ paymentReference: json.data.paymentReference });
        })
        .catch(() => {});
    }
  }, [bookingId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.loading}>Loading…</div>
      </div>
    );
  }

  // ── Not found ─────────────────────────────────────────────────────────────
  if (notFound || !booking) {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.loading}>Booking not found.</div>
      </div>
    );
  }

  // ── Already paid ──────────────────────────────────────────────────────────
  if (booking.status === "CONFIRMED" && booking.payment?.status === "SUCCEEDED") {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.successPage}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Already paid!</h1>
          <p className={styles.successSub}>This booking has already been confirmed.</p>
          {booking.payment.paymentReference && (
            <div className={styles.successRef}>
              Ref: <strong>{booking.payment.paymentReference}</strong>
            </div>
          )}
          <button className={styles.dashBtn} onClick={() => router.push("/dashboard?tab=bookings")}>
            View my bookings
          </button>
        </div>
      </div>
    );
  }

  // ── Rental paid — now pay deposit if required ────────────────────────────
  if (success && depositClientSecret && !depositPaid) {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.body}>
          <div className={styles.successPage} style={{ marginBottom: "1.5rem" }}>
            <div className={styles.successIcon} style={{ background: "#c8a84b" }}>✓</div>
            <h1 className={styles.successTitle}>Rental paid!</h1>
            <p className={styles.successSub}>
              Now pay the refundable deposit of <strong>{fmt(booking.depositAmount ?? 0)}</strong> to
              complete your booking. This is fully returned after the item is safely returned.
            </p>
          </div>
          {stripePromise && (
            <Elements stripe={stripePromise} options={{ clientSecret: depositClientSecret, appearance: stripeAppearance }}>
              <DepositCheckoutForm
                booking={booking}
                onSuccess={() => setDepositPaid(true)}
              />
            </Elements>
          )}
        </div>
      </div>
    );
  }

  // ── Payment success (just completed) ─────────────────────────────────────
  if (success) {
    return (
      <div className={styles.page}>
        <Topbar />
        <div className={styles.successPage}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Booking confirmed!</h1>
          <p className={styles.successSub}>
            Your booking for <strong>{booking.listing.title}</strong> has been confirmed.
            {booking.depositAmount && " Your deposit is held in escrow and will be returned after the rental."}
          </p>
          <div className={styles.successRef}>
            Reference: <strong>{success.paymentReference}</strong>
          </div>
          <p style={{ fontSize: "0.8rem", color: "#c8a84b", marginBottom: "1rem" }}>
            🔒 Your rental payment is held in escrow — protected until both parties confirm the return.
          </p>
          <button className={styles.dashBtn} onClick={() => router.push("/dashboard?tab=bookings")}>
            View my bookings
          </button>
        </div>
      </div>
    );
  }

  const icon = CATEGORY_ICONS[booking.listing.category] ?? "📦";
  const days = daysBetween(booking.startDate, booking.endDate);

  return (
    <div className={styles.page}>
      <nav className={styles.topbar}>
        <button className={styles.backBtn} onClick={() => router.back()}>← Back</button>
        <Logo size="sm" variant="dark" />
      </nav>

      <div className={styles.body}>
        {/* Steps */}
        <div className={styles.steps}>
          <div className={`${styles.step} ${styles.stepDone}`}>
            <div className={styles.stepDot}>✓</div>
            Booking
          </div>
          <div className={styles.stepLine} />
          <div className={`${styles.step} ${styles.stepActive}`}>
            <div className={styles.stepDot}>2</div>
            Payment
          </div>
          <div className={styles.stepLine} />
          <div className={styles.step}>
            <div className={styles.stepDot}>3</div>
            Confirmed
          </div>
        </div>

        {/* Booking summary */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryHeader}>
            {booking.listing.images.length > 0 ? (
              <img
                src={booking.listing.images[0]}
                alt={booking.listing.title}
                className={styles.summaryImg}
              />
            ) : (
              <div className={styles.summaryImgPlaceholder}>{icon}</div>
            )}
            <div className={styles.summaryItemInfo}>
              <p className={styles.summaryItemTitle}>{booking.listing.title}</p>
              <p className={styles.summaryItemSub}>
                {booking.listing.city}, {booking.listing.province}
              </p>
            </div>
          </div>

          <div className={styles.summaryRows}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>Dates</span>
              <span className={styles.summaryRowValue}>
                {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>Duration</span>
              <span className={styles.summaryRowValue}>{days} day{days !== 1 ? "s" : ""}</span>
            </div>
            {booking.depositAmount && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryRowLabel}>Refundable deposit</span>
                <span className={styles.summaryRowValue}>{fmt(booking.depositAmount)}</span>
              </div>
            )}
          </div>

          <div className={styles.summaryDivider} />

          {booking.depositAmount && (
            <div className={styles.summaryRow}>
              <span className={styles.summaryRowLabel}>Rental amount</span>
              <span className={styles.summaryRowValue}>{fmt(booking.totalAmount)}</span>
            </div>
          )}

          <div className={styles.summaryTotal}>
            <span>{booking.depositAmount ? "Total including deposit" : "Total due"}</span>
            <span className={styles.summaryTotalValue}>
              {fmt(booking.totalAmount + (booking.depositAmount ?? 0))}
            </span>
          </div>
        </div>

        <div className={styles.escrowNotice ?? ""} style={{
          background: "#1c1a17", border: "1px solid #2e2b24", borderRadius: 8,
          padding: "0.75rem 1rem", fontSize: "0.82rem", color: "#c8a84b",
          marginBottom: "1rem", lineHeight: 1.5,
        }}>
          🔒 <strong>Escrow protection:</strong> Your rental payment is held securely by us. It is only
          released to the owner after both parties confirm the item was returned safely. If something
          goes wrong, you can open a dispute and an admin will review it.
          {booking.depositAmount && (
            <> The <strong>refundable deposit of {fmt(booking.depositAmount)}</strong> is returned
            automatically after a successful rental.</>
          )}
        </div>

        {/* Test mode panel */}
        {TEST_MODE && (
          <TestPaymentPanel
            booking={booking}
            onSuccess={(ref) => setSuccess({ paymentReference: ref })}
          />
        )}

        {/* Stripe payment form — shown when Stripe is configured */}
        {!TEST_MODE && (
          intentError ? (
            <div className={styles.errorBox}>{intentError}</div>
          ) : stripePromise && clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <CheckoutForm
                booking={booking}
                onSuccess={(ref) => setSuccess({ paymentReference: ref })}
              />
            </Elements>
          ) : stripePromise ? (
            <div className={styles.formCard}>
              <p className={styles.formTitle}>Card details</p>
              <div className={styles.formLoading}>Loading payment details…</div>
            </div>
          ) : (
            <div className={styles.errorBox}>
              Stripe is not configured. Set <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> or enable{" "}
              <code>NEXT_PUBLIC_PAYMENT_TEST_MODE=true</code> in your environment.
            </div>
          )
        )}

        {/* When test mode is ON, also offer Stripe if it's configured */}
        {TEST_MODE && stripePromise && clientSecret && (
          <>
            <div className={styles.testDivider} style={{ marginTop: 8 }}>
              <span>or pay with real test card via Stripe</span>
            </div>
            <Elements stripe={stripePromise} options={{ clientSecret, appearance: stripeAppearance }}>
              <CheckoutForm
                booking={booking}
                onSuccess={(ref) => setSuccess({ paymentReference: ref })}
              />
            </Elements>
          </>
        )}
      </div>
    </div>
  );
}

function Topbar() {
  return (
    <nav className={styles.topbar}>
      <div className={styles.topbarLogo}>
        <span className={styles.logoBox}>lend</span>
        <span className={styles.logoSuffix}>me</span>
      </div>
    </nav>
  );
}
