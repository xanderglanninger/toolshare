import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReport, getReportsByReporter, openDispute, isFinancialDispute } from "@/lib/services/report.service";
import type { ReportReason, DisputeType } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reports = await getReportsByReporter(session.user.id);
    return NextResponse.json({ data: reports });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportedId, bookingId, reason, details, disputeType } = await req.json();

    if (!reportedId || !reason) {
      return NextResponse.json({ error: "reportedId and reason are required" }, { status: 400 });
    }

    // Financial reasons with a bookingId trigger full dispute (escrow freeze)
    if (bookingId && isFinancialDispute(reason as ReportReason)) {
      if (!disputeType) {
        return NextResponse.json({ error: "disputeType required for financial disputes" }, { status: 400 });
      }
      const report = await openDispute({
        reporterId: session.user.id,
        reportedId,
        bookingId,
        reason: reason as ReportReason,
        details: details ?? undefined,
        disputeType: disputeType as DisputeType,
      });
      return NextResponse.json({ data: report }, { status: 201 });
    }

    const report = await createReport({
      reporterId: session.user.id,
      reportedId,
      bookingId: bookingId ?? undefined,
      reason,
      details: details ?? undefined,
    });

    return NextResponse.json({ data: report }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to submit report" },
      { status: 400 }
    );
  }
}
