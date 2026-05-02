import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getThreadsByUser, getOrCreateThread, getOrCreateListingThread } from "@/lib/services/messaging.service";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const threads = await getThreadsByUser(session.user.id);
    return NextResponse.json({ data: threads });
  } catch {
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 });
  }
}

// POST /api/messages — get-or-create a thread for a booking
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, listingId } = await req.json();

    if (listingId) {
      const listing = await db.listing.findUnique({
        where: { id: listingId },
        select: { title: true, ownerId: true },
      });
      if (!listing) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
      if (session.user.id === listing.ownerId) {
        return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
      }
      const result = await getOrCreateListingThread({
        ownerId: listing.ownerId,
        borrowerId: session.user.id,
        subject: listing.title,
      });
      return NextResponse.json({ data: result }, { status: result.isNew ? 201 : 200 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: "bookingId or listingId is required" }, { status: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: { select: { title: true, ownerId: true } },
        borrower: { select: { id: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const userId = session.user.id;
    const ownerId = booking.listing.ownerId;
    const borrowerId = booking.borrowerId;

    if (userId !== ownerId && userId !== borrowerId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const result = await getOrCreateThread({
      bookingId,
      participantIds: [ownerId, borrowerId],
      subject: booking.listing.title,
    });

    return NextResponse.json({ data: result }, { status: result.isNew ? 201 : 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create thread" },
      { status: 500 }
    );
  }
}
