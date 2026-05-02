import { db } from "@/lib/db/client";
import type { Review, ListingReviewSummary } from "@/lib/types";

const reviewerSelect = {
  id: true, name: true, surname: true, image: true,
};

export async function createReview(data: {
  bookingId: string;
  reviewerId: string;
  reviewedId: string;
  listingId: string;
  rating: number;
  comment?: string | null;
}): Promise<Review> {
  if (data.rating < 1 || data.rating > 5 || !Number.isInteger(data.rating))
    throw new Error("Rating must be a whole number between 1 and 5.");

  const booking = await db.booking.findUnique({
    where: { id: data.bookingId },
    select: { status: true, borrowerId: true, listing: { select: { ownerId: true } } },
  });
  if (!booking) throw new Error("Booking not found.");
  if (booking.status !== "COMPLETED") throw new Error("You can only review completed bookings.");

  const isBorrower = booking.borrowerId === data.reviewerId;
  const isOwner    = booking.listing.ownerId === data.reviewerId;
  if (!isBorrower && !isOwner) throw new Error("Forbidden.");

  const existing = await db.review.findUnique({
    where: { bookingId_reviewerId: { bookingId: data.bookingId, reviewerId: data.reviewerId } },
  });
  if (existing) throw new Error("You have already reviewed this booking.");

  return db.review.create({
    data: {
      bookingId:  data.bookingId,
      reviewerId: data.reviewerId,
      reviewedId: data.reviewedId,
      listingId:  data.listingId,
      rating:     data.rating,
      comment:    data.comment ?? null,
    },
    include: { reviewer: { select: reviewerSelect } },
  }) as unknown as Promise<Review>;
}

export async function getReviewsForListing(listingId: string): Promise<ListingReviewSummary> {
  const reviews = await db.review.findMany({
    where: { listingId },
    orderBy: { createdAt: "desc" },
    include: { reviewer: { select: reviewerSelect } },
  });

  const count = reviews.length;
  const averageRating = count === 0
    ? 0
    : Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;

  return { averageRating, count, reviews: reviews as unknown as Review[] };
}

export async function getReviewForBooking(
  bookingId: string,
  reviewerId: string,
): Promise<Review | null> {
  return db.review.findUnique({
    where: { bookingId_reviewerId: { bookingId, reviewerId } },
    include: { reviewer: { select: reviewerSelect } },
  }) as unknown as Promise<Review | null>;
}
