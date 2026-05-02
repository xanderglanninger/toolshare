import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { confirmPayment } from "@/lib/services/payments.service";
import { getBookingById } from "@/lib/services/booking.service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, paymentIntentId } = await req.json();
    if (!bookingId || !paymentIntentId) {
      return NextResponse.json(
        { error: "bookingId and paymentIntentId required" },
        { status: 400 }
      );
    }

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }
    if (booking.borrowerId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await confirmPayment(bookingId, paymentIntentId);
    return NextResponse.json({ data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Payment confirmation failed" },
      { status: 400 }
    );
  }
}
