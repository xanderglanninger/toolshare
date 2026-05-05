import { db } from "@/lib/db/client";
import { stripe } from "@/lib/stripe";
import { createNotification } from "@/lib/services/notification.service";
import type { Payment } from "@/lib/types";

export async function createRentalPaymentIntent(
  bookingId: string,
  borrowerId: string
): Promise<{ clientSecret: string; depositClientSecret: string | null }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { owner: { select: { id: true, stripeAccountId: true, stripeAccountEnabled: true } } } },
    },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.borrowerId !== borrowerId) throw new Error("Forbidden.");
  if (booking.status !== "PENDING") throw new Error("Booking is not pending payment.");

  const existing = await db.payment.findUnique({ where: { bookingId } });
  if (existing?.stripePaymentIntentId) {
    const pi = await stripe.paymentIntents.retrieve(existing.stripePaymentIntentId);
    if (pi.status === "succeeded") throw new Error("Already paid.");
    let depositClientSecret: string | null = null;
    if (existing.depositPaymentIntentId) {
      const dpi = await stripe.paymentIntents.retrieve(existing.depositPaymentIntentId);
      depositClientSecret = dpi.client_secret;
    }
    return { clientSecret: pi.client_secret!, depositClientSecret };
  }

  // Rental PaymentIntent — funds stay on platform for escrow (no transfer_data)
  const rentalIntent = await stripe.paymentIntents.create({
    amount: Math.round(booking.totalAmount * 100),
    currency: "zar",
    metadata: { bookingId, type: "rental", ownerId: booking.listing.owner.id, userId: borrowerId },
  });

  let depositIntentId: string | null = null;
  let depositClientSecret: string | null = null;

  if (booking.depositAmount && booking.depositAmount > 0) {
    const depositIntent = await stripe.paymentIntents.create({
      amount: Math.round(booking.depositAmount * 100),
      currency: "zar",
      metadata: { bookingId, type: "deposit", ownerId: booking.listing.owner.id, userId: borrowerId },
    });
    depositIntentId = depositIntent.id;
    depositClientSecret = depositIntent.client_secret;
  }

  await db.payment.create({
    data: {
      bookingId,
      amount: booking.totalAmount,
      currency: "ZAR",
      status: "PENDING",
      stripePaymentIntentId: rentalIntent.id,
      escrowStatus: "HELD",
      depositStatus: depositIntentId ? "HELD" : "WAIVED",
      depositPaymentIntentId: depositIntentId,
    },
  });

  return { clientSecret: rentalIntent.client_secret!, depositClientSecret };
}

export async function confirmPayment(
  bookingId: string,
  paymentIntentId: string,
  borrowerId: string
): Promise<{ success: boolean; paymentReference: string }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { payment: true },
  });
  if (!booking) throw new Error("Booking not found.");
  // Fix #2: Ensure only the booking's borrower can confirm payment
  if (booking.borrowerId !== borrowerId) throw new Error("Forbidden.");

  if (booking.status === "CONFIRMED" && booking.payment?.status === "SUCCEEDED") {
    return { success: true, paymentReference: booking.payment.paymentReference ?? paymentIntentId };
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") throw new Error("Payment has not succeeded.");
  if (pi.metadata.bookingId !== bookingId) throw new Error("Payment intent does not match booking.");

  // Only the rental intent triggers booking confirmation
  if (pi.metadata.type === "deposit") {
    await db.payment.update({
      where: { bookingId },
      data: { depositStatus: "HELD" },
    });
    return { success: true, paymentReference: paymentIntentId };
  }

  await db.$transaction([
    db.payment.update({
      where: { bookingId },
      data: {
        status: "SUCCEEDED",
        paymentReference: paymentIntentId,
        paidAt: new Date(),
        escrowStatus: "HELD",
      },
    }),
    db.booking.update({
      where: { id: bookingId },
      data: { status: "CONFIRMED" },
    }),
  ]);

  return { success: true, paymentReference: paymentIntentId };
}

export async function getPaymentByBooking(bookingId: string): Promise<Payment | null> {
  return db.payment.findUnique({ where: { bookingId } }) as Promise<Payment | null>;
}

export async function releaseEscrow(bookingId: string): Promise<void> {
  // Fix #10: Atomically claim the HELD → RELEASING transition so concurrent cron runs
  // are idempotent — only one execution can win; the other sees count=0 and exits.
  const claimed = await db.payment.updateMany({
    where: { bookingId, escrowStatus: "HELD" },
    data: { escrowStatus: "RELEASING" },
  });
  if (claimed.count === 0) {
    // Another process already claimed or escrow is not in HELD state — skip silently
    return;
  }

  const payment = await db.payment.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: { select: { owner: { select: { id: true, stripeAccountId: true, stripeAccountEnabled: true } } } } } } },
  });
  if (!payment) throw new Error("Payment not found.");
  if (!payment.booking.listing.owner.stripeAccountId) throw new Error("Owner has no connected Stripe account.");

  const openDispute = await db.report.findFirst({
    where: { bookingId, escrowFrozen: true, status: { in: ["PENDING", "REVIEWED"] } },
  });
  if (openDispute) {
    // Revert the status claim so the dispute freeze takes effect
    await db.payment.update({ where: { bookingId }, data: { escrowStatus: "DISPUTED" } });
    throw new Error("Cannot release escrow while a dispute is open.");
  }

  const amountInCents = Math.round(payment.amount * 100);
  const transfer = await stripe.transfers.create(
    {
      destination: payment.booking.listing.owner.stripeAccountId,
      amount: amountInCents,
      currency: "zar",
      transfer_group: bookingId,
      metadata: { bookingId, type: "rental_release" },
    },
    { idempotencyKey: `${bookingId}-release` }
  );

  await db.payment.update({
    where: { bookingId },
    data: { escrowStatus: "RELEASED", stripeTransferId: transfer.id, releasedAt: new Date() },
  });

  await createNotification({
    userId: payment.booking.listing.owner.id,
    type: "FUNDS_RELEASED",
    title: "Rental funds released",
    body: `Your rental payment of R${payment.amount.toFixed(2)} has been transferred to your account.`,
    tab: "bookings",
    linkData: bookingId,
  });
}

export async function releaseDeposit(bookingId: string, to: "borrower" | "owner"): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: { select: { owner: { select: { id: true, stripeAccountId: true } } } } } } },
  });
  if (!payment) throw new Error("Payment not found.");
  if (payment.depositStatus !== "HELD") return; // nothing to release
  if (!payment.depositPaymentIntentId) return;

  if (to === "borrower") {
    const refund = await stripe.refunds.create(
      { payment_intent: payment.depositPaymentIntentId },
      { idempotencyKey: `${bookingId}-deposit-refund` }
    );
    await db.payment.update({
      where: { bookingId },
      data: { depositStatus: "RETURNED", depositReleasedAt: new Date(), stripeRefundId: refund.id },
    });
    await createNotification({
      userId: payment.booking.borrowerId,
      type: "DEPOSIT_RETURNED",
      title: "Deposit returned",
      body: `Your deposit of R${payment.booking.depositAmount?.toFixed(2)} has been refunded.`,
      tab: "bookings",
      linkData: bookingId,
    });
  } else {
    if (!payment.booking.listing.owner.stripeAccountId) throw new Error("Owner has no Stripe account.");
    const transfer = await stripe.transfers.create(
      {
        destination: payment.booking.listing.owner.stripeAccountId,
        amount: Math.round((payment.booking.depositAmount ?? 0) * 100),
        currency: "zar",
        transfer_group: bookingId,
        metadata: { bookingId, type: "deposit_keep" },
      },
      { idempotencyKey: `${bookingId}-deposit-keep` }
    );
    await db.payment.update({
      where: { bookingId },
      data: { depositStatus: "KEPT", depositReleasedAt: new Date(), depositTransferId: transfer.id },
    });
  }
}

export async function issuePartialRefund(bookingId: string, refundPercent: 0 | 50 | 100): Promise<void> {
  const payment = await db.payment.findUnique({
    where: { bookingId },
    include: { booking: { include: { listing: { select: { owner: { select: { id: true, stripeAccountId: true } } } } } } },
  });
  if (!payment) throw new Error("Payment not found.");
  if (!payment.stripePaymentIntentId) throw new Error("No Stripe payment intent on record.");

  const totalCents = Math.round(payment.amount * 100);

  if (refundPercent === 100) {
    const refund = await stripe.refunds.create(
      { payment_intent: payment.stripePaymentIntentId },
      { idempotencyKey: `${bookingId}-refund-100` }
    );
    await db.payment.update({
      where: { bookingId },
      data: { escrowStatus: "REFUNDED", refundedAmount: payment.amount, stripeRefundId: refund.id },
    });
  } else if (refundPercent === 50) {
    const refundCents = Math.round(totalCents * 0.5);
    const refund = await stripe.refunds.create(
      { payment_intent: payment.stripePaymentIntentId, amount: refundCents },
      { idempotencyKey: `${bookingId}-refund-50` }
    );
    // Transfer remaining 50% to owner
    if (payment.booking.listing.owner.stripeAccountId) {
      const ownerCents = totalCents - refundCents;
      await stripe.transfers.create(
        {
          destination: payment.booking.listing.owner.stripeAccountId,
          amount: ownerCents,
          currency: "zar",
          transfer_group: bookingId,
          metadata: { bookingId, type: "partial_release" },
        },
        { idempotencyKey: `${bookingId}-partial-release` }
      );
    }
    await db.payment.update({
      where: { bookingId },
      data: { escrowStatus: "PARTIAL", refundedAmount: refundCents / 100, stripeRefundId: refund.id },
    });
  } else {
    // 0% refund — release full amount to owner
    await releaseEscrow(bookingId);
  }
}

export async function cancelBookingWithRefund(
  bookingId: string,
  cancelledById: string
): Promise<{ tier: string; refundAmount: number }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { ownerId: true } },
      payment: true,
    },
  });
  if (!booking) throw new Error("Booking not found.");

  const isOwner = booking.listing.ownerId === cancelledById;
  const isBorrower = booking.borrowerId === cancelledById;
  if (!isOwner && !isBorrower) throw new Error("Forbidden.");

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    throw new Error("Only PENDING or CONFIRMED bookings can be cancelled.");
  }

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilStart = Math.floor((booking.startDate.getTime() - now.getTime()) / msPerDay);

  let tier: "FULL_REFUND" | "HALF_REFUND" | "NO_REFUND" | "OWNER_CANCEL";
  let refundPercent: 0 | 50 | 100;

  if (isOwner) {
    tier = "OWNER_CANCEL";
    refundPercent = 100;
  } else if (daysUntilStart >= 7) {
    tier = "FULL_REFUND";
    refundPercent = 100;
  } else if (daysUntilStart >= 3) {
    tier = "HALF_REFUND";
    refundPercent = 50;
  } else {
    tier = "NO_REFUND";
    refundPercent = 0;
  }

  const refundAmount = (booking.totalAmount * refundPercent) / 100;

  // Only issue Stripe refund if payment was actually processed
  if (booking.payment?.status === "SUCCEEDED") {
    await issuePartialRefund(bookingId, refundPercent);
  }

  // Deposit always returned in full on cancellation (item was never used)
  if (booking.payment?.depositStatus === "HELD") {
    await releaseDeposit(bookingId, "borrower");
  }

  await db.booking.update({
    where: { id: bookingId },
    data: {
      status: "CANCELLED",
      cancellationTier: tier,
      cancelledById,
      cancelledAt: new Date(),
    },
  });

  const otherUserId = isOwner ? booking.borrowerId : booking.listing.ownerId;
  const cancellerLabel = isOwner ? "The owner" : "The borrower";

  await createNotification({
    userId: otherUserId,
    type: "BOOKING_CANCELLED",
    title: "Booking cancelled",
    body: `${cancellerLabel} has cancelled the booking. ${refundPercent > 0 ? `A ${refundPercent}% refund (R${refundAmount.toFixed(2)}) will be processed.` : "No refund applies based on the cancellation policy."}`,
    tab: "bookings",
    linkData: bookingId,
  });

  return { tier, refundAmount };
}

export async function refundPayment(bookingId: string): Promise<void> {
  await issuePartialRefund(bookingId, 100);
  await db.booking.update({ where: { id: bookingId }, data: { status: "CANCELLED" } });
}
