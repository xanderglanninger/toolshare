import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { resolveDispute } from "@/lib/services/report.service";
import type { AdminDecision } from "@prisma/client";

type Params = { params: Promise<{ id: string }> };

// Mark dispute as under review
export async function PATCH(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: session.user.id } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await db.report.update({
      where: { id },
      data: { status: "REVIEWED", adminId: session.user.id },
    });

    return NextResponse.json({ data: report });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to update dispute" },
      { status: 400 }
    );
  }
}

// Resolve a dispute with a financial decision
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { decision, adminNotes, refundPercent } = await req.json();

    if (!decision) {
      return NextResponse.json({ error: "decision is required" }, { status: 400 });
    }

    if (
      decision === "PARTIAL_REFUND_BORROWER" &&
      (refundPercent === undefined || ![0, 50, 100].includes(refundPercent))
    ) {
      return NextResponse.json(
        { error: "refundPercent must be 0, 50, or 100 for partial refunds" },
        { status: 400 }
      );
    }

    await resolveDispute({
      reportId: id,
      adminId: session.user.id,
      decision: decision as AdminDecision,
      adminNotes: adminNotes ?? undefined,
      refundPercent: refundPercent ?? undefined,
    });

    return NextResponse.json({ data: { resolved: true } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to resolve dispute" },
      { status: 400 }
    );
  }
}
