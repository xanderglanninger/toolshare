import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = await db.user.findUnique({ where: { id: session.user.id } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const disputes = await db.report.findMany({
      where: {
        escrowFrozen: true,
        status: { in: ["PENDING", "REVIEWED"] },
      },
      include: {
        reporter: { select: { id: true, name: true, surname: true, email: true, image: true } },
        reported: { select: { id: true, name: true, surname: true, email: true, image: true } },
        booking: {
          include: {
            payment: { select: { amount: true, escrowStatus: true, depositStatus: true, depositPaymentIntentId: true } },
            listing: { select: { title: true, images: true, owner: { select: { id: true, name: true } } } },
          },
        },
        evidence: {
          include: { uploader: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: disputes });
  } catch {
    return NextResponse.json({ error: "Failed to fetch disputes" }, { status: 500 });
  }
}
