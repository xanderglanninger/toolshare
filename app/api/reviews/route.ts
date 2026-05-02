import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createReview, getReviewsForListing, getReviewForBooking } from "@/lib/services/review.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const listingId = searchParams.get("listingId");
    const bookingId = searchParams.get("bookingId");

    if (listingId) {
      const summary = await getReviewsForListing(listingId);
      return NextResponse.json({ data: summary });
    }

    if (bookingId) {
      const session = await auth();
      if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      const review = await getReviewForBooking(bookingId, session.user.id);
      return NextResponse.json({ data: review });
    }

    return NextResponse.json({ error: "listingId or bookingId required" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, reviewedId, listingId, rating, comment } = await req.json();

    if (!bookingId || !reviewedId || !listingId || rating == null) {
      return NextResponse.json(
        { error: "bookingId, reviewedId, listingId, and rating are required" },
        { status: 400 },
      );
    }

    const review = await createReview({
      bookingId,
      reviewerId: session.user.id,
      reviewedId,
      listingId,
      rating: Number(rating),
      comment: comment ?? null,
    });

    return NextResponse.json({ data: review }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to submit review" },
      { status: 400 },
    );
  }
}
