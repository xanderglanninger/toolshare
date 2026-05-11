import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { initializeTransaction, isPaystackConfigured } from "@/lib/paystack";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isPaystackConfigured()) {
    return NextResponse.json({ error: "Paystack not configured" }, { status: 503 });
  }

  const { id } = await params;

  const ad = await db.ad.findUnique({ where: { id } });
  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });
  if (ad.advertiserId !== session.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (ad.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "Ad is not awaiting payment" }, { status: 400 });

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!user?.email) return NextResponse.json({ error: "User email not found" }, { status: 400 });

  const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const reference = `ad-${id}-${nanoid(8)}`;

  const txn = await initializeTransaction({
    email: user.email,
    amount: ad.planPrice ?? 499,
    reference,
    callback_url: `${baseUrl}/advertiser/dashboard?paid=${id}`,
    metadata: {
      bookingId: id,
      type: "ad_payment",
      custom_fields: [
        { display_name: "Ad ID", variable_name: "bookingId", value: id },
        { display_name: "Type", variable_name: "type", value: "ad_payment" },
      ],
    },
  });

  return NextResponse.json({ data: { authorization_url: txn.authorization_url, reference: txn.reference } });
}
