import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  return user?.role === "ADMIN" ? session : null;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") ?? "";

  const users = await db.user.findMany({
    where: search ? {
      OR: [
        { name:    { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
        { email:   { contains: search, mode: "insensitive" } },
      ],
    } : undefined,
    select: {
      id: true, name: true, surname: true, email: true,
      role: true, image: true, idVerificationStatus: true, createdAt: true,
      _count: { select: { listings: true, borrowedBookings: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: users });
}

export async function PATCH(req: NextRequest) {
  const adminSession = await requireAdmin();
  if (!adminSession) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId, role } = await req.json();
  if (!userId || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "userId and role (USER|ADMIN) are required." }, { status: 400 });
  }
  // Prevent self-demotion
  if (userId === adminSession.user.id && role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, role: true },
  });

  return NextResponse.json({ data: updated });
}
