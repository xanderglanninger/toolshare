import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { releaseEscrow, releaseDeposit } from "@/lib/services/payments.service";

// This endpoint should be called hourly by an external cron job/scheduler.
// Header: Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobs = await db.escrowReleaseJob.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lte: new Date() },
    },
  });

  const results: { bookingId: string; status: "released" | "skipped" | "error"; reason?: string }[] = [];

  for (const job of jobs) {
    const openDispute = await db.report.findFirst({
      where: {
        bookingId: job.bookingId,
        escrowFrozen: true,
        status: { in: ["PENDING", "REVIEWED"] },
      },
    });

    if (openDispute) {
      results.push({ bookingId: job.bookingId, status: "skipped", reason: "open_dispute" });
      continue;
    }

    try {
      await releaseEscrow(job.bookingId);
      await releaseDeposit(job.bookingId, "borrower");
      await db.escrowReleaseJob.update({
        where: { id: job.id },
        data: { status: "DONE", processedAt: new Date() },
      });
      results.push({ bookingId: job.bookingId, status: "released" });
    } catch (err: any) {
      await db.escrowReleaseJob.update({
        where: { id: job.id },
        data: { status: "FAILED", error: err?.message ?? "unknown error" },
      });
      results.push({ bookingId: job.bookingId, status: "error", reason: err?.message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
