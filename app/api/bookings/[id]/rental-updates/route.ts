import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/services/notification.service";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: {
      listing: { select: { ownerId: true } },
      rentalUpdates: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const isOwner = booking.listing.ownerId === session.user.id;
  const isBorrower = booking.borrowerId === session.user.id;
  if (!isOwner && !isBorrower) {
    return NextResponse.json({ error: "Access denied." }, { status: 403 });
  }

  return NextResponse.json({ data: booking.rentalUpdates });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    include: { listing: { select: { ownerId: true, title: true } } },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.borrowerId !== session.user.id) {
    return NextResponse.json({ error: "Only the borrower can post rental updates." }, { status: 403 });
  }
  if (booking.status !== "ACTIVE") {
    return NextResponse.json({ error: "Updates can only be posted while the rental is active." }, { status: 400 });
  }

  const body = await req.json();
  const message: string = (body.message ?? "").trim();
  const photos: string[] = Array.isArray(body.photos) ? body.photos : [];

  if (!message) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const update = await db.rentalUpdate.create({
    data: { bookingId: id, message, photos },
  });

  await createNotification({
    userId: booking.listing.ownerId,
    type: "RENTAL_UPDATE",
    title: "Rental update from borrower",
    body: `Update on "${booking.listing.title}": ${message}`,
    tab: "lent",
    linkData: JSON.stringify({ bookingId: id }),
  });

  return NextResponse.json({ data: update }, { status: 201 });
}
