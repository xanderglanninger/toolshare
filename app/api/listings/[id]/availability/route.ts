import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

const COOLDOWN_DAYS = 2;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const listing = await db.listing.findUnique({
    where: { id },
    select: { quantity: true, isAvailable: true },
  });

  if (!listing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const bookings = await db.booking.findMany({
    where: {
      listingId: id,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      // Fetch up to 6 months ahead
      startDate: { lt: new Date(Date.now() + 180 * 86400000) },
    },
    select: { startDate: true, endDate: true },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({
    data: {
      quantity: (listing as any).quantity ?? 1,
      bookings: bookings.map((b) => ({
        startDate:   b.startDate.toISOString(),
        endDate:     b.endDate.toISOString(),
        cooldownEnd: new Date(b.endDate.getTime() + COOLDOWN_DAYS * 86400000).toISOString(),
      })),
    },
  });
}
