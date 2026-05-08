import { db } from "@/lib/db/client";
import { createNotification } from "@/lib/services/notification.service";
import { issuePartialRefund, releaseDeposit } from "@/lib/services/payments.service";
import type { BookingStatus, BookingWithDetails } from "@/lib/types";
import { calculateBookingAmounts } from "@/lib/utils/platform-fee";

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
      owner: { select: { id: true, name: true, surname: true, image: true, idVerificationStatus: true } },
    },
  },
  borrower: { select: { id: true, name: true, surname: true, image: true } },
  payment:  { select: { status: true, paidAt: true, amount: true, paymentReference: true, escrowStatus: true, depositStatus: true } },
  reviews:  { select: { reviewerId: true } },
  issues:         { select: { id: true, bookingId: true, description: true, photos: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
  returnIssues:   { select: { id: true, bookingId: true, description: true, photos: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
  rentalUpdates:  { select: { id: true, bookingId: true, message: true, photos: true, createdAt: true }, orderBy: { createdAt: "asc" as const } },
};

// Scalar fields on Booking that need to be explicitly passed through (they are returned by default with include)
// TypeScript cast via `as unknown as BookingWithDetails` handles this.

export function computeDays(startDate: Date, endDate: Date): number {
  return Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
}

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

  const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000; // 2-day handover cooldown

  const listing = await db.listing.findUnique({
    where: { id: data.listingId },
    include: { owner: { select: { idVerificationStatus: true } } },
  });
  if (!listing)                            throw new Error("Listing not found.");
  if (!listing.isAvailable)               throw new Error("This item is not available for booking.");
  if (listing.ownerId === data.borrowerId) throw new Error("You cannot book your own listing.");

  // Fix #8: Re-check owner verification at booking time (status may have been revoked)
  if ((listing as any).owner?.idVerificationStatus !== "verified") {
    throw new Error("This listing is not available because the owner's identity has not been verified.");
  }

  // Fix #3: Prevent booking spam — cap pending bookings per borrower
  const MAX_PENDING = 3;
  const pendingCount = await db.booking.count({
    where: { borrowerId: data.borrowerId, status: "PENDING" },
  });
  if (pendingCount >= MAX_PENDING) {
    throw new Error(
      `You have ${pendingCount} unpaid booking requests. Please complete or cancel them before making a new one.`
    );
  }

  // Count bookings whose effective occupied window [start, end + cooldown) overlaps with [newStart, newEnd + cooldown)
  const overlapping = await db.booking.count({
    where: {
      listingId: data.listingId,
      status:    { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
      startDate: { lt: new Date(data.endDate.getTime()   + COOLDOWN_MS) },
      endDate:   { gt: new Date(data.startDate.getTime() - COOLDOWN_MS) },
    },
  });

  const quantity = (listing as any).quantity ?? 1;
  if (overlapping >= quantity)
    throw new Error(
      quantity === 1
        ? "This item is already booked for those dates (including a 2-day handover window)."
        : `All ${quantity} units are booked for those dates (including a 2-day handover window).`
    );

  const days = computeDays(data.startDate, data.endDate);

  // Compute server-side: rentalAmount + 15% VAT + 10% platform fee = totalAmount
  const { rentalAmount, vatAmount, platformFee, totalAmount } =
    calculateBookingAmounts(listing.pricePerDay, days);

  return db.booking.create({
    data: {
      listingId:    data.listingId,
      borrowerId:   data.borrowerId,
      startDate:    data.startDate,
      endDate:      data.endDate,
      rentalAmount,
      vatAmount,
      totalAmount,
      platformFee,
      depositAmount: null,
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

export async function initiateHandover(
  bookingId: string,
  userId: string,
  pickupDetails?: { pickupLocation: string; agreedHandoverTime: Date }
) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.listing.ownerId !== userId) throw new Error("Only the listing owner can initiate handover.");
  if (booking.status !== "CONFIRMED") throw new Error("Booking must be CONFIRMED.");
  if (booking.listerInitiatedHandover) throw new Error("Handover already initiated.");

  if (!pickupDetails?.pickupLocation?.trim()) throw new Error("Pickup location is required.");
  if (!pickupDetails?.agreedHandoverTime) throw new Error("Agreed handover time is required.");
  if (pickupDetails.agreedHandoverTime < new Date()) throw new Error("Agreed handover time must be in the future.");

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      listerInitiatedHandover: true,
      listerInitiatedHandoverAt: new Date(),
      pickupLocation: pickupDetails.pickupLocation.trim(),
      agreedHandoverTime: pickupDetails.agreedHandoverTime,
    },
    include: bookingInclude,
  });

  await createNotification({
    userId: booking.borrowerId,
    type: "HANDOVER_SIGNED",
    title: "Owner is ready to hand over",
    body: `The owner is ready to hand over "${booking.listing.title}". Please inspect the item and log any pre-existing issues.`,
    tab: "bookings",
    linkData: bookingId,
  });

  return updated;
}

export async function submitIssues(bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { ownerId: true, title: true } },
      issues: true,
    },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.borrowerId !== userId) throw new Error("Only the borrower can submit the inspection.");
  if (booking.status !== "CONFIRMED") throw new Error("Booking must be CONFIRMED.");
  if (!booking.listerInitiatedHandover) throw new Error("Owner must initiate handover first.");
  if (booking.borrowerIssuesSubmitted) throw new Error("Inspection already submitted.");

  const hasIssues = booking.issues.length > 0;

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      borrowerIssuesSubmitted: true,
      borrowerIssuesSubmittedAt: new Date(),
      // Auto-confirm issues step if nothing to review
      ...(!hasIssues ? { listerConfirmedIssues: true, listerConfirmedIssuesAt: new Date() } : {}),
    },
    include: bookingInclude,
  });

  await createNotification({
    userId: booking.listing.ownerId,
    type: "ISSUES_LOGGED",
    title: hasIssues ? "Borrower logged issues — please review" : "Borrower confirmed no issues",
    body: hasIssues
      ? `The borrower has logged ${booking.issues.length} issue(s) for "${booking.listing.title}". Please review and confirm before signing.`
      : `The borrower confirmed no pre-existing issues for "${booking.listing.title}". Please proceed to sign the agreement.`,
    tab: "bookings",
    linkData: bookingId,
  });

  return updated;
}

export async function confirmIssues(bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.listing.ownerId !== userId) throw new Error("Only the listing owner can confirm issues.");
  if (booking.status !== "CONFIRMED") throw new Error("Booking must be CONFIRMED.");
  if (!booking.borrowerIssuesSubmitted) throw new Error("Borrower must submit inspection first.");
  if (booking.listerConfirmedIssues) throw new Error("Issues already confirmed.");

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: { listerConfirmedIssues: true, listerConfirmedIssuesAt: new Date() },
    include: bookingInclude,
  });

  await createNotification({
    userId: booking.borrowerId,
    type: "HANDOVER_SIGNED",
    title: "Owner reviewed your issues",
    body: `The owner has reviewed and acknowledged the issues you logged for "${booking.listing.title}". Please proceed to sign the handover agreement.`,
    tab: "bookings",
    linkData: bookingId,
  });

  return updated;
}

export async function signHandover(bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.listing.ownerId !== userId) throw new Error("Only the listing owner can sign the handover.");
  if (booking.status !== "CONFIRMED") throw new Error("Booking must be CONFIRMED to sign handover.");
  if (booking.listerHandoverSigned) throw new Error("Handover already signed.");

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: { listerHandoverSigned: true, listerHandoverSignedAt: new Date() },
    include: bookingInclude,
  });

  await createNotification({
    userId: booking.borrowerId,
    type: "HANDOVER_SIGNED",
    title: "Item ready for collection",
    body: `The owner has signed the handover contract for "${booking.listing.title}". Please confirm receipt when you collect the item.`,
    tab: "bookings",
    linkData: bookingId,
  });

  return updated;
}

export async function signReceipt(bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.borrowerId !== userId) throw new Error("Only the borrower can sign the receipt.");
  if (booking.status !== "CONFIRMED") throw new Error("Booking must be CONFIRMED to sign receipt.");
  if (!booking.listerHandoverSigned) throw new Error("Owner must sign handover first.");
  if (booking.borrowerReceiptSigned) throw new Error("Receipt already signed.");

  const updated = await db.booking.update({
    where: { id: bookingId },
    data: {
      borrowerReceiptSigned: true,
      borrowerReceiptSignedAt: new Date(),
      status: "ACTIVE",
    },
    include: bookingInclude,
  });

  await createNotification({
    userId: booking.listing.ownerId,
    type: "RECEIPT_SIGNED",
    title: "Borrower confirmed receipt",
    body: `The borrower has signed the receipt for "${booking.listing.title}". The booking is now active.`,
    tab: "bookings",
    linkData: bookingId,
  });

  // Rec #10: Send a check-in nudge to the borrower at the start of the rental.
  // For rentals longer than 2 days, remind the borrower to post a mid-rental
  // photo update via the rental-updates feed — this creates a timestamped condition
  // record that protects both parties in a damage dispute.
  const rentalDays = Math.ceil(
    (booking.endDate.getTime() - booking.startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (rentalDays > 2) {
    createNotification({
      userId: booking.borrowerId,
      type: "RENTAL_UPDATE",
      title: "Rental started — please post a check-in update",
      body: `Your rental of "${booking.listing.title}" is now active. Please post at least one photo update halfway through to document the item's condition. This protects you in case of a damage dispute.`,
      tab: "bookings",
      linkData: bookingId,
    }).catch(() => {});
  }

  return updated;
}

export async function autoExpireHandoverBookings(): Promise<{ expired: number; bookingIds: string[] }> {
  const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Fix #4: Also catch ACTIVE bookings stuck past end date + 72h grace period
  const cutoff72h = new Date(Date.now() - 72 * 60 * 60 * 1000);

  // Find CONFIRMED bookings where the borrower never signed the receipt
  // and the booking start date was over 24 hours ago.
  const staleHandovers = await db.booking.findMany({
    where: {
      status: "CONFIRMED",
      borrowerReceiptSigned: false,
      startDate: { lt: cutoff24h },
    },
    include: {
      listing: { select: { ownerId: true, title: true } },
      payment: true,
    },
  });

  // Fix #4: ACTIVE bookings where neither party confirmed return and end date + 72h has passed
  const staleActive = await db.booking.findMany({
    where: {
      status: "ACTIVE",
      borrowerConfirmed: false,
      ownerConfirmed: false,
      endDate: { lt: cutoff72h },
    },
    include: {
      listing: { select: { ownerId: true, title: true } },
      payment: true,
    },
  });

  const expiredIds: string[] = [];

  for (const booking of staleHandovers) {
    try {
      if (booking.payment?.status === "SUCCEEDED") {
        await issuePartialRefund(booking.id, 100);
      }
      if (booking.payment?.depositStatus === "HELD") {
        await releaseDeposit(booking.id, "borrower");
      }

      await db.booking.update({
        where: { id: booking.id },
        data: {
          status: "CANCELLED",
          cancellationTier: "FULL_REFUND",
          cancelledAt: new Date(),
        },
      });

      await Promise.all([
        createNotification({
          userId: booking.borrowerId,
          type: "BOOKING_CANCELLED",
          title: "Booking auto-cancelled",
          body: `Your booking for "${booking.listing.title}" was automatically cancelled because the handover contract was not signed within 24 hours of the start date. A full refund has been issued.`,
          tab: "bookings",
          linkData: booking.id,
        }),
        createNotification({
          userId: booking.listing.ownerId,
          type: "BOOKING_CANCELLED",
          title: "Booking auto-cancelled",
          body: `The booking for "${booking.listing.title}" was automatically cancelled because the borrower did not sign the handover contract within 24 hours of the start date.`,
          tab: "bookings",
          linkData: booking.id,
        }),
      ]);

      expiredIds.push(booking.id);
    } catch {
      console.error(`[autoExpireHandover] Failed to expire handover booking ${booking.id}`);
    }
  }

  // Fix #4: Auto-complete ACTIVE bookings stuck past the 72h grace window
  for (const booking of staleActive) {
    try {
      const escrowReleaseAt = new Date(booking.endDate.getTime() + 48 * 60 * 60 * 1000);

      await db.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            status: "COMPLETED",
            borrowerConfirmed: true,
            ownerConfirmed: true,
            borrowerConfirmedAt: new Date(),
            ownerConfirmedAt: new Date(),
            escrowReleaseAt,
          },
        });
        await tx.escrowReleaseJob.upsert({
          where: { bookingId: booking.id },
          update: { scheduledAt: escrowReleaseAt, status: "PENDING", error: null },
          create: { bookingId: booking.id, scheduledAt: escrowReleaseAt },
        });
      });

      await Promise.all([
        createNotification({
          userId: booking.borrowerId,
          type: "BOOKING_COMPLETED",
          title: "Booking auto-completed",
          body: `Your rental of "${booking.listing.title}" was automatically completed as neither party confirmed the return within 72 hours of the end date.`,
          tab: "bookings",
          linkData: booking.id,
        }),
        createNotification({
          userId: booking.listing.ownerId,
          type: "BOOKING_COMPLETED",
          title: "Booking auto-completed",
          body: `The rental of "${booking.listing.title}" was automatically completed. Funds will be released to your account shortly.`,
          tab: "bookings",
          linkData: booking.id,
        }),
      ]);

      expiredIds.push(booking.id);
    } catch {
      console.error(`[autoExpireHandover] Failed to auto-complete active booking ${booking.id}`);
    }
  }

  return { expired: expiredIds.length, bookingIds: expiredIds };
}

export async function requestCancelReturn(bookingId: string, userId: string) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.borrowerId !== userId) throw new Error("Only the borrower can request a cancel-return.");
  if (booking.status !== "ACTIVE") throw new Error("Booking must be ACTIVE.");
  if (booking.cancelReturnRequested) throw new Error("Cancel-return already requested.");

  await db.booking.update({
    where: { id: bookingId },
    data: { cancelReturnRequested: true, cancelReturnRequestedAt: new Date() },
  });

  await createNotification({
    userId: booking.listing.ownerId,
    type: "CANCEL_RETURN_REQUESTED",
    title: "Borrower requesting cancellation",
    body: `The borrower has indicated that they have returned "${booking.listing.title}" and is requesting to cancel the booking. Please sign off that you have received the item.`,
    tab: "bookings",
    linkData: bookingId,
  });
}

export async function confirmReturnCancel(bookingId: string, userId: string, confirmed: boolean) {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: { listing: { select: { ownerId: true, title: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.listing.ownerId !== userId) throw new Error("Only the listing owner can confirm the return.");
  if (booking.status !== "ACTIVE") throw new Error("Booking must be ACTIVE.");
  if (!booking.cancelReturnRequested) throw new Error("No cancel-return has been requested.");

  if (confirmed) {
    // Fix #7: Early return follows the same dual-confirmation + escrow release path as
    // normal completion so damage claims are still possible within the 48h window.
    const escrowReleaseAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: "COMPLETED",
          borrowerConfirmed: true,
          ownerConfirmed: true,
          borrowerConfirmedAt: new Date(),
          ownerConfirmedAt: new Date(),
          escrowReleaseAt,
          cancelledById: userId,
          cancellationTier: "OWNER_CANCEL",
        },
      });
      await tx.escrowReleaseJob.upsert({
        where: { bookingId },
        update: { scheduledAt: escrowReleaseAt, status: "PENDING", error: null },
        create: { bookingId, scheduledAt: escrowReleaseAt },
      });
    });

    await createNotification({
      userId: booking.borrowerId,
      type: "BOOKING_COMPLETED",
      title: "Early return confirmed",
      body: `The owner confirmed receipt of "${booking.listing.title}". The booking is now complete. Funds will be released in 48 hours if no dispute is raised.`,
      tab: "bookings",
      linkData: bookingId,
    });
  } else {
    // Lister denies — reset request so borrower can see the denial
    await db.booking.update({
      where: { id: bookingId },
      data: { cancelReturnRequested: false, cancelReturnRequestedAt: null },
    });

    await createNotification({
      userId: booking.borrowerId,
      type: "CANCEL_RETURN_DENIED",
      title: "Cancellation not confirmed",
      body: `The owner has not confirmed receipt of "${booking.listing.title}". The booking remains active. Please contact the owner directly.`,
      tab: "bookings",
      linkData: bookingId,
    });
  }
}

export async function submitReturnInspection(
  bookingId: string,
  userId: string,
  data: { description: string; photos: string[]; claimDeposit: boolean }
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { ownerId: true, title: true } },
      payment: { select: { depositStatus: true } },
    },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.listing.ownerId !== userId) throw new Error("Only the listing owner can submit the return inspection.");
  if (booking.status !== "ACTIVE") throw new Error("Booking must be active.");
  if (!booking.borrowerConfirmed) throw new Error("Borrower must confirm return before inspection.");
  if (booking.listerReturnInspected) throw new Error("Return inspection already submitted.");

  const depositHeld = booking.payment?.depositStatus === "HELD";
  const effectiveClaim = data.claimDeposit && depositHeld;

  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        listerReturnInspected: true,
        listerReturnInspectedAt: new Date(),
        listerReturnDamageClaimed: effectiveClaim,
        // If no damage claim, also mark borrower acknowledged so the step auto-completes
        borrowerAcknowledgedReturn: !effectiveClaim,
        borrowerAcknowledgedReturnAt: !effectiveClaim ? new Date() : null,
      },
    });
    if (data.description) {
      await tx.returnIssue.create({
        data: { bookingId, description: data.description, photos: data.photos },
      });
    }
  });

  if (effectiveClaim) {
    // Notify borrower to acknowledge the damage report
    await createNotification({
      userId: booking.borrowerId,
      type: "ISSUES_LOGGED",
      title: "Damage reported on return",
      body: `The owner has reported damage to "${booking.listing.title}" on return. Please review and acknowledge the report.`,
      tab: "bookings",
      linkData: bookingId,
    });
  } else {
    // No damage — release deposit to borrower and complete booking
    if (depositHeld) {
      await releaseDeposit(bookingId, "borrower");
    }
    const escrowReleaseAt = new Date(booking.endDate.getTime() + 48 * 60 * 60 * 1000);
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED", ownerConfirmed: true, ownerConfirmedAt: new Date(), escrowReleaseAt },
      });
      await tx.escrowReleaseJob.upsert({
        where: { bookingId },
        update: { scheduledAt: escrowReleaseAt, status: "PENDING", error: null },
        create: { bookingId, scheduledAt: escrowReleaseAt },
      });
    });
    await createNotification({
      userId: booking.borrowerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed — no damage found",
      body: `The owner confirmed no damage to "${booking.listing.title}". Your deposit will be returned within 48 hours.`,
      tab: "bookings",
      linkData: bookingId,
    });
    await createNotification({
      userId: booking.listing.ownerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `The rental of "${booking.listing.title}" is complete. Funds will be released to your account within 48 hours.`,
      tab: "bookings",
      linkData: bookingId,
    });
  }
}

export async function acknowledgeReturn(
  bookingId: string,
  userId: string,
  dispute: boolean
): Promise<void> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { ownerId: true, title: true } },
      payment: { select: { depositStatus: true } },
    },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.borrowerId !== userId) throw new Error("Only the borrower can acknowledge the return report.");
  if (!booking.listerReturnInspected) throw new Error("Lister has not submitted the return inspection yet.");
  if (!booking.listerReturnDamageClaimed) throw new Error("No damage was claimed — acknowledgement not required.");
  if (booking.borrowerAcknowledgedReturn) throw new Error("Already acknowledged.");

  await db.booking.update({
    where: { id: bookingId },
    data: { borrowerAcknowledgedReturn: true, borrowerAcknowledgedReturnAt: new Date() },
  });

  const depositHeld = booking.payment?.depositStatus === "HELD";

  if (dispute) {
    // Escalate to admin by creating a dispute report
    await db.report.create({
      data: {
        reporterId: userId,
        reportedId: booking.listing.ownerId,
        bookingId,
        reason: "DAMAGED_EQUIPMENT",
        details: "Borrower disputes the damage claim made by the owner on return.",
        status: "PENDING",
      },
    });
    await createNotification({
      userId: booking.listing.ownerId,
      type: "ISSUES_LOGGED",
      title: "Borrower disputed damage claim",
      body: `The borrower has disputed your damage claim for "${booking.listing.title}". An admin will review and resolve the deposit.`,
      tab: "bookings",
      linkData: bookingId,
    });
  } else {
    // Borrower accepts — release deposit to owner
    if (depositHeld) {
      await releaseDeposit(bookingId, "owner");
    }
    const escrowReleaseAt = new Date(booking.endDate.getTime() + 48 * 60 * 60 * 1000);
    await db.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "COMPLETED", ownerConfirmed: true, ownerConfirmedAt: new Date(), escrowReleaseAt },
      });
      await tx.escrowReleaseJob.upsert({
        where: { bookingId },
        update: { scheduledAt: escrowReleaseAt, status: "PENDING", error: null },
        create: { bookingId, scheduledAt: escrowReleaseAt },
      });
    });
    await createNotification({
      userId: booking.listing.ownerId,
      type: "BOOKING_COMPLETED",
      title: "Borrower accepted damage claim",
      body: `The borrower accepted the damage report for "${booking.listing.title}". The deposit has been released to you.`,
      tab: "bookings",
      linkData: bookingId,
    });
    await createNotification({
      userId: booking.borrowerId,
      type: "BOOKING_COMPLETED",
      title: "Booking completed",
      body: `You have accepted the damage report for "${booking.listing.title}". The deposit has been kept by the owner.`,
      tab: "bookings",
      linkData: bookingId,
    });
  }
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
