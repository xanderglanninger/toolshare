// app/api/listings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createListing, listListings } from "@/lib/services/listing.services";
import type { ListingCategory, ListingFilters } from "@/lib/types/listing";

// ─── GET /api/listings ──────────────────────────────────────────────────────
// Query params: category, city, minPrice, maxPrice, ownerId, page, limit, countless

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const availableParam = searchParams.get("available");
    const countless      = searchParams.get("countless") === "true";
    const random         = searchParams.get("random") === "true";

    const filters: ListingFilters = {
      category:  (searchParams.get("category") as ListingCategory) || undefined,
      city:      searchParams.get("city")      || undefined,
      search:    searchParams.get("search")    || undefined,
      ownerId:   searchParams.get("ownerId")   || undefined,
      minPrice:  searchParams.get("minPrice")  ? Number(searchParams.get("minPrice"))  : undefined,
      maxPrice:  searchParams.get("maxPrice")  ? Number(searchParams.get("maxPrice"))  : undefined,
      page:      searchParams.get("page")      ? Number(searchParams.get("page"))      : 1,
      limit:     searchParams.get("limit")     ? Number(searchParams.get("limit"))     : 12,
      available: availableParam === "true" ? true : availableParam === "false" ? false : undefined,
      random,
    };

    const result = await listListings(filters, countless);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/listings]", error);
    return NextResponse.json({ error: "Failed to fetch listings." }, { status: 500 });
  }
}

// ─── POST /api/listings ─────────────────────────────────────────────────────
// Creates a new listing for the authenticated user.

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const body = await req.json();
    const listing = await createListing(session.user.id, body);
    return NextResponse.json({ data: listing }, { status: 201 });
  } catch (error: any) {
    console.error("[POST /api/listings]", error);

    // Validation errors thrown by the service come back as 422
    const isValidation = error instanceof Error &&
      !error.message.includes("Internal");
    return NextResponse.json(
      { error: error?.message ?? "Failed to create listing." },
      { status: isValidation ? 422 : 500 }
    );
  }
}