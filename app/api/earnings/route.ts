import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // All succeeded payments for listings owned by this user
    const payments = await db.payment.findMany({
      where: {
        status: "SUCCEEDED",
        booking: { listing: { ownerId: userId } },
      },
      include: {
        booking: {
          include: {
            listing: { select: { id: true, title: true } },
          },
        },
      },
      orderBy: { paidAt: "asc" },
    });

    const totalEarned = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalBookings = payments.length;
    const avgPerBooking = totalBookings > 0 ? totalEarned / totalBookings : 0;

    // Active listings (available = true)
    const activeListings = await db.listing.count({
      where: { ownerId: userId, isAvailable: true },
    });

    // Active + pending booking counts (as the lender)
    const activeBookings = await db.booking.count({
      where: {
        listing: { ownerId: userId },
        status: { in: ["CONFIRMED", "ACTIVE"] },
      },
    });

    const pendingRequests = await db.booking.count({
      where: {
        listing: { ownerId: userId },
        status: "PENDING",
      },
    });

    // Monthly breakdown — last 6 months
    const now = new Date();
    const monthly: { month: string; year: number; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      const amount = payments
        .filter((p) => {
          const pd = new Date(p.paidAt ?? p.createdAt);
          return pd >= monthStart && pd <= monthEnd;
        })
        .reduce((sum, p) => sum + p.amount, 0);

      monthly.push({
        month: d.toLocaleDateString("en-ZA", { month: "short" }),
        year: d.getFullYear(),
        amount,
      });
    }

    // Per-listing breakdown
    const byListingMap = new Map<
      string,
      { title: string; bookings: number; earned: number }
    >();
    for (const p of payments) {
      const { id, title } = p.booking.listing;
      const cur = byListingMap.get(id) ?? { title, bookings: 0, earned: 0 };
      byListingMap.set(id, {
        title,
        bookings: cur.bookings + 1,
        earned: cur.earned + p.amount,
      });
    }
    const byListing = Array.from(byListingMap.entries())
      .map(([listingId, data]) => ({ listingId, ...data }))
      .sort((a, b) => b.earned - a.earned);

    // Month-over-month change (current vs previous month)
    const currentMonth = monthly[monthly.length - 1]?.amount ?? 0;
    const prevMonth = monthly[monthly.length - 2]?.amount ?? 0;
    const percentageChange =
      prevMonth > 0
        ? Math.round(((currentMonth - prevMonth) / prevMonth) * 100)
        : null;

    return NextResponse.json({
      data: {
        totalEarned,
        totalBookings,
        avgPerBooking,
        activeListings,
        activeBookings,
        pendingRequests,
        percentageChange,
        monthly,
        byListing,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch earnings" },
      { status: 500 }
    );
  }
}
