import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let accountId = user.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "ZA",
        email: user.email,
      });
      accountId = account.id;
      await db.user.update({
        where: { id: session.user.id },
        data: { stripeAccountId: accountId },
      });
    }

    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard?tab=profile`,
      return_url:  `${base}/dashboard?tab=profile&connected=true`,
      type: "account_onboarding",
    });

    return NextResponse.json({ data: { url: accountLink.url } });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to start onboarding" },
      { status: 400 }
    );
  }
}
