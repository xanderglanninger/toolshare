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
      issues: { orderBy: { createdAt: "asc" } },
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

  return NextResponse.json({ data: booking.issues });
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
    return NextResponse.json({ error: "Only the borrower can log issues." }, { status: 403 });
  }
  if (booking.status !== "CONFIRMED") {
    return NextResponse.json({ error: "Issues can only be logged for confirmed bookings." }, { status: 400 });
  }
  // Fix #5: Lock issue logging once the borrower has submitted the inspection
  if ((booking as any).borrowerIssuesSubmitted) {
    return NextResponse.json({ error: "Inspection already submitted. No further issues can be logged." }, { status: 400 });
  }
  if (booking.listerHandoverSigned) {
    return NextResponse.json({ error: "Cannot log issues after handover has been signed." }, { status: 400 });
  }

  const body = await req.json();
  const description: string = (body.description ?? "").trim();
  const photos: string[] = Array.isArray(body.photos) ? body.photos : [];

  if (!description) {
    return NextResponse.json({ error: "Description is required." }, { status: 400 });
  }

  const issue = await db.bookingIssue.create({
    data: { bookingId: id, description, photos },
  });

  await createNotification({
    userId: booking.listing.ownerId,
    type: "ISSUES_LOGGED",
    title: "Issue logged before handover",
    body: `The borrower has logged a pre-existing issue for "${booking.listing.title}": ${description}`,
    tab: "lent",
    linkData: JSON.stringify({ bookingId: id }),
  });

  return NextResponse.json({ data: issue }, { status: 201 });
}
