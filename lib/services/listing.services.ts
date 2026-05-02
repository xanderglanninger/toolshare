// lib/services/listing.service.ts
// Matches the pattern of equipment.service, booking.service, etc.
// All DB access goes through `db` from @/lib/db/client.

import { db } from "@/lib/db/client";
import type {
  CreateListingInput,
  UpdateListingInput,
  ListingFilters,
} from "@/lib/types/listing";

// ─── Owner fields to always select ─────────────────────────────────────────

const ownerSelect = {
  id:      true,
  name:    true,
  surname: true,
  image:   true,
};

// ─── Validation helpers ─────────────────────────────────────────────────────

function validateCreateInput(data: CreateListingInput): string | null {
  if (!data.title?.trim() || data.title.trim().length < 5)
    return "Title must be at least 5 characters.";
  if (!data.description?.trim() || data.description.trim().length < 20)
    return "Description must be at least 20 characters.";
  if (!data.category)
    return "Category is required.";
  if (!data.images || data.images.length === 0)
    return "At least one image is required.";
  if (data.images.length > 8)
    return "Maximum 8 images allowed.";
  if (!data.pricePerDay || data.pricePerDay <= 0)
    return "A valid daily price is required.";
  if (!data.address?.trim())
    return "Address is required.";
  if (!data.city?.trim())
    return "City is required.";
  if (!data.province?.trim())
    return "Province is required.";
  if (data.deliveryAvailable && data.deliveryRadius && data.deliveryRadius <= 0)
    return "Delivery radius must be a positive number.";
  return null;
}

// ─── Create ─────────────────────────────────────────────────────────────────

export async function createListing(ownerId: string, data: CreateListingInput) {
  const error = validateCreateInput(data);
  if (error) throw new Error(error);

  return db.listing.create({
    data: {
      title:             data.title.trim(),
      description:       data.description.trim(),
      category:          data.category,
      images:            data.images,

      pricePerDay:       data.pricePerDay,
      pricePerWeek:      data.pricePerWeek  ?? null,
      pricePerMonth:     data.pricePerMonth ?? null,
      depositAmount:     data.depositAmount ?? null,

      availableFrom:     data.availableFrom ? new Date(data.availableFrom) : null,
      availableTo:       data.availableTo   ? new Date(data.availableTo)   : null,

      address:           data.address.trim(),
      city:              data.city.trim(),
      province:          data.province.trim(),
      postalCode:        data.postalCode ?? null,
      latitude:          data.latitude   ?? null,
      longitude:         data.longitude  ?? null,

      deliveryAvailable: data.deliveryAvailable ?? false,
      deliveryRadius:    data.deliveryRadius ?? null,
      deliveryFee:       data.deliveryFee    ?? null,

      ownerId,
    },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });
}

// ─── List (browse / search) ─────────────────────────────────────────────────

export async function listListings(filters: ListingFilters = {}, countless = false) {
  const {
    category,
    city,
    search,
    minPrice,
    maxPrice,
    available,
    ownerId,
    random,
    page  = 1,
    limit = 12,
  } = filters;

  const skip = (Math.max(1, page) - 1) * Math.min(limit, 50);
  const take = Math.min(limit, 50);

  const where = {
    ...(available !== undefined && { isAvailable: available }),
    ...(category  && { category }),
    ...(city      && { city: { contains: city, mode: "insensitive" as const } }),
    ...(ownerId   && { ownerId }),
    ...(search    && {
      OR: [
        { title:       { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
        { city:        { contains: search, mode: "insensitive" as const } },
      ],
    }),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          pricePerDay: {
            ...(minPrice !== undefined && { gte: minPrice }),
            ...(maxPrice !== undefined && { lte: maxPrice }),
          },
        }
      : {}),
  };

  if (random) {
    const total = countless ? null : await db.listing.count({ where });

    // Build WHERE clauses for raw query
    const conditions: string[] = [];
    const args: unknown[] = [];
    let i = 1;

    if (available !== undefined) { conditions.push(`l."isAvailable" = $${i++}`); args.push(available); }
    if (category)  { conditions.push(`l."category" = $${i++}`);  args.push(category); }
    if (ownerId)   { conditions.push(`l."ownerId" = $${i++}`);   args.push(ownerId); }
    if (city)      { conditions.push(`lower(l."city") LIKE $${i++}`); args.push(`%${city.toLowerCase()}%`); }
    if (search) {
      conditions.push(`(lower(l."title") LIKE $${i} OR lower(l."description") LIKE $${i} OR lower(l."city") LIKE $${i})`);
      args.push(`%${search.toLowerCase()}%`); i++;
    }
    if (minPrice !== undefined) { conditions.push(`l."pricePerDay" >= $${i++}`); args.push(minPrice); }
    if (maxPrice !== undefined) { conditions.push(`l."pricePerDay" <= $${i++}`); args.push(maxPrice); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    args.push(take, skip);
    const limitArg  = i++;
    const offsetArg = i++;

    const listings = await db.$queryRawUnsafe<any[]>(`
      SELECT
        l.id, l.title, l.description, l.category,
        to_json(l."images") AS images,
        l."pricePerDay", l."pricePerWeek", l."pricePerMonth",
        l."depositAmount", l."isAvailable",
        l."availableFrom", l."availableTo",
        l.address, l.city, l.province, l."postalCode",
        l.latitude, l.longitude,
        l."deliveryAvailable", l."deliveryRadius", l."deliveryFee",
        l."ownerId", l."createdAt", l."updatedAt",
        json_build_object('id', u."id", 'name', u."name", 'surname', u."surname", 'image', u."image") AS owner,
        COALESCE(
          json_agg(json_build_object('rating', r."rating")) FILTER (WHERE r."id" IS NOT NULL),
          '[]'
        ) AS reviews
      FROM "Listing" l
      JOIN "User" u ON u."id" = l."ownerId"
      LEFT JOIN "Review" r ON r."listingId" = l."id"
      ${whereClause}
      GROUP BY l."id", u."id"
      ORDER BY RANDOM()
      LIMIT $${limitArg} OFFSET $${offsetArg}
    `, ...args);

    return {
      data: listings,
      pagination: countless
        ? { page, limit: take, total: null, totalPages: null }
        : { page, limit: take, total, totalPages: Math.ceil((total as number) / take) },
    };
  }

  const listingsQuery = db.listing.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });

  if (countless) {
    const listings = await listingsQuery;
    return {
      data: listings,
      pagination: { page, limit: take, total: null, totalPages: null },
    };
  }

  const [listings, total] = await Promise.all([
    listingsQuery,
    db.listing.count({ where }),
  ]);

  return {
    data: listings,
    pagination: {
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
}

// ─── Get single listing ─────────────────────────────────────────────────────

export async function getListingById(id: string) {
  return db.listing.findUnique({
    where: { id },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });
}

// ─── Get all listings for a specific owner ──────────────────────────────────

export async function getListingsByOwner(ownerId: string) {
  return db.listing.findMany({
    where: { ownerId },
    orderBy: { createdAt: "desc" },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });
}

// ─── Update ─────────────────────────────────────────────────────────────────

export async function updateListing(
  id: string,
  ownerId: string,
  data: UpdateListingInput
) {
  // Verify ownership before updating
  const existing = await db.listing.findUnique({ where: { id } });
  if (!existing)             throw new Error("Listing not found.");
  if (existing.ownerId !== ownerId) throw new Error("Forbidden.");

  return db.listing.update({
    where: { id },
    data: {
      ...(data.title            && { title:            data.title.trim() }),
      ...(data.description      && { description:      data.description.trim() }),
      ...(data.category         && { category:         data.category }),
      ...(data.images           && { images:           data.images }),

      ...(data.pricePerDay  !== undefined && { pricePerDay:  data.pricePerDay }),
      ...(data.pricePerWeek !== undefined && { pricePerWeek: data.pricePerWeek ?? null }),
      ...(data.pricePerMonth !== undefined && { pricePerMonth: data.pricePerMonth ?? null }),
      ...(data.depositAmount !== undefined && { depositAmount: data.depositAmount ?? null }),

      ...(data.availableFrom !== undefined && {
        availableFrom: data.availableFrom ? new Date(data.availableFrom) : null,
      }),
      ...(data.availableTo !== undefined && {
        availableTo: data.availableTo ? new Date(data.availableTo) : null,
      }),
      ...(data.isAvailable !== undefined && { isAvailable: data.isAvailable }),

      ...(data.address   && { address:   data.address.trim() }),
      ...(data.city      && { city:      data.city.trim() }),
      ...(data.province  && { province:  data.province.trim() }),
      ...(data.postalCode  !== undefined && { postalCode:  data.postalCode  ?? null }),
      ...(data.latitude    !== undefined && { latitude:    data.latitude    ?? null }),
      ...(data.longitude   !== undefined && { longitude:   data.longitude   ?? null }),

      ...(data.deliveryAvailable !== undefined && { deliveryAvailable: data.deliveryAvailable }),
      ...(data.deliveryRadius    !== undefined && { deliveryRadius:    data.deliveryRadius ?? null }),
      ...(data.deliveryFee       !== undefined && { deliveryFee:       data.deliveryFee    ?? null }),
    },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });
}

// ─── Toggle availability ─────────────────────────────────────────────────────

export async function toggleListingAvailability(id: string, ownerId: string) {
  const existing = await db.listing.findUnique({ where: { id } });
  if (!existing)             throw new Error("Listing not found.");
  if (existing.ownerId !== ownerId) throw new Error("Forbidden.");

  return db.listing.update({
    where: { id },
    data:  { isAvailable: !existing.isAvailable },
    include: { owner: { select: ownerSelect }, reviews: { select: { rating: true } } },
  });
}

// ─── Delete ─────────────────────────────────────────────────────────────────

export async function deleteListing(id: string, ownerId: string) {
  const existing = await db.listing.findUnique({ where: { id } });
  if (!existing)             throw new Error("Listing not found.");
  if (existing.ownerId !== ownerId) throw new Error("Forbidden.");

  await db.listing.delete({ where: { id } });
  return { success: true };
}