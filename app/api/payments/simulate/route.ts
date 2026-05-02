import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBookingById } from "@/lib/services/booking.service";
import { db } from "@/lib/db/client";

// Only available outside production. Simulates a successful Stripe payment
// so the full booking→payment→confirmation flow can be tested without real cards.
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId } = await req.json();
    if (!bookingId) {
      return NextResponse.json({ error: "bookingId required" }, { status: 400 });
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.borrowerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (booking.status === "CONFIRMED") {
      const existing = await db.payment.findUnique({ where: { bookingId } });
      if (existing?.status === "SUCCEEDED") {
        return NextResponse.json({ data: { paymentReference: existing.paymentReference } });
      }
    }
    if (booking.status !== "PENDING") {
      return NextResponse.json({ error: "Booking is not pending payment" }, { status: 400 });
    }

    const fakeRef = `sim_${Date.now()}_${bookingId.slice(0, 8)}`;

    await db.$transaction([
      // Upsert so we don't fail if a Payment row already exists
      db.payment.upsert({
        where: { bookingId },
        update: {
          status: "SUCCEEDED",
          paymentReference: fakeRef,
          paidAt: new Date(),
        },
        create: {
          bookingId,
          amount: booking.totalAmount,
          currency: "ZAR",
          status: "SUCCEEDED",
          paymentReference: fakeRef,
          paidAt: new Date(),
        },
      }),
      db.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      }),
    ]);

    return NextResponse.json({ data: { paymentReference: fakeRef } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Simulation failed" },
      { status: 500 }
    );
  }
}
