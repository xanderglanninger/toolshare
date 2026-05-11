import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/paystack";
import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/services/notification.service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") ?? "";

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("[Paystack webhook] Invalid signature");
      return new NextResponse("Invalid signature", { status: 400 });
    }

    const event = JSON.parse(rawBody);
    console.log("[Paystack webhook] event:", event.event, "| reference:", event.data?.reference);

    if (event.event !== "charge.success") {
      return NextResponse.json({ ok: true });
    }

    const data = event.data;
    const reference: string = data.reference ?? "";
    const metadata = data.metadata ?? {};

    // Reference format: {bookingId}-{type}-{nonce}  OR  ad-{adId}-{type}-{nonce}
    const bookingId: string = metadata.bookingId ?? "";
    const type: string = metadata.type ?? ""; // "rental" | "deposit" | "ad_payment"
    const grossAmount: number = data.amount / 100; // kobo → ZAR

    if (!bookingId) {
      console.error("[Paystack webhook] Missing bookingId in metadata");
      return new NextResponse("Missing bookingId", { status: 400 });
    }

    if (type === "rental") {
      const booking = await db.booking.findUnique({
        where: { id: bookingId },
        include: {
          payment: true,
          listing: { select: { ownerId: true, title: true } },
        },
      });

      if (!booking) {
        console.error(`[Paystack webhook] Booking not found: ${bookingId}`);
        return new NextResponse("Booking not found", { status: 404 });
      }

      if (Math.abs(grossAmount - booking.totalAmount) > 0.5) {
        console.error(`[Paystack webhook] Amount mismatch. Expected ${booking.totalAmount}, got ${grossAmount}`);
        return new NextResponse("Amount mismatch", { status: 400 });
      }

      // Idempotent
      if (booking.status === "CONFIRMED" && booking.payment?.status === "SUCCEEDED") {
        return NextResponse.json({ ok: true });
      }

      await db.$transaction([
        db.payment.upsert({
          where: { bookingId },
          create: {
            bookingId,
            amount: booking.totalAmount,
            currency: "ZAR",
            status: "SUCCEEDED",
            provider: "PAYSTACK",
            paystackReference: reference,
            paymentReference: reference,
            paidAt: new Date(),
            escrowStatus: "HELD",
            depositStatus: (booking.depositAmount ?? 0) > 0 ? "HELD" : "WAIVED",
          },
          update: {
            status: "SUCCEEDED",
            provider: "PAYSTACK",
            paystackReference: reference,
            paymentReference: reference,
            paidAt: new Date(),
          },
        }),
        db.booking.update({
          where: { id: bookingId },
          data: { status: "CONFIRMED" },
        }),
      ]);

      await createNotification({
        userId: booking.borrowerId,
        type: "BOOKING_CONFIRMED",
        title: "Booking confirmed!",
        body: `Your payment for "${booking.listing.title}" was successful. Your booking is confirmed.`,
        tab: "bookings",
        linkData: bookingId,
      });

      await createNotification({
        userId: booking.listing.ownerId,
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        body: `Payment for "${booking.listing.title}" has been received. Your booking is confirmed.`,
        tab: "bookings",
        linkData: bookingId,
      });
    } else if (type === "deposit") {
      const booking = await db.booking.findUnique({ where: { id: bookingId }, include: { payment: true } });
      if (booking?.payment) {
        await db.payment.update({
          where: { bookingId },
          data: { depositStatus: "HELD" },
        });
      }
    } else if (type === "ad_payment") {
      const adId = bookingId;
      const ad = await db.ad.findUnique({ where: { id: adId } });
      if (!ad) {
        console.error(`[Paystack webhook] Ad not found: ${adId}`);
        return new NextResponse("Ad not found", { status: 404 });
      }

      if (ad.status === "ACTIVE") {
        return NextResponse.json({ ok: true });
      }

      const now = new Date();
      const endsAt = new Date(now);
      endsAt.setDate(endsAt.getDate() + (ad.planDays ?? 30));

      await db.ad.update({
        where: { id: adId },
        data: { status: "ACTIVE", active: true, startsAt: now, endsAt },
      });

      if (ad.advertiserId) {
        await createNotification({
          userId: ad.advertiserId,
          type: "PAYMENT_RECEIVED",
          title: "Your ad is live!",
          body: `Payment received — "${ad.title}" is now showing in Today's Picks until ${endsAt.toLocaleDateString("en-ZA")}.`,
          tab: "messages",
          linkData: null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[Paystack webhook] Unhandled error:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
