import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sendTransfer } from "@/lib/paystack-transfers";

const PLATFORM_FEE_RATE = 0.10; // 10% platform fee

// Runs daily at 06:00. For every ACTIVE booking, creates a DailyPayout record
// for today (idempotent) then transfers the lender's net daily share via Paystack.
//
// Payout math:
//   lenderPool  = totalAmount * (1 - PLATFORM_FEE_RATE)
//   dailyAmount = lenderPool / numRentalDays
//   Platform keeps the remaining 10% in the Paystack balance.
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
      endDate: { gt: today },
      payment: { status: "SUCCEEDED" },
    },
    include: {
      listing: { select: { ownerId: true } },
      payment: { select: { status: true } },
    },
  });

  const results = { created: 0, paid: 0, skipped: 0, failed: 0 };

  for (const booking of activeBookings) {
    // Calculate net daily payout: lender gets 90% of totalAmount split across rental days
    const numDays = Math.max(
      1,
      Math.round((booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    const lenderPool = booking.totalAmount * (1 - PLATFORM_FEE_RATE);
    const dailyAmount = Math.round((lenderPool / numDays) * 100) / 100; // round to 2 dp

    let payout;
    try {
      payout = await db.dailyPayout.upsert({
        where: { bookingId_date: { bookingId: booking.id, date: today } },
        create: {
          bookingId: booking.id,
          listerId: booking.listing.ownerId,
          date: today,
          amount: dailyAmount,
          status: "PENDING",
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

    const lister = await db.user.findUnique({
      where: { id: booking.listing.ownerId },
      select: {
        paystackRecipientCode: true,
        bankAccountHolder: true,
        bankName: true,
        bankAccountNumber: true,
        bankBranchCode: true,
      },
    });

    if (!lister?.paystackRecipientCode) {
      console.warn(`[daily-payouts] Lister ${booking.listing.ownerId} has no Paystack recipient code — skipping payout ${payout.id}`);
      results.skipped++;
      continue;
    }

    const dateStr = today.toISOString().slice(0, 10);
    const result = await sendTransfer({
      listerId: booking.listing.ownerId,
      payoutId: payout.id,
      amount: dailyAmount,
      recipientCode: lister.paystackRecipientCode,
      reference: `LendMe rental ${dateStr} booking ${booking.id.slice(-6)}`,
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
