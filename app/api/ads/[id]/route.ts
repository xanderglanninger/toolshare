import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  return user?.role === "ADMIN" ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  try {
    const ad = await db.ad.update({
      where: { id },
      data: {
        ...(body.title     !== undefined && { title:     body.title }),
        ...(body.tagline   !== undefined && { tagline:   body.tagline }),
        ...(body.imageUrl  !== undefined && { imageUrl:  body.imageUrl }),
        ...(body.linkUrl   !== undefined && { linkUrl:   body.linkUrl }),
        ...(body.ctaText   !== undefined && { ctaText:   body.ctaText }),
        ...(body.priceText !== undefined && { priceText: body.priceText }),
        ...(body.active    !== undefined && { active:    body.active }),
        ...(body.startsAt  !== undefined && { startsAt:  body.startsAt ? new Date(body.startsAt) : null }),
        ...(body.endsAt    !== undefined && { endsAt:    body.endsAt   ? new Date(body.endsAt)   : null }),
      },
    });
    return NextResponse.json(ad);
  } catch {
    return NextResponse.json({ error: "Failed to update ad" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    await db.ad.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete ad" }, { status: 500 });
  }
}
