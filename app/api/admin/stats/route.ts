import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db as prisma } from "@/lib/db/client";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
  if (admin?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    verifiedUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    totalListings,
    activeListings,
    totalBookings,
    activeBookings,
    completedBookings,
    cancelledBookings,
    pendingBookings,
    totalRevenue,
    revenueThisMonth,
    revenueLastMonth,
    pendingDisputes,
    resolvedDisputes,
    pendingKyc,
    recentBookings,
    revenueByMonth,
    bookingsByCategory,
    topListings,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { idVerificationStatus: "verified" } }),
    prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.user.count({ where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } } }),
    prisma.listing.count(),
    prisma.listing.count({ where: { isAvailable: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "ACTIVE" } }),
    prisma.booking.count({ where: { status: "COMPLETED" } }),
    prisma.booking.count({ where: { status: "CANCELLED" } }),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED", payment: { status: "SUCCEEDED" } },
      _sum: { platformFee: true },
    }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED", payment: { status: "SUCCEEDED" }, createdAt: { gte: startOfMonth } },
      _sum: { platformFee: true },
    }),
    prisma.booking.aggregate({
      where: { status: "COMPLETED", payment: { status: "SUCCEEDED" }, createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { platformFee: true },
    }),
    prisma.report.count({ where: { status: "PENDING" } }),
    prisma.report.count({ where: { status: "RESOLVED" } }),
    prisma.user.count({ where: { idVerificationStatus: "pending" } }),
    prisma.booking.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalAmount: true,
        platformFee: true,
        status: true,
        createdAt: true,
        listing: { select: { title: true } },
        borrower: { select: { name: true } },
      },
    }),
    // Platform fee revenue by month (last 6 months)
    prisma.booking.findMany({
      where: { status: "COMPLETED", payment: { status: "SUCCEEDED" }, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 5, 1) } },
      select: { platformFee: true, createdAt: true },
    }),
    // Bookings by category
    prisma.booking.findMany({
      where: { status: { in: ["COMPLETED", "ACTIVE"] } },
      select: { listing: { select: { category: true } } },
    }),
    prisma.listing.findMany({
      take: 5,
      orderBy: { bookings: { _count: "desc" } },
      select: {
        id: true,
        title: true,
        pricePerDay: true,
        category: true,
        _count: { select: { bookings: true } },
      },
    }),
    prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, surname: true, email: true, idVerificationStatus: true, createdAt: true },
    }),
  ]);

  // Aggregate platform fee revenue by month
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revenueMap: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    revenueMap[`${d.getFullYear()}-${d.getMonth()}`] = 0;
  }
  for (const b of revenueByMonth) {
    const key = `${b.createdAt.getFullYear()}-${b.createdAt.getMonth()}`;
    if (key in revenueMap) revenueMap[key] += b.platformFee ?? 0;
  }
  const revenueChart = Object.entries(revenueMap).map(([key, amount]) => {
    const [year, month] = key.split("-").map(Number);
    return { label: `${monthNames[month]} ${year}`, amount };
  });

  // Aggregate by category
  const catMap: Record<string, number> = {};
  for (const b of bookingsByCategory) {
    const cat = b.listing?.category ?? "OTHER";
    catMap[cat] = (catMap[cat] ?? 0) + 1;
  }
  const categoryBreakdown = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([category, count]) => ({ category, count }));

  const activeUsersLast30Days = await prisma.user.count({
    where: {
      OR: [
        { borrowedBookings: { some: { createdAt: { gte: thirtyDaysAgo } } } },
        { listings: { some: { bookings: { some: { createdAt: { gte: thirtyDaysAgo } } } } } },
      ],
    },
  });

  return NextResponse.json({
    users: {
      total: totalUsers,
      verified: verifiedUsers,
      pendingKyc,
      newThisMonth: newUsersThisMonth,
      newLastMonth: newUsersLastMonth,
      activeLast30Days: activeUsersLast30Days,
    },
    listings: {
      total: totalListings,
      active: activeListings,
    },
    bookings: {
      total: totalBookings,
      active: activeBookings,
      completed: completedBookings,
      cancelled: cancelledBookings,
      pending: pendingBookings,
    },
    revenue: {
      total: totalRevenue._sum.platformFee ?? 0,
      thisMonth: revenueThisMonth._sum.platformFee ?? 0,
      lastMonth: revenueLastMonth._sum.platformFee ?? 0,
    },
    disputes: {
      pending: pendingDisputes,
      resolved: resolvedDisputes,
    },
    revenueChart,
    categoryBreakdown,
    recentBookings,
    topListings,
    recentUsers,
  });
}
