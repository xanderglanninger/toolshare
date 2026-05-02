import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { bookingId, type: intentType } = pi.metadata;

    if (bookingId) {
      if (intentType === "deposit") {
        // Deposit payment succeeded — mark deposit as HELD only
        await db.payment.updateMany({
          where: { bookingId, depositPaymentIntentId: pi.id },
          data: { depositStatus: "HELD" },
        });
      } else {
        // Rental payment succeeded — confirm booking
        const payment = await db.payment.findUnique({ where: { bookingId } });
        if (payment && payment.status !== "SUCCEEDED") {
          await db.$transaction([
            db.payment.update({
              where: { bookingId },
              data: {
                status: "SUCCEEDED",
                paymentReference: pi.id,
                paidAt: new Date(),
                escrowStatus: "HELD",
              },
            }),
            db.booking.update({
              where: { id: bookingId },
              data: { status: "CONFIRMED" },
            }),
          ]);
        }
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { bookingId } = pi.metadata;
    if (bookingId) {
      await db.payment.updateMany({
        where: { bookingId, status: "PENDING" },
        data: { status: "FAILED" },
      });
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await db.user.updateMany({
      where: { stripeAccountId: account.id },
      data: { stripeAccountEnabled: account.charges_enabled ?? false },
    });
  }

  // Record transfer ID when escrow is released to owner
  if (event.type === "transfer.created") {
    const transfer = event.data.object as Stripe.Transfer;
    const bookingId = transfer.metadata?.bookingId;
    if (bookingId) {
      await db.payment.updateMany({
        where: { bookingId },
        data: { stripeTransferId: transfer.id, releasedAt: new Date() },
      });
    }
  }

  return NextResponse.json({ received: true });
}
