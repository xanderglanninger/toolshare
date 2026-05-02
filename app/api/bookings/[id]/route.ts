import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBookingById, updateBookingStatus } from "@/lib/services/booking.service";
import { createNotification } from "@/lib/services/notification.service";
import type { BookingStatus } from "@/lib/types";
// Note: COMPLETED → use /confirm-completion  CANCELLED → use /cancel

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const booking = await getBookingById(id);
    if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isBorrower = booking.borrowerId === session.user.id;
    const isOwner    = booking.listing.owner.id === session.user.id;
    if (!isBorrower && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ data: booking });
  } catch {
    return NextResponse.json({ error: "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await req.json();
    if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });

    const booking = await updateBookingStatus(id, status as BookingStatus, session.user.id);

    // Notify the other party of the status change
    const ownerId    = (booking as any).listing?.owner?.id;
    const borrowerId = (booking as any).borrower?.id;
    const listingTitle = (booking as any).listing?.title ?? "a booking";
    const notifyUserId = session.user.id === ownerId ? borrowerId : ownerId;

    const statusLabels: Record<string, string> = {
      CONFIRMED:  "confirmed",
      CANCELLED:  "cancelled",
      ACTIVE:     "marked as active",
      COMPLETED:  "completed",
    };
    const label = statusLabels[status] ?? status.toLowerCase();

    if (notifyUserId) {
      const typeMap: Record<string, any> = {
        CONFIRMED: "BOOKING_CONFIRMED",
        CANCELLED: "BOOKING_CANCELLED",
        COMPLETED: "BOOKING_COMPLETED",
      };
      createNotification({
        userId: notifyUserId,
        type: typeMap[status] ?? "BOOKING_CONFIRMED",
        title: `Booking ${label.charAt(0).toUpperCase() + label.slice(1)}`,
        body: `Your booking for "${listingTitle}" has been ${label}`,
        tab: "bookings",
        linkData: id,
      }).catch(() => {});
    }

    return NextResponse.json({ data: booking });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update booking" },
      { status: 400 }
    );
  }
}
