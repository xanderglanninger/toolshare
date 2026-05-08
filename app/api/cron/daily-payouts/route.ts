import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";

// Runs daily. For every ACTIVE booking, creates a DailyPayout record
// for today (idempotent) representing what the lister is owed for that day.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Find all active bookings whose rental period covers today
  const activeBookings = await db.booking.findMany({
    where: {
      status: "ACTIVE",
      startDate: { lte: today },
      endDate:   { gt: today },
    },
    include: {
      listing: { select: { ownerId: true, pricePerDay: true } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const booking of activeBookings) {
    try {
      await db.dailyPayout.upsert({
        where: { bookingId_date: { bookingId: booking.id, date: today } },
        create: {
          bookingId: booking.id,
          listerId:  booking.listing.ownerId,
          date:      today,
          amount:    booking.listing.pricePerDay,
          status:    "PENDING",
        },
        update: {}, // idempotent — don't overwrite if already exists
      });
      created++;
    } catch {
      skipped++;
    }
  }

  console.log(`[daily-payouts] ${today.toISOString().slice(0, 10)}: ${created} created, ${skipped} skipped, ${activeBookings.length} active bookings`);

  return NextResponse.json({ date: today.toISOString().slice(0, 10), created, skipped, total: activeBookings.length });
}
