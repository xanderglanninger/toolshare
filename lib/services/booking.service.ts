import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/services/notification.service";
import type { BookingStatus, BookingWithDetails } from "@/lib/types";

const bookingInclude = {
  listing: {
    select: {
      id:           true,
      title:        true,
      images:       true,
      pricePerDay:  true,
      pricePerWeek: true,
      pricePerMonth: true,
      city:         true,
      province:     true,
      category:     true,
      owner: { select: { id: true, name: true, surname: true, image: true } },
    },
  },
  borrower: { select: { id: true, name: true, surname: true, image: true } },
  payment:  { select: { status: true, paidAt: true, amount: true, paymentReference: true, escrowStatus: true, depositStatus: true } },
  reviews:  { select: { reviewerId: true } },
};

export async function createBooking(data: {
  listingId:     string;
  borrowerId:    string;
  startDate:     Date;
  endDate:       Date;
  totalAmount:   number;
  depositAmount?: number | null;
  notes?:        string | null;
}): Promise<BookingWithDetails> {
  if (data.startDate >= data.endDate)
    throw new Error("End date must be after start date.");

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (data.startDate < now)
    throw new Error("Start date cannot be in the past.");

  const listing = await db.listing.findUnique({ where: { id: data.listingId } });
  if (!listing)                          throw new Error("Listing not found.");
  if (!listing.isAvailable)             throw new Error("This item is not available for booking.");
  if (listing.ownerId === data.borrowerId) throw new Error("You cannot book your own listing.");

  const overlapping = await db.booking.count({
    where: {
      listingId: data.listingId,
      status:    { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      startDate: { lt: data.endDate },
      endDate:   { gt: data.startDate },
    },
  });
  if (overlapping > 0)
    throw new Error("This item is already booked for some or all of those dates.");

  return db.booking.create({
    data: {
      listingId:    data.listingId,
      borrowerId:   data.borrowerId,
      startDate:    data.startDate,
      endDate:      data.endDate,
      totalAmount:  data.totalAmount,
      depositAmount: data.depositAmount ?? null,
      notes:        data.notes ?? null,
      status:       "PENDING",
    },
    include: bookingInclude,
  }) as unknown as Promise<BookingWithDetails>;
}

export async function getBookingById(id: string): Promise<BookingWithDetails | null> {
  return db.booking.findUnique({
    where: { id },
    include: bookingInclude,
  }) as unknown as Promise<BookingWithDetails | null>;
}

export async function getBookingsByBorrower(borrowerId: string): Promise<BookingWithDetails[]> {
  return db.booking.findMany({
    where: { borrowerId },
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  }) as unknown as Promise<BookingWithDetails[]>;
}

export async function getBookingsByOwner(ownerId: string): Promise<BookingWithDetails[]> {
  return db.booking.findMany({
    where: { listing: { ownerId } },
    orderBy: { createdAt: "desc" },
    include: bookingInclude,
  }) as unknown as Promise<BookingWithDetails[]>;
}

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
  userId: string
): Promise<BookingWithDetails> {
  if (status === "COMPLETED") {
    throw new Error("Use the confirm-completion endpoint to complete a booking.");
  }
  if (status === "CANCELLED") {
    throw new Error("Use the cancel endpoint to cancel a booking.");
  }

  const booking = await db.booking.findUnique({
    where: { id },
    include: { listing: { select: { ownerId: true } } },
  });
  if (!booking) throw new Error("Booking not found.");

  const isBorrower = booking.borrowerId === userId;
  const isOwner    = booking.listing.ownerId === userId;
  if (!isBorrower && !isOwner) throw new Error("Forbidden.");

  if (status === "CONFIRMED" && !isOwner)
    throw new Error("Only the listing owner can confirm bookings.");

  if (status === "ACTIVE" && !isOwner)
    throw new Error("Only the listing owner can mark a booking as active.");

  return db.booking.update({
    where: { id },
    data:  { status },
    include: bookingInclude,
  }) as unknown as Promise<BookingWithDetails>;
}

export async function confirmCompletion(
  bookingId: string,
  userId: string
): Promise<{ bothConfirmed: boolean; escrowReleaseAt: Date | null }> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "ACTIVE") throw new Error("Only ACTIVE bookings can be completed.");

  const isBorrower = booking.borrowerId === userId;
  const isOwner    = booking.listing.ownerId === userId;
  if (!isBorrower && !isOwner) throw new Error("Forbidden.");

  const updateData: Record<string, unknown> = {};
  if (isBorrower && !booking.borrowerConfirmed) {
    updateData.borrowerConfirmed = true;
    updateData.borrowerConfirmedAt = new Date();
  } else if (isOwner && !booking.ownerConfirmed) {
    updateData.ownerConfirmed = true;
    updateData.ownerConfirmedAt = new Date();
  }

  const updatedBorrowerConfirmed = isBorrower ? true : booking.borrowerConfirmed;
  const updatedOwnerConfirmed    = isOwner    ? true : booking.ownerConfirmed;
  const bothConfirmed = updatedBorrowerConfirmed && updatedOwnerConfirmed;

  let escrowReleaseAt: Date | null = null;
  if (bothConfirmed) {
    escrowReleaseAt = new Date(booking.endDate.getTime() + 48 * 60 * 60 * 1000);
    updateData.status = "COMPLETED";
    updateData.escrowReleaseAt = escrowReleaseAt;

    await db.$transaction(async (tx) => {
      await tx.booking.update({ where: { id: bookingId }, data: updateData });
      await tx.escrowReleaseJob.upsert({
        where: { bookingId },
        update: { scheduledAt: escrowReleaseAt!, status: "PENDING", error: null },
        create: { bookingId, scheduledAt: escrowReleaseAt! },
      });
    });

    await createNotification({
      userId: booking.borrowerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `Your rental of "${booking.listing.title}" is complete. The deposit will be returned within 48 hours if no dispute is raised.`,
      tab: "bookings",
      linkData: bookingId,
    });
    await createNotification({
      userId: booking.listing.ownerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `The rental of "${booking.listing.title}" is complete. Funds will be released to your account within 48 hours if no dispute is raised.`,
      tab: "bookings",
      linkData: bookingId,
    });
  } else {
    await db.booking.update({ where: { id: bookingId }, data: updateData });
    const otherUserId = isBorrower ? booking.listing.ownerId : booking.borrowerId;
    const waitingOn   = isBorrower ? "The borrower" : "The owner";
    await createNotification({
      userId: otherUserId,
      type: "BOOKING_COMPLETED",
      title: "Please confirm return",
      body: `${waitingOn} has confirmed the return of "${booking.listing.title}". Please confirm on your end to release funds.`,
      tab: "bookings",
      linkData: bookingId,
    });
  }

  return { bothConfirmed, escrowReleaseAt };
}

export async function getBookedDateRanges(
  listingId: string
): Promise<{ startDate: Date; endDate: Date }[]> {
  return db.booking.findMany({
    where: {
      listingId,
      status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
    },
    select: { startDate: true, endDate: true },
  });
}
