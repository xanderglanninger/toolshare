import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });

  const { id } = await params;

  const booking = await db.booking.findUnique({
    where: { id },
    select: {
      borrowerId: true,
      listing: { select: { ownerId: true } },
      returnIssues: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });

  const isOwner    = booking.listing.ownerId === session.user.id;
  const isBorrower = booking.borrowerId === session.user.id;
  if (!isOwner && !isBorrower) return NextResponse.json({ error: "Access denied." }, { status: 403 });

  return NextResponse.json({ data: booking.returnIssues });
}
