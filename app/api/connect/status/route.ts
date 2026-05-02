import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user?.stripeAccountId) {
      return NextResponse.json({ data: { connected: false } });
    }

    const account = await stripe.accounts.retrieve(user.stripeAccountId);

    // Keep DB in sync with Stripe's ground truth
    if (account.charges_enabled !== user.stripeAccountEnabled) {
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeAccountEnabled: account.charges_enabled ?? false },
      });
    }

    return NextResponse.json({
      data: {
        connected: true,
        chargesEnabled:    account.charges_enabled   ?? false,
        payoutsEnabled:    account.payouts_enabled   ?? false,
        detailsSubmitted:  account.details_submitted ?? false,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch account status" },
      { status: 400 }
    );
  }
}
