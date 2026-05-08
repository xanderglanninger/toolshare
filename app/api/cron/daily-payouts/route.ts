import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sendPayout } from "@/lib/payfast-payouts";

// Runs daily at 06:00. For every ACTIVE booking, creates a DailyPayout record
// for today (idempotent) then transfers the amount to the lister's bank account.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

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

  const results = { created: 0, paid: 0, skipped: 0, failed: 0 };

  for (const booking of activeBookings) {
    // Idempotently create the payout record
    let payout;
    try {
      payout = await db.dailyPayout.upsert({
        where: { bookingId_date: { bookingId: booking.id, date: today } },
        create: {
          bookingId: booking.id,
          listerId:  booking.listing.ownerId,
          date:      today,
          amount:    booking.listing.pricePerDay,
          status:    "PENDING",
        },
        update: {},
      });
      results.created++;
    } catch {
      results.skipped++;
      continue;
    }

    if (payout.status === "PAID") {
      results.skipped++;
      continue;
    }

    // Fetch lister's bank account details
    const lister = await db.user.findUnique({
      where: { id: booking.listing.ownerId },
      select: {
        bankAccountHolder: true,
        bankName: true,
        bankAccountNumber: true,
        bankAccountType: true,
        bankBranchCode: true,
      },
    });

    if (!lister?.bankAccountHolder || !lister?.bankName || !lister?.bankAccountNumber || !lister?.bankAccountType) {
      console.warn(`[daily-payouts] Lister ${booking.listing.ownerId} has no bank account — skipping payout ${payout.id}`);
      results.skipped++;
      continue;
    }

    const dateStr = today.toISOString().slice(0, 10);
    const result = await sendPayout({
      listerId:          booking.listing.ownerId,
      payoutId:          payout.id,
      amount:            payout.amount,
      bankAccountHolder: lister.bankAccountHolder,
      bankName:          lister.bankName,
      bankAccountNumber: lister.bankAccountNumber,
      bankAccountType:   lister.bankAccountType ?? "cheque",
      bankBranchCode:    lister.bankBranchCode ?? "",
      reference:         `LendMe rental ${dateStr} booking ${booking.id.slice(-6)}`,
    });

    if (result.success) {
      await db.dailyPayout.update({
        where: { id: payout.id },
        data: { status: "PAID", paidAt: new Date(), reference: result.reference },
      });
      results.paid++;
    } else {
      await db.dailyPayout.update({
        where: { id: payout.id },
        data: { status: "FAILED" },
      });
      console.error(`[daily-payouts] Payout ${payout.id} failed:`, result.error);
      results.failed++;
    }
  }

  console.log(`[daily-payouts] ${today.toISOString().slice(0, 10)}:`, results);
  return NextResponse.json({ date: today.toISOString().slice(0, 10), ...results, total: activeBookings.length });
}
