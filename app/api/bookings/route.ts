import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  createBooking,
  getBookingsByBorrower,
  getBookingsByOwner,
} from "@/lib/services/booking.service";
import { createNotification } from "@/lib/services/notification.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role"); // "owner" | "borrower" (default)

    const bookings =
      role === "owner"
        ? await getBookingsByOwner(session.user.id)
        : await getBookingsByBorrower(session.user.id);

    return NextResponse.json({ data: bookings });
  } catch (err: any) {
    console.error("[GET /api/bookings]", err);
    return NextResponse.json({ error: err?.message ?? "Failed to fetch bookings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { listingId, startDate, endDate, totalAmount, depositAmount, notes } = body;

    if (!listingId || !startDate || !endDate || totalAmount === undefined) {
      return NextResponse.json({ error: "listingId, startDate, endDate and totalAmount are required" }, { status: 400 });
    }

    const booking = await createBooking({
      listingId,
      borrowerId:   session.user.id,
      startDate:    new Date(startDate),
      endDate:      new Date(endDate),
      totalAmount:  Number(totalAmount),
      depositAmount: depositAmount != null ? Number(depositAmount) : null,
      notes:        notes ?? null,
    });

    // Notify listing owner of new booking request
    const ownerId = (booking as any).listing?.owner?.id;
    if (ownerId) {
      const borrowerName = (booking as any).borrower?.name ?? "Someone";
      const listingTitle = (booking as any).listing?.title ?? "your listing";
      createNotification({
        userId: ownerId,
        type: "BOOKING_REQUEST",
        title: "New Booking Request",
        body: `${borrowerName} requested to book "${listingTitle}"`,
        tab: "bookings",
      }).catch(() => {});
    }

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create booking" },
      { status: 400 }
    );
  }
}
