// app/api/listings/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getListingById,
  updateListing,
  deleteListing,
  toggleListingAvailability,
} from "@/lib/services/listing.services";

type Params = { params: Promise<{ id: string }> };

// ─── GET /api/listings/[id] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const listing = await getListingById(id);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({ data: listing });
  } catch (error) {
    console.error("[GET /api/listings/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch listing." }, { status: 500 });
  }
}

// ─── PATCH /api/listings/[id] ───────────────────────────────────────────────
// Supports partial updates and a special `{ toggleAvailability: true }` shortcut.

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    const body = await req.json();

    // Shortcut: toggle isAvailable without sending the full object
    if (body.toggleAvailability === true) {
      const listing = await toggleListingAvailability(id, session.user.id);
      return NextResponse.json({ data: listing });
    }

    const listing = await updateListing(id, session.user.id, body);
    return NextResponse.json({ data: listing });
  } catch (error: any) {
    console.error("[PATCH /api/listings/[id]]", error);
    if (error?.message === "Forbidden.") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (error?.message === "Listing not found.") {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update listing." }, { status: 500 });
  }
}

// ─── DELETE /api/listings/[id] ──────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
    }

    await deleteListing(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/listings/[id]]", error);
    if (error?.message === "Forbidden.") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
    if (error?.message === "Listing not found.") {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete listing." }, { status: 500 });
  }
}