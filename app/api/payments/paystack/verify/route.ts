import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { PAYSTACK_BASE_URL, paystackHeaders } from "@/lib/paystack";
import { createNotification } from "@/lib/services/notification.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reference, bookingId } = await req.json();
  if (!reference || !bookingId) {
    return NextResponse.json({ error: "reference and bookingId required" }, { status: 400 });
  }

  // Verify the transaction directly with Paystack
  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: paystackHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.status || json.data?.status !== "success") {
    return NextResponse.json({ confirmed: false, status: json.data?.status ?? "unknown" });
  }

  const grossAmount: number = json.data.amount / 100;
  const metadata = json.data.metadata ?? {};
  const type: string = metadata.type ?? "rental";

  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      payment: true,
      listing: { select: { ownerId: true, title: true } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  if (booking.borrowerId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Already confirmed — nothing to do
  if (booking.status === "CONFIRMED" && booking.payment?.status === "SUCCEEDED") {
    return NextResponse.json({ confirmed: true });
  }

  if (type === "rental") {
    if (Math.abs(grossAmount - booking.totalAmount) > 0.5) {
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
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
    if (booking.payment) {
      await db.payment.update({
        where: { bookingId },
        data: { depositStatus: "HELD" },
      });
    }
  }

  return NextResponse.json({ confirmed: true });
}
