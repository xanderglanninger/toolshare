import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const now = new Date();
    const ads = await db.ad.findMany({
      where: {
        active: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ads);
  } catch {
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (user?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { title, tagline, imageUrl, linkUrl, ctaText, priceText, startsAt, endsAt } = body;

    if (!title || !linkUrl) {
      return NextResponse.json({ error: "title and linkUrl are required" }, { status: 400 });
    }

    const ad = await db.ad.create({
      data: {
        title,
        tagline:  tagline  ?? null,
        imageUrl: imageUrl ?? null,
        linkUrl,
        ctaText:  ctaText  ?? "Learn More",
        priceText: priceText ?? null,
        startsAt: startsAt ? new Date(startsAt) : null,
        endsAt:   endsAt   ? new Date(endsAt)   : null,
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create ad" }, { status: 500 });
  }
}
