import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

type Params = { params: Promise<{ id: string; issueId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }

  const { id, issueId } = await params;

  const booking = await db.booking.findUnique({ where: { id } });
  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.borrowerId !== session.user.id) {
    return NextResponse.json({ error: "Only the borrower can remove issues." }, { status: 403 });
  }
  if (booking.listerHandoverSigned) {
    return NextResponse.json({ error: "Cannot remove issues after handover has been signed." }, { status: 400 });
  }

  const issue = await db.bookingIssue.findUnique({ where: { id: issueId } });
  if (!issue || issue.bookingId !== id) {
    return NextResponse.json({ error: "Issue not found." }, { status: 404 });
  }

  await db.bookingIssue.delete({ where: { id: issueId } });
  return NextResponse.json({ data: { success: true } });
}
