import { NextRequest, NextResponse } from "next/server";
import {
  PAYFAST_PASSPHRASE,
  verifyITNSignature,
  verifyWithPayFastServer,
} from "@/lib/payfast";
import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/services/notification.service";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));

    console.log("[PayFast ITN] received params:", JSON.stringify(params));

    // Step 1: Verify signature
    const sigValid = verifyITNSignature(params, PAYFAST_PASSPHRASE);
    console.log("[PayFast ITN] signature valid:", sigValid);
    if (!sigValid) {
      console.error("[PayFast ITN] Invalid signature — passphrase configured:", !!PAYFAST_PASSPHRASE);
      return new NextResponse("Invalid signature", { status: 400 });
    }

    // Step 2: Verify with PayFast servers (non-blocking — log but don't reject on failure)
    const serverValid = await verifyWithPayFastServer(rawBody);
    console.log("[PayFast ITN] PayFast server validation:", serverValid);
    if (!serverValid) {
      console.warn("[PayFast ITN] PayFast server validation failed — proceeding anyway");
    }

    const paymentStatus = params.payment_status;
    const pfPaymentId = params.pf_payment_id;
    const bookingId = params.custom_str1;
    const type = params.custom_str2; // "rental" | "deposit"
    const grossAmount = parseFloat(params.amount_gross ?? "0");

    console.log("[PayFast ITN] status:", paymentStatus, "| bookingId:", bookingId, "| type:", type, "| amount:", grossAmount);

    if (!bookingId) {
      return new NextResponse("Missing bookingId", { status: 400 });
    }

    // Only act on COMPLETE status
    if (paymentStatus !== "COMPLETE") {
      return NextResponse.json({ ok: true });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        listing: { select: { ownerId: true, title: true } },
      },
    });

    if (!booking) {
      console.error(`[PayFast ITN] Booking not found: ${bookingId}`);
      return new NextResponse("Booking not found", { status: 404 });
    }

    if (type === "rental") {
      // Validate amount
      if (Math.abs(grossAmount - booking.totalAmount) > 0.5) {
        console.error(
          `[PayFast ITN] Amount mismatch. Expected ${booking.totalAmount}, got ${grossAmount}`
        );
        return new NextResponse("Amount mismatch", { status: 400 });
      }

      // Idempotent: skip if already confirmed
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
            provider: "PAYFAST",
            payfastPaymentId: pfPaymentId,
            paymentReference: pfPaymentId,
            paidAt: new Date(),
            escrowStatus: "HELD",
            depositStatus: (booking.depositAmount ?? 0) > 0 ? "HELD" : "WAIVED",
          },
          update: {
            status: "SUCCEEDED",
            provider: "PAYFAST",
            payfastPaymentId: pfPaymentId,
            paymentReference: pfPaymentId,
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
        body: `Your PayFast payment for "${booking.listing.title}" was successful. Your booking is confirmed.`,
        tab: "bookings",
        linkData: bookingId,
      });

      await createNotification({
        userId: booking.listing.ownerId,
        type: "PAYMENT_RECEIVED",
        title: "Payment received",
        body: `Payment via PayFast for "${booking.listing.title}" has been received. Your booking is confirmed.`,
        tab: "bookings",
        linkData: bookingId,
      });
    } else if (type === "deposit") {
      if (booking.payment) {
        await db.payment.update({
          where: { bookingId },
          data: { depositStatus: "HELD" },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[PayFast ITN] Unhandled error:", err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
