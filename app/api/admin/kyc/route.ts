import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session : null;
}

// GET /api/admin/kyc — list users pending verification
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const users = await db.user.findMany({
    where: { idVerificationStatus: { in: ["pending", "rejected"] } },
    select: {
      id: true, name: true, surname: true, email: true,
      selfieUrl: true, idPhotoUrl: true, idVerificationStatus: true,
      idNumber: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

// PATCH /api/admin/kyc — approve or reject a user
export async function PATCH(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, action } = await req.json(); // action: "approve" | "reject"
  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "userId and action (approve|reject) are required." }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { idVerificationStatus: action === "approve" ? "verified" : "rejected" },
    select: { id: true, idVerificationStatus: true },
  });

  return NextResponse.json({ data: updated });
}
