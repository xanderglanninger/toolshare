import { NextRequest, NextResponse } from "next/server";
import { db as prisma } from "@/lib/db/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, surname: true, image: true, createdAt: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const [listings, reviewAgg] = await Promise.all([
    prisma.listing.findMany({
      where: { ownerId: id, isAvailable: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, images: true, category: true,
        pricePerDay: true, pricePerWeek: true, pricePerMonth: true,
        city: true, province: true, depositAmount: true,
      },
    }),
    prisma.review.aggregate({
      where: { reviewedId: id },
      _avg: { rating: true },
      _count: { id: true },
    }),
  ]);

  return NextResponse.json({
    data: {
      user,
      listings,
      reviewStats: {
        averageRating: reviewAgg._avg.rating ?? 0,
        count: reviewAgg._count.id,
      },
    },
  });
}
